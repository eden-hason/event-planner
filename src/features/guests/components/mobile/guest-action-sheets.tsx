'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconBrandGoogleDrive,
  IconCircleCheck,
  IconEye,
  IconFileSpreadsheet,
  IconFolder,
  IconFolderOff,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import type {
  GroupSide,
  GroupWithGuestsApp,
  GuestWithGroupApp,
} from '@/features/guests/schemas';
import {
  rsvpPresentation,
  RSVP_STATUSES,
  type IplanScope,
  type RsvpStatus,
} from '@/features/guests/utils';
import { useCreateGroup } from '@/features/guests/hooks/use-create-group';
import type { ConfirmRequest } from '@/features/guests/hooks/use-guest-writes';
import { sideSolidClass } from '../side-badge';
import {
  useDeleteConfirmCopy,
  useRsvpConfirmCopy,
} from '../guest-confirm-copy';
import { MobileSheet, SheetOption } from './mobile-sheet';

const ICON = 18;

/** A card's ⋯ menu: the selection bar's actions, scaled to one record. */
export function GuestRowSheet({
  guest,
  onClose,
  onRsvp,
  onPickGroup,
  onOpen,
  onDelete,
}: {
  guest: GuestWithGroupApp | null;
  onClose: () => void;
  onRsvp: (guest: GuestWithGroupApp, status: 'confirmed' | 'declined') => void;
  onPickGroup: (guest: GuestWithGroupApp) => void;
  onOpen: (guest: GuestWithGroupApp) => void;
  onDelete: (guest: GuestWithGroupApp) => void;
}) {
  const t = useTranslations('guests.list');
  /** Options only exist while the sheet shows a guest. */
  const run = (action: (guest: GuestWithGroupApp) => void) => () => {
    if (guest) action(guest);
  };
  const subtitle = guest
    ? `${t(`status.${guest.rsvpStatus}`)} · ${guest.group?.name ?? t('noGroup')}`
    : '';

  return (
    <MobileSheet
      open={guest !== null}
      onClose={onClose}
      title={guest?.name ?? ''}
      subtitle={subtitle}
    >
      <div className="flex flex-col">
        <SheetOption
          label={t('rowMenu.markConfirmed')}
          icon={<IconCircleCheck size={ICON} />}
          disabled={guest?.rsvpStatus === 'confirmed'}
          onClick={run((g) => onRsvp(g, 'confirmed'))}
        />
        <SheetOption
          label={t('rowMenu.markDeclined')}
          icon={<IconX size={ICON} />}
          disabled={guest?.rsvpStatus === 'declined'}
          onClick={run((g) => onRsvp(g, 'declined'))}
        />
        <SheetOption
          label={t('rowMenu.moveToGroup')}
          icon={<IconFolder size={ICON} />}
          chevron
          onClick={run(onPickGroup)}
        />
        <SheetOption
          label={t('rowMenu.open')}
          icon={<IconEye size={ICON} />}
          onClick={run(onOpen)}
        />
        <SheetOption
          label={t('rowMenu.delete')}
          icon={<IconTrash size={ICON} />}
          destructive
          separated
          onClick={run(onDelete)}
        />
      </div>
    </MobileSheet>
  );
}

export function RsvpSheet({
  count,
  open,
  onClose,
  onPick,
}: {
  count: number;
  open: boolean;
  onClose: () => void;
  onPick: (status: RsvpStatus) => void;
}) {
  const t = useTranslations('guests.list');
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={t('mobile.rsvpTitle', { count })}
    >
      <div className="flex flex-col">
        {RSVP_STATUSES.map((status) => (
          <SheetOption
            key={status}
            label={t(`status.${status}`)}
            dotClass={rsvpPresentation(status).solid}
            bold
            onClick={() => onPick(status)}
          />
        ))}
      </div>
    </MobileSheet>
  );
}

/**
 * Pick a group for one record or a selection - or name a new one, which is
 * created and then assigned the same way as picking an existing group.
 */
export function GroupSheet({
  open,
  title,
  subtitle,
  eventId,
  groups,
  currentGroupId,
  canRemove,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  eventId: string;
  groups: GroupWithGuestsApp[];
  /** One record's group, checked and not offered again. */
  currentGroupId?: string | null;
  canRemove: boolean;
  onClose: () => void;
  onPick: (groupId: string | null, name?: string) => void;
}) {
  const t = useTranslations('guests.list');
  const [name, setName] = useState('');
  const { create, error, clearError, pending } = useCreateGroup(eventId);

  const close = () => {
    setName('');
    clearError();
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const groupId = await create(name);
    if (!groupId) return;
    onPick(groupId, name.trim());
    close();
  };

  return (
    <MobileSheet open={open} onClose={close} title={title} subtitle={subtitle}>
      <div className="flex flex-col">
        {groups.length === 0 && (
          <p className="text-muted-foreground py-2 text-[13.5px]">
            {t('rowMenu.noGroups')}
          </p>
        )}
        {groups.map((group) => (
          <SheetOption
            key={group.id}
            label={group.name}
            sub={t('mobile.groupRecords', {
              count: group.guestCount ?? group.guests.length,
            })}
            icon={<IconFolder size={ICON} />}
            checked={group.id === currentGroupId}
            disabled={group.id === currentGroupId}
            onClick={() => {
              onPick(group.id, group.name);
              close();
            }}
          />
        ))}
        {canRemove && (
          <SheetOption
            label={t('mobile.removeFromGroup')}
            icon={<IconFolderOff size={ICON} />}
            separated
            onClick={() => {
              onPick(null);
              close();
            }}
          />
        )}
      </div>
      <form onSubmit={submit} className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <label className="border-input focus-within:border-primary focus-within:ring-ring/50 flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[11px] border px-3 focus-within:ring-[3px]">
            <IconPlus
              size={17}
              stroke={2.2}
              className="text-primary shrink-0"
            />
            <input
              value={name}
              maxLength={100}
              onChange={(event) => {
                setName(event.target.value);
                clearError();
              }}
              placeholder={t('mobile.newGroupPlaceholder')}
              aria-label={t('newGroup.name')}
              // 16px keeps iOS from zooming the page into the field.
              className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
            />
          </label>
          <Button
            type="submit"
            disabled={!name.trim() || pending}
            className="h-11 rounded-[11px] px-3.5 font-bold"
          >
            {t('mobile.createGroup')}
          </Button>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </form>
    </MobileSheet>
  );
}

export function SideSheet({
  count,
  open,
  onClose,
  onPick,
}: {
  count: number;
  open: boolean;
  onClose: () => void;
  onPick: (side: GroupSide | null) => void;
}) {
  const t = useTranslations('guests.list');
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={t('mobile.sideTitle', { count })}
    >
      <div className="flex flex-col">
        {(['bride', 'groom', null] as (GroupSide | null)[]).map((side) => (
          <SheetOption
            key={side ?? 'none'}
            label={side ? t(`sides.${side}`) : t('mobile.noSide')}
            dotClass={side ? sideSolidClass(side) : 'bg-input'}
            bold
            onClick={() => onPick(side)}
          />
        ))}
      </div>
    </MobileSheet>
  );
}

export function ExportSheet({
  count,
  hidden,
  open,
  onClose,
  onDownload,
}: {
  count: number;
  /** Selected records the current filters leave off screen. */
  hidden: number;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
}) {
  const t = useTranslations('guests.list.mobile');
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={t('exportTitle', { count })}
    >
      <p className="text-muted-foreground text-[14.5px] leading-relaxed text-pretty">
        {hidden > 0 ? t('exportBodyHidden', { hidden }) : t('exportBody')}
      </p>
      <Button
        onClick={onDownload}
        className="mt-1 h-12 rounded-xl text-[15px] font-bold"
      >
        {t('download')}
      </Button>
    </MobileSheet>
  );
}

/** The toolbar's ⋯: bring guests in, or take the whole list out to iPlan. */
export function MoreSheet({
  open,
  onClose,
  onImportFile,
  onImportDrive,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  onImportFile: () => void;
  onImportDrive: () => void;
  onExport: (scope: IplanScope) => void;
}) {
  const t = useTranslations('guests');
  const run = (action: () => void) => () => {
    onClose();
    action();
  };
  return (
    <MobileSheet open={open} onClose={onClose} title={t('list.more')}>
      <div className="flex flex-col">
        <SheetOption
          label={t('list.importFile')}
          icon={<IconUpload size={ICON} />}
          onClick={run(onImportFile)}
        />
        <SheetOption
          label={t('list.importDrive')}
          icon={<IconBrandGoogleDrive size={ICON} />}
          onClick={run(onImportDrive)}
        />
      </div>
      <div className="flex flex-col gap-1 border-t pt-3">
        <span className="text-muted-foreground text-xs font-bold">
          {t('list.exportHeading')}
        </span>
        {(['confirmed', 'confirmedPending', 'all'] as IplanScope[]).map(
          (scope) => (
            <SheetOption
              key={scope}
              label={t(
                `directory.export${scope.charAt(0).toUpperCase()}${scope.slice(1)}`,
              )}
              icon={<IconFileSpreadsheet size={ICON} />}
              onClick={run(() => onExport(scope))}
            />
          ),
        )}
      </div>
    </MobileSheet>
  );
}

/**
 * The phone's form of `GuestConfirmDialog`: the same requests and wording, in
 * a bottom sheet. Deleting the whole list stacks its buttons, full width, with
 * the destructive one first and Cancel under it.
 */
export function GuestConfirmSheet({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  if (!request) return null;
  const confirm = () => {
    request.onConfirm();
    onClose();
  };
  return request.kind === 'rsvp' ? (
    <RsvpConfirmSheet request={request} onConfirm={confirm} onClose={onClose} />
  ) : (
    <DeleteConfirmSheet
      request={request}
      onConfirm={confirm}
      onClose={onClose}
    />
  );
}

function RsvpConfirmSheet({
  request,
  onConfirm,
  onClose,
}: {
  request: Extract<ConfirmRequest, { kind: 'rsvp' }>;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const copy = useRsvpConfirmCopy(request);
  return (
    <MobileSheet
      open
      onClose={onClose}
      title={copy.title}
      variant="confirm"
    >
      <div className="flex flex-col gap-[9px]">
        {copy.lines.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="text-muted-foreground flex items-start gap-[9px] text-sm leading-normal"
          >
            <span className="bg-rsvp-pending-tint text-rsvp-pending-strong flex size-6 shrink-0 items-center justify-center rounded-[7px]">
              <Icon size={14} stroke={2.2} />
            </span>
            {text}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">
          {copy.cancel}
        </Button>
        <Button
          variant={request.status === 'declined' ? 'destructive' : 'default'}
          onClick={onConfirm}
          className="flex-[1.6]"
        >
          {copy.confirm}
        </Button>
      </div>
    </MobileSheet>
  );
}

function DeleteConfirmSheet({
  request,
  onConfirm,
  onClose,
}: {
  request: Extract<ConfirmRequest, { kind: 'delete' }>;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { strong, title, body, confirm, cancel } =
    useDeleteConfirmCopy(request);
  return (
    <MobileSheet
      open
      onClose={onClose}
      title={title}
      variant="confirm"
      icon={
        strong && (
          <span className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-[9px]">
            <IconTrash size={18} />
          </span>
        )
      }
    >
      {body && (
        <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
          {body}
        </p>
      )}
      {strong ? (
        <div className="mt-1 flex flex-col gap-2">
          <Button variant="destructive" onClick={onConfirm}>
            {confirm}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {cancel}
          </Button>
        </div>
      ) : (
        <div className="mt-1 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="flex-[1.4]"
          >
            {confirm}
          </Button>
        </div>
      )}
    </MobileSheet>
  );
}
