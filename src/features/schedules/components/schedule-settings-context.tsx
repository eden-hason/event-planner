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

import { updateCustomText, updatePersonalMessage, updateScheduledDate } from '../actions';
import { useReportUnsavedChanges } from './unsaved-changes-guard';
import type { ScheduleApp } from '../schemas';
import type { MessagePlan } from '../utils/message-plan-kind';
import type { DueTimeIssue, DueTimeRules } from '../utils/due-time-guards';
import { DueTimeProvider, useDueTimeField } from './due-time-context';

interface ScheduleSettings {
  /** False once nothing about this Schedule can be changed any more. */
  editable: boolean;
  note: string;
  setNote: (note: string) => void;
  /**
   * Which message the Owner has chosen: Kululu's Variant or their own Personal
   * Message (ADR 0046). Not stored - a Schedule is on its Personal Message
   * exactly when it carries the text, so this only starts from the saved text.
   */
  messageMode: MessageMode;
  setMessageMode: (mode: MessageMode) => void;
  /** The Personal Message as typed, kept while the Owner looks at Kululu's. */
  personalMessage: string;
  setPersonalMessage: (text: string) => void;
  /**
   * What the Schedule will send as its Personal Message once saved: the typed
   * text, or nothing while Kululu's message is chosen. The preview reads this.
   */
  effectivePersonalMessage: string;
  /** Why the edited Due Time cannot be saved, or null. Never set while unedited. */
  dueTimeIssue: DueTimeIssue | null;
  /** What is unsaved, one entry per thing the save bar can name. */
  changes: ScheduleChange[];
  /** Puts every field back to what is saved. */
  revert: () => void;
  isSaving: boolean;
  /** Saves, first asking to confirm when the edited Due Time has already passed. */
  save: () => void;
}

export type MessageMode = 'variant' | 'personal';

/** The message a Schedule is on, read from its Personal Message text. */
function modeOf(personalMessage: string | null): MessageMode {
  return personalMessage ? 'personal' : 'variant';
}

/**
 * An unsaved edit as the save bar names it. Switching between Kululu's message
 * and a Personal Message is 'messageType' even when text came with it - it is
 * one decision, and the bar names the bigger one.
 */
export type ScheduleChange = 'messageType' | 'personalMessage' | 'dueTime' | 'note';

const ScheduleSettingsContext = createContext<ScheduleSettings | null>(null);

/**
 * The fields of an open Schedule that can be edited, and the one Save that
 * writes them.
 *
 * The note and the Due Time used to save from their own cards. They share a
 * form now because the organiser thinks of them as one act - "get this
 * reminder right" - and because the preview reads the note as it is typed, so
 * it has to see the same state the note field writes. Each field still goes to
 * its own action, and only the ones that changed are sent.
 *
 * Keyed by Schedule id where it is mounted, so opening another Schedule starts
 * from that Schedule's values rather than carrying edits across.
 */
export function ScheduleSettingsProvider({
  schedule,
  editable,
  eventDate,
  messagePlan = 'classic',
  dueTimeRules,
  children,
}: {
  schedule: ScheduleApp;
  editable: boolean;
  eventDate: string | null;
  messagePlan?: MessagePlan;
  /** The Dispatcher's own Send Window and lateness limit, read server-side. */
  dueTimeRules: DueTimeRules;
  children: React.ReactNode;
}) {
  const t = useTranslations('schedules.detail.save');
  const [isSaving, startSaveTransition] = useTransition();

  const [savedNote, setSavedNote] = useState(schedule.customText ?? '');
  const [note, setNote] = useState(schedule.customText ?? '');
  const [savedPersonalMessage, setSavedPersonalMessage] = useState(
    schedule.personalMessage ?? '',
  );
  const [personalMessage, setPersonalMessage] = useState(schedule.personalMessage ?? '');
  const [messageMode, setMessageMode] = useState<MessageMode>(
    modeOf(schedule.personalMessage),
  );
  const dueTime = useDueTimeField({
    initial: schedule.scheduledDate,
    editable,
    eventDate,
    scheduleTypeKey: schedule.scheduleTypeKey,
    messagePlan,
    rules: dueTimeRules,
  });
  const { dateDirty, scheduledDate, dueTimeIssue, guardSave } = dueTime;

  // `useState` only seeds on mount, and this provider outlives a server
  // round-trip (the router refresh a Server Action triggers). Without this a
  // note saved elsewhere would never reach the field or the preview.
  useEffect(() => {
    setSavedNote(schedule.customText ?? '');
    setNote(schedule.customText ?? '');
  }, [schedule.customText]);

  useEffect(() => {
    setSavedPersonalMessage(schedule.personalMessage ?? '');
    setPersonalMessage(schedule.personalMessage ?? '');
    setMessageMode(modeOf(schedule.personalMessage));
  }, [schedule.personalMessage]);

  // Choosing Kululu's message clears the Personal Message on save; the typed
  // text stays in the field in case the Owner switches back before saving.
  const effectivePersonalMessage = messageMode === 'personal' ? personalMessage : '';

  const noteDirty = editable && note !== savedNote;
  const personalMessageDirty =
    editable && effectivePersonalMessage.trim() !== savedPersonalMessage;
  const dirty = noteDirty || personalMessageDirty || dateDirty;

  const savedMode = modeOf(savedPersonalMessage);
  const changes = useMemo(() => {
    const list: ScheduleChange[] = [];
    if (personalMessageDirty) {
      list.push(messageMode === savedMode ? 'personalMessage' : 'messageType');
    }
    if (dateDirty) list.push('dueTime');
    if (noteDirty) list.push('note');
    return list;
  }, [personalMessageDirty, messageMode, savedMode, dateDirty, noteDirty]);

  const revertDueTime = dueTime.revert;
  const revert = useCallback(() => {
    setNote(savedNote);
    setPersonalMessage(savedPersonalMessage);
    setMessageMode(savedMode);
    revertDueTime();
  }, [savedNote, savedPersonalMessage, savedMode, revertDueTime]);

  useReportUnsavedChanges(dirty, revert);

  const markDueTimeSaved = dueTime.markSaved;
  const commit = useCallback(() => {
    if (!dirty) return;

    const write = async (
      action: Promise<{ success: boolean; message?: string | null }>,
      onSaved: () => void,
    ) => {
      const result = await action;
      if (!result.success) throw new Error(result.message ?? t('error'));
      onSaved();
    };

    const tasks: Promise<void>[] = [];
    if (noteDirty) {
      tasks.push(write(updateCustomText(schedule.id, note), () => setSavedNote(note)));
    }
    if (personalMessageDirty) {
      const text = effectivePersonalMessage;
      tasks.push(
        write(updatePersonalMessage(schedule.id, text), () => setSavedPersonalMessage(text.trim())),
      );
    }
    if (dateDirty) {
      tasks.push(
        write(updateScheduledDate(schedule.id, scheduledDate), markDueTimeSaved),
      );
    }

    startSaveTransition(async () => {
      const promise = Promise.all(tasks);
      toast.promise(promise, {
        loading: t('saving'),
        success: () => t('updated'),
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
    noteDirty,
    personalMessageDirty,
    dateDirty,
    note,
    effectivePersonalMessage,
    scheduledDate,
    markDueTimeSaved,
    schedule.id,
    t,
  ]);

  const save = useCallback(() => {
    if (!dirty || dueTimeIssue) return;
    guardSave(commit);
  }, [dirty, dueTimeIssue, guardSave, commit]);

  const value = useMemo(
    () => ({
      editable,
      note,
      setNote,
      messageMode,
      setMessageMode,
      personalMessage,
      setPersonalMessage,
      effectivePersonalMessage,
      dueTimeIssue,
      changes,
      revert,
      isSaving,
      save,
    }),
    [
      editable,
      note,
      messageMode,
      personalMessage,
      effectivePersonalMessage,
      dueTimeIssue,
      changes,
      revert,
      isSaving,
      save,
    ],
  );

  const dueTimeValue = useMemo(
    () => ({ ...dueTime, editable, isSaving, messagePlan }),
    [dueTime, editable, isSaving, messagePlan],
  );

  return (
    <ScheduleSettingsContext.Provider value={value}>
      <DueTimeProvider value={dueTimeValue}>{children}</DueTimeProvider>
    </ScheduleSettingsContext.Provider>
  );
}

export function useScheduleSettings() {
  const context = useContext(ScheduleSettingsContext);
  if (!context) {
    throw new Error('useScheduleSettings must be used within a ScheduleSettingsProvider');
  }
  return context;
}
