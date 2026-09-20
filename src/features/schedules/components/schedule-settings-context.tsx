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

import { updateCustomText, updateScheduledDate } from '../actions';
import type { ScheduleApp } from '../schemas';

interface ScheduleSettings {
  /** False once nothing about this Schedule can be changed any more. */
  editable: boolean;
  note: string;
  setNote: (note: string) => void;
  /** The Due Time, as an instant. */
  scheduledDate: string;
  setScheduledDate: (iso: string) => void;
  /** The Israel wall clock of the Due Time, `HH:mm`. */
  scheduledTime: string;
  setScheduledTime: (time: string) => void;
  dirty: boolean;
  isSaving: boolean;
  save: () => void;
}

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
  children,
}: {
  schedule: ScheduleApp;
  editable: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations('schedules.detail.save');
  const [isSaving, startSaveTransition] = useTransition();

  const [savedNote, setSavedNote] = useState(schedule.customText ?? '');
  const [note, setNote] = useState(schedule.customText ?? '');
  const [savedDate, setSavedDate] = useState(schedule.scheduledDate ?? '');
  const [scheduledDate, setScheduledDate] = useState(schedule.scheduledDate ?? '');
  // Read back out of the Due Time rather than stored beside it: there is one
  // instant, and the clock face is a view of it (ADR 0015).
  const [scheduledTime, setScheduledTime] = useState(() =>
    schedule.scheduledDate ? israelWallClockParts(schedule.scheduledDate).time : '',
  );

  // `useState` only seeds on mount, and this provider outlives a server
  // round-trip (the router refresh a Server Action triggers). Without this a
  // note saved elsewhere would never reach the field or the preview.
  useEffect(() => {
    setSavedNote(schedule.customText ?? '');
    setNote(schedule.customText ?? '');
  }, [schedule.customText]);

  const noteDirty = editable && note !== savedNote;
  const dateDirty = editable && scheduledDate !== savedDate;
  const dirty = noteDirty || dateDirty;

  const save = useCallback(() => {
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
    if (dateDirty) {
      tasks.push(
        write(updateScheduledDate(schedule.id, scheduledDate), () => setSavedDate(scheduledDate)),
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
  }, [dirty, noteDirty, dateDirty, note, scheduledDate, schedule.id, t]);

  const value = useMemo(
    () => ({
      editable,
      note,
      setNote,
      scheduledDate,
      setScheduledDate,
      scheduledTime,
      setScheduledTime,
      dirty,
      isSaving,
      save,
    }),
    [editable, note, scheduledDate, scheduledTime, dirty, isSaving, save],
  );

  return (
    <ScheduleSettingsContext.Provider value={value}>{children}</ScheduleSettingsContext.Provider>
  );
}

export function useScheduleSettings() {
  const context = useContext(ScheduleSettingsContext);
  if (!context) {
    throw new Error('useScheduleSettings must be used within a ScheduleSettingsProvider');
  }
  return context;
}
