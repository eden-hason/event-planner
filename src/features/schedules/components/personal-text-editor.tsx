'use client';

import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconAlertCircle,
  IconInfoCircle,
  IconLock,
  IconPlus,
  IconTable,
  IconX,
} from '@tabler/icons-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

import {
  PERSONAL_TEXT_MAX_LENGTH,
  PERSONAL_TEXT_MAX_PARAGRAPHS,
  stageOffersTable,
  wrapperFor,
  type MessageFieldKey,
  type PersonalSegment,
} from '../message-plan';
import { shouldSendTableNumbers } from '../utils/event-config';
import {
  emptyMessageFields,
  paletteFields,
  personalTextErrorMessage,
  placedFields,
  tokenValue,
  type EditorDocument,
} from '../utils/message-plan-editor';
import { useMessagePlanSettings } from './message-plan-settings-context';
import { SettingsCard } from './settings-card';

/** The count turns amber this close to the limit (brief 7.2: no nagging before). */
const NEAR_LIMIT = 40;

// ─── The writing area's DOM ──────────────────────────────────────────────────
//
// The writing area is one contenteditable element: one <div> per paragraph,
// typed text as text nodes, and each Message Field as a non-editable token
// <span data-field>. The DOM is the editor's own while the Owner types; it is
// read back into the document on every input, and only rewritten from the
// document when the document is replaced from outside (revert, a removed
// field, a save coming back). That is what keeps the caret where it is.

const FIELD_ATTR = 'data-field';

function isParagraphElement(node: Node): node is HTMLElement {
  return node instanceof HTMLElement && (node.tagName === 'DIV' || node.tagName === 'P');
}

function readInline(node: Node, into: PersonalSegment[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').replace(/​/g, '');
    if (text) into.push({ kind: 'text', text });
    return;
  }
  if (!(node instanceof HTMLElement)) return;
  const field = node.getAttribute(FIELD_ATTR);
  if (field) {
    into.push({ kind: 'field', field: field as MessageFieldKey });
    return;
  }
  if (node.tagName === 'BR') return;
  node.childNodes.forEach((child) => readInline(child, into));
}

/** The paragraphs as the DOM holds them, empty ones included while they are typed. */
function readParagraphs(root: HTMLElement): PersonalSegment[][] {
  const paragraphs: PersonalSegment[][] = [];
  let loose: PersonalSegment[] | null = null;
  root.childNodes.forEach((node) => {
    if (isParagraphElement(node)) {
      loose = null;
      const segments: PersonalSegment[] = [];
      readInline(node, segments);
      paragraphs.push(segments);
    } else {
      if (!loose) {
        loose = [];
        paragraphs.push(loose);
      }
      readInline(node, loose);
    }
  });
  return paragraphs;
}

type TokenLook = { label: string; value: string | null; empty: boolean };

function tokenElement(field: MessageFieldKey, look: TokenLook): HTMLSpanElement {
  const span = document.createElement('span');
  span.setAttribute(FIELD_ATTR, field);
  span.contentEditable = 'false';
  span.textContent = look.value ?? look.label;
  span.title = look.label;
  span.className = cn(
    'mx-px inline-block rounded-md px-1.5 py-px align-baseline text-[0.92em] font-semibold select-none',
    look.empty
      ? 'bg-destructive/10 text-destructive ring-destructive/40 ring-1'
      : 'bg-primary/10 text-primary',
  );
  if (look.empty) span.setAttribute('aria-invalid', 'true');
  return span;
}

function drawParagraphs(
  root: HTMLElement,
  paragraphs: PersonalSegment[][],
  lookOf: (field: MessageFieldKey) => TokenLook,
) {
  const blocks = (paragraphs.length ? paragraphs : [[]]).map((segments) => {
    const div = document.createElement('div');
    for (const segment of segments) {
      div.append(
        segment.kind === 'text'
          ? document.createTextNode(segment.text)
          : tokenElement(segment.field, lookOf(segment.field)),
      );
    }
    if (!segments.length) div.append(document.createElement('br'));
    return div;
  });
  root.replaceChildren(...blocks);
}

// ─── The editor ──────────────────────────────────────────────────────────────

/**
 * The Owner's own message (ADR 0054, brief 7): the Wrapper's fixed lines
 * above and below the writing area, Message Fields placed from the palette as
 * tokens that read like their value, Enter for a new paragraph up to three,
 * and the count against the Event's longest Guest name. On the Reminder the
 * table field opens the table sentence on its own line, sent only to seated
 * Guests. Saved by the page's one Save.
 */
export function PersonalTextEditor({ lockBadge }: { lockBadge?: React.ReactNode }) {
  const t = useTranslations('schedules.messagePlan.editor');
  const tFields = useTranslations('schedules.messagePlan.fields');
  const tErrors = useTranslations('schedules.messagePlan.errors');
  const {
    stage,
    event,
    editable,
    isSaving,
    wording,
    document: doc,
    setDocument,
    documentVersion,
    replaceDocument,
    length,
    textErrors,
    giftButton,
  } = useMessagePlanSettings();
  const rootRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<Range | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  const writable = editable && !isSaving;
  const empties = useMemo(() => emptyMessageFields(stage, event), [stage, event]);
  const lookOf = useCallback(
    (field: MessageFieldKey): TokenLook => {
      const { value, empty } = tokenValue(field, event);
      return { label: tFields(field), value, empty };
    },
    [event, tFields],
  );

  // Redraw only when the document was replaced from outside the editor.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root) drawParagraphs(root, docRef.current.paragraphs, lookOf);
  }, [documentVersion, lookOf, wording]);

  const readBack = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    setDocument({ ...docRef.current, paragraphs: readParagraphs(root) });
  }, [setDocument]);

  const rememberSelection = useCallback(() => {
    const root = rootRef.current;
    const selection = window.getSelection();
    if (!root || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (root.contains(range.commonAncestorContainer)) rangeRef.current = range.cloneRange();
  }, []);

  const paragraphCount = doc.paragraphs.length;
  const atParagraphLimit = paragraphCount >= PERSONAL_TEXT_MAX_PARAGRAPHS;

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter') return;
    // Enter always means a new paragraph; there is no line break inside one.
    event.preventDefault();
    if (event.shiftKey || event.nativeEvent.isComposing) return;
    const root = rootRef.current;
    if (!root || readParagraphs(root).length >= PERSONAL_TEXT_MAX_PARAGRAPHS) return;
    document.execCommand('defaultParagraphSeparator', false, 'div');
    document.execCommand('insertParagraph');
  };

  const onPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Pasted text joins the paragraph it lands in: line breaks become spaces.
    const text = event.clipboardData.getData('text/plain').replace(/\s*\r?\n\s*/g, ' ');
    if (text) document.execCommand('insertText', false, text);
  };

  const insertField = (field: MessageFieldKey) => {
    if (!writable) return;
    if (field === 'tableNumber') {
      if (!doc.tableSentence) {
        setDocument({ ...doc, tableSentence: { before: t('tableSentence.defaultText'), after: '' } });
      }
      return;
    }
    const root = rootRef.current;
    if (!root) return;
    root.focus();
    let range = rangeRef.current;
    if (!range || !root.contains(range.commonAncestorContainer)) {
      // No caret in the writing area yet: the end of the last paragraph.
      range = document.createRange();
      const last = root.lastChild ?? root;
      range.selectNodeContents(last);
      range.collapse(false);
    }
    range.deleteContents();
    const token = tokenElement(field, lookOf(field));
    const space = document.createTextNode(' ');
    range.insertNode(space);
    range.insertNode(token);
    const after = document.createRange();
    after.setStartAfter(space);
    after.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(after);
    rangeRef.current = after.cloneRange();
    readBack();
  };

  const removeField = (field: MessageFieldKey) => {
    replaceDocument({
      ...doc,
      paragraphs: doc.paragraphs.map((paragraph) =>
        paragraph.filter((segment) => segment.kind !== 'field' || segment.field !== field),
      ),
    });
  };

  const setTableSentence = (next: EditorDocument['tableSentence']) =>
    setDocument({ ...doc, tableSentence: next });

  if (wording !== 'personal') return null;

  const wrapper = wrapperFor(stage, { gift: giftButton === true });
  const blank = doc.paragraphs.every((paragraph) =>
    paragraph.every((segment) => segment.kind === 'text' && segment.text.trim() === ''),
  );
  const offersTable = stageOffersTable(stage);
  const tablesOff = offersTable && !shouldSendTableNumbers(event.guestExperience ?? undefined);
  const placed = placedFields(doc);
  // Said only while the message is being edited (see textErrors).
  const placedEmpty = textErrors.length
    ? placed.filter((field) => empties.includes(field))
    : [];
  const near = length > PERSONAL_TEXT_MAX_LENGTH - NEAR_LIMIT;
  const over = length > PERSONAL_TEXT_MAX_LENGTH;
  // Empty fields are listed with their fix below; every other error is said once here.
  const otherErrors = textErrors.filter((error) => error.code !== 'empty_field');

  return (
    <SettingsCard
      title={t('title')}
      aside={
        !editable ? (
          lockBadge
        ) : (
          <span
            className={cn(
              'text-[11.5px] tabular-nums',
              over ? 'text-destructive font-bold' : near ? 'text-warning-strong font-semibold' : 'text-muted-foreground',
            )}
            aria-live="polite"
          >
            {length}/{PERSONAL_TEXT_MAX_LENGTH}
          </span>
        )
      }
    >
      {writable && (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">{t('palette.title')}</span>
          <div role="toolbar" aria-label={t('palette.title')} className="flex flex-wrap gap-1.5">
            {paletteFields(stage).map((field) => {
              const isEmpty = empties.includes(field);
              return (
                <button
                  key={field}
                  type="button"
                  // Keeps the caret in the writing area, and the phone keyboard open.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertField(field)}
                  disabled={field === 'tableNumber' && doc.tableSentence !== null}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                    'hover:border-primary/60 disabled:opacity-50',
                    isEmpty && 'border-dashed',
                  )}
                  title={isEmpty ? t('palette.emptyHint') : undefined}
                >
                  {field === 'tableNumber' ? <IconTable size={13} /> : <IconPlus size={13} />}
                  {tFields(field)}
                  {isEmpty && <IconAlertCircle size={13} className="text-warning-strong" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-muted/40 flex flex-col gap-2 rounded-xl border p-3">
        <WrapperLine text={wrapper.opening} label={t('wrapper.label')} />
        <div className="relative">
          {blank && (
            <p
              aria-hidden
              className="text-muted-foreground/70 pointer-events-none absolute inset-x-0 top-0 px-3 py-2.5 text-sm"
              dir="rtl"
            >
              {t(`placeholder.${stage}`)}
            </p>
          )}
          <div
            ref={rootRef}
            role="textbox"
            aria-multiline="true"
            aria-label={t('title')}
            aria-invalid={textErrors.length > 0 || undefined}
            contentEditable={writable}
            suppressContentEditableWarning
            dir="rtl"
            onInput={readBack}
            onKeyDown={onKeyDown}
            onKeyUp={rememberSelection}
            onMouseUp={rememberSelection}
            onBlur={rememberSelection}
            onPaste={onPaste}
            onDrop={(event) => event.preventDefault()}
            className={cn(
              'bg-card min-h-24 rounded-lg border px-3 py-2.5 text-sm leading-relaxed outline-none',
              'focus-visible:ring-ring/50 focus-visible:ring-[3px] [&>div+div]:mt-2',
              !writable && 'bg-muted/60',
              textErrors.length > 0 && 'border-destructive',
            )}
          />
        </div>

        {doc.tableSentence && (
          <TableSentenceRow
            value={doc.tableSentence}
            onChange={setTableSentence}
            onRemove={() => setTableSentence(null)}
            disabled={!writable}
            tokenLabel={tFields('tableNumber')}
          />
        )}

        <WrapperLine text={wrapper.closing} label={t('wrapper.label')} />
      </div>

      {writable && (
        <div className="text-muted-foreground flex flex-col gap-1 text-xs">
          {atParagraphLimit ? (
            <p>{t('paragraphLimit', { limit: PERSONAL_TEXT_MAX_PARAGRAPHS })}</p>
          ) : (
            <p>{t('paragraphHelp', { limit: PERSONAL_TEXT_MAX_PARAGRAPHS })}</p>
          )}
          <p>{t('countHelp')}</p>
        </div>
      )}

      {tablesOff && doc.tableSentence && (
        <Notice icon={IconInfoCircle}>
          {t('tableSentence.switchOff')}{' '}
          <Link href={`/app/${event.id}/details`} className="font-semibold underline underline-offset-2">
            {t('tableSentence.switchOffLink')}
          </Link>
        </Notice>
      )}

      {placedEmpty.map((field) => (
        <Notice key={field} icon={IconAlertCircle} tone="error">
          {tErrors('emptyField', { field: tFields(field) })}{' '}
          <Link href={`/app/${event.id}/details`} className="font-semibold underline underline-offset-2">
            {t('fix.details')}
          </Link>
          {writable && (
            <>
              {' · '}
              <button
                type="button"
                onClick={() => removeField(field)}
                className="font-semibold underline underline-offset-2"
              >
                {t('fix.remove')}
              </button>
            </>
          )}
        </Notice>
      ))}

      {otherErrors.map((error) => {
        const message = personalTextErrorMessage(error);
        return (
          <Notice key={error.code} icon={IconAlertCircle} tone="error">
            {tErrors(message.key, {
              ...message.values,
              field: message.field ? tFields(message.field) : '',
            })}
          </Notice>
        );
      })}
    </SettingsCard>
  );
}

/** One of the Wrapper's fixed lines: part of the message, not the Owner's to edit. */
function WrapperLine({ text, label }: { text: string; label: string }) {
  return (
    <p className="text-muted-foreground flex items-center gap-1.5 px-1 text-sm" dir="rtl">
      <IconLock size={12} aria-label={label} className="shrink-0 opacity-70" />
      <span>{text}</span>
    </p>
  );
}

function TableSentenceRow({
  value,
  onChange,
  onRemove,
  disabled,
  tokenLabel,
}: {
  value: { before: string; after: string };
  onChange: (value: { before: string; after: string }) => void;
  onRemove: () => void;
  disabled: boolean;
  tokenLabel: string;
}) {
  const t = useTranslations('schedules.messagePlan.editor.tableSentence');
  return (
    <div className="border-primary/40 bg-primary/5 flex flex-col gap-1.5 rounded-lg border border-dashed p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-primary flex items-center gap-1 text-xs font-bold">
          <IconTable size={13} />
          {t('title')}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('remove')}
            className="text-muted-foreground hover:text-foreground"
          >
            <IconX size={14} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5" dir="rtl">
        <Input
          value={value.before}
          onChange={(event) => onChange({ ...value, before: event.target.value })}
          disabled={disabled}
          aria-label={t('before')}
          className="h-8 min-w-0 flex-1 text-sm"
        />
        <span className="bg-primary/10 text-primary shrink-0 rounded-md px-1.5 py-px text-sm font-semibold">
          {tokenLabel}
        </span>
        <Input
          value={value.after}
          onChange={(event) => onChange({ ...value, after: event.target.value })}
          disabled={disabled}
          aria-label={t('after')}
          className="h-8 w-20 shrink-0 text-sm"
        />
      </div>
      <p className="text-muted-foreground text-xs">{t('help')}</p>
    </div>
  );
}

function Notice({
  icon: Icon,
  tone = 'info',
  children,
}: {
  icon: typeof IconInfoCircle;
  tone?: 'info' | 'error';
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : undefined}
      className={cn(
        'flex items-start gap-1.5 text-xs leading-relaxed',
        tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
