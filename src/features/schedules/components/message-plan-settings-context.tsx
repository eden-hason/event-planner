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

import { israelWallClockParts } from '@/lib/date-time';

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
  type MessagePlanSchedule,
  type PersonalTextError,
  type Stage,
  type Wording,
} from '../message-plan';
import type { ScheduleApp } from '../schemas';
import {
  dueTimeIssue as findDueTimeIssue,
  pastDueTime,
  type DueTimeIssue,
  type DueTimeRules,
  type PastDueTime,
} from '../utils/due-time-guards';
import {
  fromEditorDocument,
  sentTables,
  sentWording,
  toEditorDocument,
  type EditorDocument,
} from '../utils/message-plan-editor';
import type { MessagePlanSaveInput } from '../utils/message-plan-save';
import { DEFAULT_SEND_TIME } from '../utils/timeline';
import {
  ScheduleSettingsContextProvider,
  type ScheduleSettings,
} from './schedule-settings-context';
import { useReportUnsavedChanges } from './unsaved-changes-guard';

/** An unsaved edit, as the save bar names it. */
export type MessagePlanChange =
  | 'messageType'
  | 'personalMessage'
  | 'attachment'
  | 'giftButton'
  | 'dueTime';

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
  /** Why the Personal Message cannot be saved, while it is the chosen message. */
  textErrors: PersonalTextError[];
  attachment: Attachment | null;
  setAttachment: (attachment: Attachment) => void;
  giftButton: boolean | null;
  setGiftButton: (on: boolean) => void;
  /** The Schedule as it will be saved, which the preview renders. */
  previewSchedule: MessagePlanSchedule;
  dueTimeIssue: DueTimeIssue | null;
  changes: MessagePlanChange[];
  revert: () => void;
  save: () => void;
};

const MessagePlanSettingsContext = createContext<MessagePlanSettings | null>(null);

function timeOf(dueTime: string | null): string {
  return dueTime ? israelWallClockParts(dueTime).time : DEFAULT_SEND_TIME;
}

const keyOf = (document: EditorDocument) =>
  serialisePersonalText(normalisePersonalText(fromEditorDocument(document)));

/**
 * The fields of an open Schedule on the current Message Plan, and the one
 * Save that writes them through `updateMessagePlanSchedule` (ADR 0053, 0054).
 *
 * The Due Time follows the Classic provider's rules exactly (the same guards,
 * the same past-time question), and the provider also fills the Classic
 * settings context so the shared timing card and past-time dialog work as
 * they do there. Keyed by Schedule id where it is mounted.
 */
export function MessagePlanSettingsProvider({
  schedule,
  stage,
  editable,
  eventDate,
  event,
  guests,
  dueTimeRules,
  children,
}: {
  schedule: ScheduleApp;
  stage: Stage;
  editable: boolean;
  eventDate: string | null;
  event: MessagePlanEvent & { id: string };
  /** Every Guest's name and table, for the count against the longest. */
  guests: readonly { name: string; table: MessagePlanGuestTable | null }[];
  dueTimeRules: DueTimeRules;
  children: React.ReactNode;
}) {
  const t = useTranslations('schedules.messagePlan.save');
  const [isSaving, startSaveTransition] = useTransition();

  // ─── Message ───────────────────────────────────────────────────────────────
  const initialWording = sentWording(schedule);
  const initialDocument = useMemo(
    () => toEditorDocument(parsePersonalText(schedule.personalText)),
    [schedule.personalText],
  );
  const [savedWording, setSavedWording] = useState<Wording>(initialWording);
  const [wording, setWording] = useState<Wording>(initialWording);
  const [savedDocument, setSavedDocument] = useState(initialDocument);
  const [document, setDocument] = useState(initialDocument);
  const [documentVersion, setDocumentVersion] = useState(0);

  const replaceDocument = useCallback((next: EditorDocument) => {
    setDocument(next);
    setDocumentVersion((version) => version + 1);
  }, []);

  // `useState` seeds once, and this provider outlives the refresh a save
  // triggers; the stored text comes back cleaned, so it is taken as saved.
  useEffect(() => {
    setSavedWording(sentWording(schedule));
    setWording(sentWording(schedule));
    setSavedDocument(initialDocument);
    setDocument(initialDocument);
    setDocumentVersion((version) => version + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.wording, initialDocument]);

  const [savedAttachment, setSavedAttachment] = useState(schedule.attachment ?? null);
  const [attachment, setAttachmentState] = useState(schedule.attachment ?? null);
  const [savedGift, setSavedGift] = useState(schedule.giftButton ?? null);
  const [giftButton, setGiftState] = useState(schedule.giftButton ?? null);
  useEffect(() => {
    setSavedAttachment(schedule.attachment ?? null);
    setAttachmentState(schedule.attachment ?? null);
  }, [schedule.attachment]);
  useEffect(() => {
    setSavedGift(schedule.giftButton ?? null);
    setGiftState(schedule.giftButton ?? null);
  }, [schedule.giftButton]);

  const personalText = useMemo(() => fromEditorDocument(document), [document]);
  const personalBlank = isBlankPersonalText(personalText);
  const validation = useMemo(
    () =>
      validatePersonalText(personalText, {
        stage,
        event,
        guests: sentTables(stage, guests, event),
      }),
    [personalText, stage, event, guests],
  );

  // ─── Due Time (as the Classic provider) ────────────────────────────────────
  const [savedDate, setSavedDate] = useState(schedule.scheduledDate ?? '');
  const [scheduledDate, setScheduledDateState] = useState(schedule.scheduledDate ?? '');
  const [scheduledTime, setScheduledTime] = useState(() => timeOf(schedule.scheduledDate));
  const [now, setNow] = useState(() => new Date());
  const [pendingPastDueTime, setPendingPastDueTime] = useState<PastDueTime | null>(null);
  const setScheduledDate = useCallback((iso: string) => {
    setScheduledDateState(iso);
    setNow(new Date());
  }, []);

  // ─── What changed ──────────────────────────────────────────────────────────
  const wordingDirty = editable && wording !== savedWording;
  // A draft set aside behind Kululu's text is not a change of its own: it is
  // saved along with one.
  const textDirty =
    editable && wording === 'personal' && keyOf(document) !== keyOf(savedDocument);
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
  const dateDirty = editable && scheduledDate !== savedDate;
  const dirty = wordingDirty || textDirty || attachmentDirty || giftDirty || dateDirty;

  const changes = useMemo(() => {
    const list: MessagePlanChange[] = [];
    if (wordingDirty) list.push('messageType');
    else if (textDirty) list.push('personalMessage');
    if (attachmentDirty) list.push('attachment');
    if (giftDirty) list.push('giftButton');
    if (dateDirty) list.push('dueTime');
    return list;
  }, [wordingDirty, textDirty, attachmentDirty, giftDirty, dateDirty]);

  const revert = useCallback(() => {
    setWording(savedWording);
    replaceDocument(savedDocument);
    setAttachmentState(savedAttachment);
    setGiftState(savedGift);
    setScheduledDateState(savedDate);
    setScheduledTime(timeOf(savedDate));
    setPendingPastDueTime(null);
  }, [savedWording, savedDocument, replaceDocument, savedAttachment, savedGift, savedDate]);

  useReportUnsavedChanges(dirty, revert);

  const dueTimeIssue = useMemo(
    () =>
      dateDirty
        ? findDueTimeIssue({
            eventDate,
            scheduleTypeKey: schedule.scheduleTypeKey,
            scheduledDate,
            now,
            rules: dueTimeRules,
            messagePlan: 'current',
          })
        : null,
    [dateDirty, eventDate, schedule.scheduleTypeKey, scheduledDate, now, dueTimeRules],
  );

  const blocked = dueTimeIssue !== null || textErrors.length > 0;

  // ─── Save ──────────────────────────────────────────────────────────────────
  const commit = useCallback(() => {
    if (!dirty) return;
    const input: MessagePlanSaveInput = {};
    if (wordingDirty || textDirty) {
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
          setSavedWording(personalBlank ? 'kululu' : wording);
          if (personalBlank && wording === 'personal') setWording('kululu');
          setSavedDocument(document);
          setSavedAttachment(attachment);
          setSavedGift(giftButton);
          setSavedDate(scheduledDate);
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
    wordingDirty,
    textDirty,
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
    schedule.id,
    t,
  ]);

  const save = useCallback(() => {
    if (!dirty || blocked) return;
    if (dateDirty) {
      const past = pastDueTime(scheduledDate, new Date(), dueTimeRules);
      if (past) {
        if (past.kind === 'expires') {
          setNow(new Date());
          return;
        }
        setPendingPastDueTime(past);
        return;
      }
    }
    commit();
  }, [dirty, blocked, dateDirty, scheduledDate, dueTimeRules, commit]);

  const confirmPastDueTime = useCallback(() => {
    setPendingPastDueTime(null);
    commit();
  }, [commit]);
  const cancelPastDueTime = useCallback(() => setPendingPastDueTime(null), []);

  const previewSchedule = useMemo<MessagePlanSchedule>(
    () => ({
      scheduleTypeKey: schedule.scheduleTypeKey,
      wording: wording === 'personal' && !personalBlank ? 'personal' : 'kululu',
      personalText: wording === 'personal' ? serialisePersonalText(personalText) : null,
      attachment,
      giftButton,
      scheduledFor: scheduledDate || null,
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
      setAttachment: setAttachmentState,
      giftButton,
      setGiftButton: setGiftState,
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

  // The Classic settings the shared timing card and past-time dialog read.
  // The message fields there are Classic's and unused on this plan.
  const shared = useMemo<ScheduleSettings>(
    () => ({
      editable,
      note: '',
      setNote: () => {},
      messageMode: wording === 'personal' ? 'personal' : 'variant',
      setMessageMode: () => {},
      personalMessage: '',
      setPersonalMessage: () => {},
      effectivePersonalMessage: '',
      scheduledDate,
      setScheduledDate,
      scheduledTime,
      setScheduledTime,
      now,
      dueTimeIssue,
      messagePlan: 'current',
      changes: dateDirty ? ['dueTime'] : [],
      revert,
      isSaving,
      save,
      pendingPastDueTime,
      confirmPastDueTime,
      cancelPastDueTime,
    }),
    [
      editable,
      wording,
      scheduledDate,
      setScheduledDate,
      scheduledTime,
      now,
      dueTimeIssue,
      dateDirty,
      revert,
      isSaving,
      save,
      pendingPastDueTime,
      confirmPastDueTime,
      cancelPastDueTime,
    ],
  );

  return (
    <MessagePlanSettingsContext.Provider value={value}>
      <ScheduleSettingsContextProvider value={shared}>{children}</ScheduleSettingsContextProvider>
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
