'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type {
  GroupSide,
  GroupWithGuestsApp,
  GuestWithGroupApp,
} from '@/features/guests/schemas';
import {
  exportGuestsToIplan,
  type IplanScope,
  type RsvpStatus,
} from '@/features/guests/utils';
import {
  assignGuestsToGroup,
  setGuestsRsvpStatus,
  setGuestsSideValue,
  type BulkGuestsState,
} from '@/features/guests/actions/bulk';
import {
  deleteImpact,
  rsvpImpact,
  type DeleteImpact,
  type RsvpImpact,
} from '@/features/guests/utils/bulk-impact';
import type { TableOption } from '@/features/seating';
import { loadChangedAnswers } from '@/features/guests/actions/changed-answers';
import { exportChangedAnswers } from '@/features/guests/utils/export-changed-answers';

export type ConfirmRequest =
  | {
      kind: 'rsvp';
      status: RsvpStatus;
      impact: RsvpImpact;
      onConfirm: () => void;
    }
  | {
      kind: 'delete';
      impact: DeleteImpact;
      singleName?: string;
      onConfirm: () => void;
    };

/**
 * The guest list's writes - RSVP, group, side, export and the delete request -
 * shared by the desktop table and the phone list, so a change behaves the same
 * whichever surface made it. Anything with fallout goes through `confirm`; each
 * surface renders that request in its own dialog or sheet.
 */
export function useGuestWrites({
  eventId,
  eventName,
  allGuests,
  liveCount,
  groups,
  tables,
  messagedGuestIds,
}: {
  eventId: string;
  eventName?: string;
  /** Every record, including ones waiting on an Undo - the lookup for ids. */
  allGuests: GuestWithGroupApp[];
  /** Records still on the list, for the delete-everything wording. */
  liveCount: number;
  groups: GroupWithGuestsApp[];
  tables: TableOption[];
  messagedGuestIds: string[];
}) {
  const t = useTranslations('guests');
  const locale = useLocale();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const byId = useMemo(
    () => new Map(allGuests.map((guest) => [guest.id, guest])),
    [allGuests],
  );
  const messagedIds = useMemo(
    () => new Set(messagedGuestIds),
    [messagedGuestIds],
  );
  const targetsOf = (ids: string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((guest): guest is GuestWithGroupApp => !!guest);

  const runWrite = (
    promise: Promise<BulkGuestsState>,
    success: (count: number) => string,
  ) => {
    const checked = promise.then((result) => {
      if (!result.success) throw new Error(t('list.toast.failed'));
      return result;
    });
    toast.promise(checked, {
      loading: t('list.toast.updating'),
      success: (result) =>
        result.count > 0
          ? success(result.count)
          : t('list.toast.nothingChanged'),
      error: (err) =>
        err instanceof Error ? err.message : t('list.toast.failed'),
    });
  };

  const setRsvp = (ids: string[], status: RsvpStatus) => {
    const impact = rsvpImpact(targetsOf(ids), status);
    const run = () =>
      runWrite(setGuestsRsvpStatus(eventId, ids, status), (count) =>
        t(`list.toast.rsvp.${status}`, { count }),
      );
    if (impact.needsConfirm)
      setConfirm({ kind: 'rsvp', status, impact, onConfirm: run });
    else run();
  };

  const setGroup = (
    ids: string[],
    groupId: string | null,
    knownName?: string,
  ) => {
    const name =
      knownName ?? groups.find((group) => group.id === groupId)?.name ?? '';
    runWrite(assignGuestsToGroup(eventId, ids, groupId), (count) =>
      groupId
        ? t('list.toast.group', { count, group: name })
        : t('list.toast.ungrouped', { count }),
    );
  };

  const setSide = (ids: string[], side: GroupSide | null) =>
    runWrite(setGuestsSideValue(eventId, ids, side), (count) =>
      t('list.toast.side', { count }),
    );

  /** Asks first; `onConfirmed` runs the surface's own delete once the Owner agrees. */
  const requestDelete = (
    ids: string[],
    onConfirmed: () => void,
    singleName?: string,
  ) =>
    setConfirm({
      kind: 'delete',
      impact: deleteImpact(targetsOf(ids), messagedIds, liveCount),
      singleName,
      onConfirm: onConfirmed,
    });

  const exportGuests = (list: GuestWithGroupApp[], scope: IplanScope) => {
    const fileName = eventName ? `${eventName}-iplan.xls` : 'iplan-guests.xls';
    toast.promise(exportGuestsToIplan(list, { scope, fileName, tables }), {
      loading: t('directory.exportingIplan'),
      success: () => t('directory.exportIplanSuccess'),
      error: (err) =>
        err instanceof Error ? err.message : t('directory.exportFailed'),
    });
  };

  // Read fresh when asked for: the snapshots behind it are not on the page.
  // "Nobody changed" is a toast, not an empty file.
  const exportChangedAnswersList = () => {
    const c = (key: string, values?: Record<string, number>) =>
      t(`directory.changedAnswers.${key}`, values);
    const run = async () => {
      const rows = await loadChangedAnswers(eventId);
      if (!rows) throw new Error(t('directory.exportFailed'));
      if (rows.length === 0) return false;
      await exportChangedAnswers(rows, {
        fileName: `${eventName ? `${eventName}-` : ''}${c('fileName')}.xlsx`,
        labels: {
          sheetName: c('sheetName'),
          note: c('note'),
          headers: [
            c('name'),
            c('phone'),
            c('previous'),
            c('current'),
            c('kind'),
            c('changedAt'),
            c('history'),
          ],
          coming: (count) =>
            count === null ? c('comingNoCount') : c('coming', { count }),
          notComing: c('notComing'),
          kinds: {
            declined: c('kindDeclined'),
            confirmed: c('kindConfirmed'),
            count: c('kindCount'),
          },
          arrow: locale === 'he' ? '←' : '→',
          rtl: locale === 'he',
        },
      });
      return true;
    };
    toast.promise(run(), {
      loading: t('directory.exportingChangedAnswers'),
      success: (downloaded) =>
        downloaded
          ? t('directory.exportChangedAnswersSuccess')
          : t('directory.exportChangedAnswersNone'),
      error: (err) =>
        err instanceof Error ? err.message : t('directory.exportFailed'),
    });
  };

  return {
    confirm,
    closeConfirm: () => setConfirm(null),
    setRsvp,
    setGroup,
    setSide,
    requestDelete,
    exportGuests,
    exportChangedAnswers: exportChangedAnswersList,
  };
}
