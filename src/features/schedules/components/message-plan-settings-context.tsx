'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { updateMessagePlanSchedule } from '../actions';
import {
  isBlankPersonalText,
  normalisePersonalText,
  parsePersonalText,
  serialisePersonalText,
  validatePersonalText,
  type Attachment,
  type MessagePlanEvent,
  type MessagePlanGuestTable,
  type PersonalTextError,
  type Stage,
  type Wording,
} from '../message-plan';
import type { ScheduleApp } from '../schemas';
import type { MessagePlanSaveInput } from '../schemas/message-plan';
import type { DueTimeIssue, DueTimeRules } from '../utils/due-time-guards';
import {
  fromEditorDocument,
  sentWording,
  toEditorDocument,
  type EditorDocument,
} from '../utils/message-plan-editor';
import type { MessagePlanScheduleSource } from '../utils/message-plan-send';
import { DueTimeProvider, useDueTimeField } from './due-time-context';
import { useReportUnsavedChanges } from './unsaved-changes-guard';

/** An unsaved edit, as the save bar names it. */
export type MessagePlanChange =
  | 'messageType'
  | 'personalMessage'
  | 'attachment'
  | 'giftButton'
  | 'dueTime';

/** The Guest a Personal Message is counted against: the longest name and table (ADR 0054). */
export type LongestGuest = { name: string; table: MessagePlanGuestTable | null };

type MessagePlanSettings = {
  stage: Stage;
  editable: boolean;
  isSaving: boolean;
  event: MessagePlanEvent & { id: string };
  wording: Wording;
  setWording: (wording: Wording) => void;
  /** The Personal Message as the editor holds it, kept while Kululu's text is chosen. */
  document: EditorDocument;
  setDocument: (document: EditorDocument) => void;
  /**
   * Moves on whenever the document is replaced from outside the editor
   * (revert, a removed field, a save coming back), so the editor rewrites its
   * own DOM from the document; typing never does.
   */
  documentVersion: number;
  /** Replaces the document and has the editor redraw it. */
  replaceDocument: (document: EditorDocument) => void;
  /** Whether the Personal Message is chosen but empty, so Kululu's text goes. */
  personalBlank: boolean;
  /** The count against the Event's longest Guest name (ADR 0054). */
  length: number;
  /** Why the Personal Message cannot be saved, while it is being edited. */
  textErrors: PersonalTextError[];
  attachment: Attachment | null;
  setAttachment: (attachment: Attachment) => void;
  giftButton: boolean | null;
  setGiftButton: (on: boolean) => void;
  /** The Schedule as it will be saved, which the preview renders. */
  previewSchedule: MessagePlanScheduleSource;
  dueTimeIssue: DueTimeIssue | null;
  changes: MessagePlanChange[];
  revert: () => void;
  save: () => void;
};

const MessagePlanSettingsContext = createContext<MessagePlanSettings | null>(null);

const keyOf = (document: EditorDocument) =>
  serialisePersonalText(normalisePersonalText(fromEditorDocument(document)));

/**
 * The fields of an open Schedule on the current Message Plan, and the one
 * Save that writes them through `updateMessagePlanSchedule` (ADR 0053, 0054).
 *
 * The Due Time is the same field the Classic provider has (`useDueTimeField`),
 * shared through `DueTimeProvider` with the timing card and the past-time
 * dialog. Keyed by Schedule id where it is mounted.
 *
 * The saved values are kept as state rather than read off `schedule`, so the
 * Save bar closes the moment a save succeeds instead of when the page's
 * refresh lands.
 */
export function MessagePlanSettingsProvider({
  schedule,
  stage,
  editable,
  eventDate,
  event,
  longestGuest,
  dueTimeRules,
  children,
}: {
  schedule: ScheduleApp;
  stage: Stage;
  editable: boolean;
  eventDate: string | null;
  event: MessagePlanEvent & { id: string };
  /** The longest name and the longest table the stage sends, for the count. */
  longestGuest: LongestGuest;
  dueTimeRules: DueTimeRules;
  children: React.ReactNode;
}) {
  const t = useTranslations('schedules.messagePlan.save');
  const [isSaving, startSaveTransition] = useTransition();

  // ─── Message ───────────────────────────────────────────────────────────────
  const storedWording = sentWording(schedule);
  const storedDocument = useMemo(
    () => toEditorDocument(parsePersonalText(schedule.personalText)),
    [schedule.personalText],
  );
  const [savedWording, setSavedWording] = useState<Wording>(storedWording);
  const [wording, setWording] = useState<Wording>(storedWording);
  const [savedDocument, setSavedDocument] = useState(storedDocument);
  const [document, setDocument] = useState(storedDocument);
  const [documentVersion, setDocumentVersion] = useState(0);
  const [savedAttachment, setSavedAttachment] = useState(schedule.attachment ?? null);
  const [attachment, setAttachment] = useState(schedule.attachment ?? null);
  const [savedGift, setSavedGift] = useState(schedule.giftButton ?? null);
  const [giftButton, setGiftButton] = useState(schedule.giftButton ?? null);

  const replaceDocument = useCallback((next: EditorDocument) => {
    setDocument(next);
    setDocumentVersion((version) => version + 1);
  }, []);

  // `useState` seeds once, and this provider outlives the refresh a save
  // triggers; what comes back is cleaned, so it is taken as saved.
  useEffect(() => {
    setSavedWording(storedWording);
    setWording(storedWording);
    setSavedDocument(storedDocument);
    replaceDocument(storedDocument);
    setSavedAttachment(schedule.attachment ?? null);
    setAttachment(schedule.attachment ?? null);
    setSavedGift(schedule.giftButton ?? null);
    setGiftButton(schedule.giftButton ?? null);
  }, [storedWording, storedDocument, replaceDocument, schedule.attachment, schedule.giftButton]);

  const personalText = useMemo(() => fromEditorDocument(document), [document]);
  const personalBlank = isBlankPersonalText(personalText);
  const validation = useMemo(
    () => validatePersonalText(personalText, { stage, event, guests: [longestGuest] }),
    [personalText, stage, event, longestGuest],
  );

  const dueTime = useDueTimeField({
    initial: schedule.scheduledDate,
    editable,
    eventDate,
    scheduleTypeKey: schedule.scheduleTypeKey,
    messagePlan: 'current',
    rules: dueTimeRules,
  });
  const { dateDirty, scheduledDate, dueTimeIssue, guardSave } = dueTime;

  // ─── What changed ──────────────────────────────────────────────────────────
  const savedKey = useMemo(() => keyOf(savedDocument), [savedDocument]);
  const wordingDirty = editable && wording !== savedWording;
  // A draft set aside behind Kululu's text is not a change of its own: it is
  // saved along with one.
  const textDirty = editable && wording === 'personal' && keyOf(document) !== savedKey;
  // Only a message being edited is judged: a field emptied on the Event after
  // the text was saved is sent empty, the Owner's call, and blocks nothing
  // else from saving (brief 7.3).
  const messageDirty = wordingDirty || textDirty;
  const textErrors = useMemo(
    () =>
      messageDirty && wording === 'personal' && !personalBlank && !validation.ok
        ? validation.errors
        : [],
    [messageDirty, wording, personalBlank, validation],
  );
  const attachmentDirty = editable && attachment !== savedAttachment;
  const giftDirty = editable && giftButton !== savedGift;
  const dirty = messageDirty || attachmentDirty || giftDirty || dateDirty;

  const changes = useMemo(() => {
    const list: MessagePlanChange[] = [];
    if (wordingDirty) list.push('messageType');
    else if (textDirty) list.push('personalMessage');
    if (attachmentDirty) list.push('attachment');
    if (giftDirty) list.push('giftButton');
    if (dateDirty) list.push('dueTime');
    return list;
  }, [wordingDirty, textDirty, attachmentDirty, giftDirty, dateDirty]);

  const revertDueTime = dueTime.revert;
  const revert = useCallback(() => {
    setWording(savedWording);
    replaceDocument(savedDocument);
    setAttachment(savedAttachment);
    setGiftButton(savedGift);
    revertDueTime();
  }, [savedWording, savedDocument, replaceDocument, savedAttachment, savedGift, revertDueTime]);

  useReportUnsavedChanges(dirty, revert);

  // ─── Save ──────────────────────────────────────────────────────────────────
  const markDueTimeSaved = dueTime.markSaved;
  const commit = useCallback(() => {
    if (!dirty) return;
    const input: MessagePlanSaveInput = {};
    if (messageDirty) {
      input.wording = wording;
      input.personalText = personalBlank ? null : serialisePersonalText(personalText);
    }
    if (attachmentDirty && attachment) input.attachment = attachment;
    if (giftDirty && giftButton !== null) input.giftButton = giftButton;
    if (dateDirty) input.scheduledDate = scheduledDate;

    startSaveTransition(async () => {
      const promise = updateMessagePlanSchedule(schedule.id, input).then((result) => {
        if (!result.success) {
          throw new Error(
            result.code && result.code !== 'failed'
              ? t(`errors.${result.code}`)
              : (result.message ?? t('error')),
          );
        }
        return result;
      });
      toast.promise(promise, {
        loading: t('saving'),
        success: () => {
          // A blank Personal Message is saved as Kululu's text (sentWording).
          const saved = sentWording({ wording, personalText: input.personalText ?? null });
          setSavedWording(saved);
          setWording(saved);
          setSavedDocument(document);
          setSavedAttachment(attachment);
          setSavedGift(giftButton);
          markDueTimeSaved();
          return t('updated');
        },
        error: (err) => (err instanceof Error ? err.message : t('error')),
      });
      try {
        await promise;
      } catch {
        // error toast handled above
      }
    });
  }, [
    dirty,
    messageDirty,
    attachmentDirty,
    giftDirty,
    dateDirty,
    wording,
    personalBlank,
    personalText,
    document,
    attachment,
    giftButton,
    scheduledDate,
    markDueTimeSaved,
    schedule.id,
    t,
  ]);

  const blocked = dueTimeIssue !== null || textErrors.length > 0;
  const save = useCallback(() => {
    if (!dirty || blocked) return;
    guardSave(commit);
  }, [dirty, blocked, guardSave, commit]);

  const previewSchedule = useMemo<MessagePlanScheduleSource>(
    () => ({
      scheduleTypeKey: schedule.scheduleTypeKey,
      wording: wording === 'personal' && !personalBlank ? 'personal' : 'kululu',
      personalText: wording === 'personal' ? serialisePersonalText(personalText) : null,
      attachment,
      giftButton,
      scheduledDate: scheduledDate || null,
    }),
    [schedule.scheduleTypeKey, wording, personalBlank, personalText, attachment, giftButton, scheduledDate],
  );

  const value = useMemo<MessagePlanSettings>(
    () => ({
      stage,
      editable,
      isSaving,
      event,
      wording,
      setWording,
      document,
      setDocument,
      documentVersion,
      replaceDocument,
      personalBlank,
      length: validation.length,
      textErrors,
      attachment,
      setAttachment,
      giftButton,
      setGiftButton,
      previewSchedule,
      dueTimeIssue,
      changes,
      revert,
      save,
    }),
    [
      stage,
      editable,
      isSaving,
      event,
      wording,
      document,
      documentVersion,
      replaceDocument,
      personalBlank,
      validation.length,
      textErrors,
      attachment,
      giftButton,
      previewSchedule,
      dueTimeIssue,
      changes,
      revert,
      save,
    ],
  );

  const dueTimeValue = useMemo(
    () => ({ ...dueTime, editable, isSaving, messagePlan: 'current' as const }),
    [dueTime, editable, isSaving],
  );

  return (
    <MessagePlanSettingsContext.Provider value={value}>
      <DueTimeProvider value={dueTimeValue}>{children}</DueTimeProvider>
    </MessagePlanSettingsContext.Provider>
  );
}

export function useMessagePlanSettings() {
  const context = useContext(MessagePlanSettingsContext);
  if (!context) {
    throw new Error('useMessagePlanSettings must be used within a MessagePlanSettingsProvider');
  }
  return context;
}
