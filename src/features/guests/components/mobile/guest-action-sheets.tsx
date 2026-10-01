'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconArmchair,
  IconBrandGoogleDrive,
  IconCircleCheck,
  IconEye,
  IconFileSpreadsheet,
  IconFolder,
  IconFolderOff,
  IconMessage,
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
import { upsertGroup } from '@/features/guests/actions/groups';
import type { ConfirmRequest } from '@/features/guests/hooks/use-guest-writes';
import { cn } from '@/lib/utils';
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
  onRsvp: (status: 'confirmed' | 'declined') => void;
  onPickGroup: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations('guests.list');
  const subtitle = guest
    ? `${t(`status.${guest.rsvpStatus}`)} · ${guest.group?.name ?? t('noGroup')}`
    : '';

  return (
    <MobileSheet
      open={guest !== null}
      onOpenChange={(open) => !open && onClose()}
      title={guest?.name ?? ''}
      subtitle={subtitle}
    >
      <div className="flex flex-col">
        <SheetOption
          label={t('rowMenu.markConfirmed')}
          icon={<IconCircleCheck size={ICON} />}
          disabled={guest?.rsvpStatus === 'confirmed'}
          onClick={() => onRsvp('confirmed')}
        />
        <SheetOption
          label={t('rowMenu.markDeclined')}
          icon={<IconX size={ICON} />}
          disabled={guest?.rsvpStatus === 'declined'}
          onClick={() => onRsvp('declined')}
        />
        <SheetOption
          label={t('rowMenu.moveToGroup')}
          icon={<IconFolder size={ICON} />}
          chevron
          onClick={onPickGroup}
        />
        <SheetOption
          label={t('rowMenu.open')}
          icon={<IconEye size={ICON} />}
          onClick={onOpen}
        />
        <SheetOption
          label={t('rowMenu.delete')}
          icon={<IconTrash size={ICON} />}
          destructive
          separated
          onClick={onDelete}
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
      onOpenChange={(next) => !next && onClose()}
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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const close = () => {
    setName('');
    setError(null);
    onClose();
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending(true);
    const formData = new FormData();
    formData.set('name', trimmed);
    const result = await upsertGroup(eventId, formData).catch(() => null);
    setPending(false);
    if (!result?.success || !result.groupId) {
      setError(
        result?.errorCode === 'GROUP_NAME_TAKEN'
          ? t('newGroup.taken')
          : t('newGroup.failed'),
      );
      return;
    }
    onPick(result.groupId, trimmed);
    close();
  };

  return (
    <MobileSheet
      open={open}
      onOpenChange={(next) => !next && close()}
      title={title}
      subtitle={subtitle}
    >
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
      <form onSubmit={create} className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <label className="border-input focus-within:border-primary focus-within:ring-ring/50 flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[11px] border px-3 focus-within:ring-[3px]">
            <IconPlus size={17} stroke={2.2} className="text-primary shrink-0" />
            <input
              value={name}
              maxLength={100}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
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

const SIDE_DOT: Record<GroupSide | 'none', string> = {
  bride: 'bg-primary',
  groom: 'bg-violet-strong',
  none: 'bg-input',
};

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
      onOpenChange={(next) => !next && onClose()}
      title={t('mobile.sideTitle', { count })}
    >
      <div className="flex flex-col">
        {(['bride', 'groom', null] as (GroupSide | null)[]).map((side) => (
          <SheetOption
            key={side ?? 'none'}
            label={side ? t(`sides.${side}`) : t('mobile.noSide')}
            dotClass={SIDE_DOT[side ?? 'none']}
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
      onOpenChange={(next) => !next && onClose()}
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
    <MobileSheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t('list.more')}
    >
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
 * a bottom sheet. Deleting the whole list stacks its buttons with Cancel last
 * and focused, so a stray tap on the sheet's default lands on the safe one.
 */
export function GuestConfirmSheet({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  const tRsvp = useTranslations('guests.list.confirmRsvp');
  const tDel = useTranslations('guests.list.confirmDelete');
  const confirm = () => {
    request?.onConfirm();
    onClose();
  };

  if (request?.kind === 'rsvp') {
    const { impact, status } = request;
    const lines = [
      impact.answeredThemselves > 0 && {
        icon: IconMessage,
        text: tRsvp(status === 'confirmed' ? 'answeredDeclined' : 'answered', {
          count: impact.answeredThemselves,
        }),
      },
      impact.losingSeat > 0 && {
        icon: IconArmchair,
        text: tRsvp('losingSeat', { count: impact.losingSeat }),
      },
    ].filter(Boolean) as { icon: typeof IconMessage; text: string }[];

    return (
      <MobileSheet
        open
        onOpenChange={(open) => !open && onClose()}
        title={tRsvp(`title.${status}`, { count: impact.changing })}
      >
        <div className="flex flex-col gap-[9px]">
          {lines.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="text-muted-foreground flex items-start gap-[9px] text-[14.5px] leading-normal"
            >
              <span className="bg-rsvp-pending-tint text-rsvp-pending-strong flex size-6 shrink-0 items-center justify-center rounded-[7px]">
                <Icon size={14} stroke={2.2} />
              </span>
              {text}
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-12 flex-1 rounded-xl text-[15px] font-bold"
          >
            {tRsvp('cancel')}
          </Button>
          <Button
            variant={status === 'declined' ? 'destructive' : 'default'}
            onClick={confirm}
            className="h-12 flex-[1.6] rounded-xl text-[15px] font-bold"
          >
            {tRsvp(`confirm.${status}`)}
          </Button>
        </div>
      </MobileSheet>
    );
  }

  if (request?.kind === 'delete') {
    const { impact, singleName } = request;
    const strong = impact.isWholeList && impact.total > 1;
    const title = singleName
      ? tDel('titleOne', { name: singleName })
      : strong
        ? tDel('titleAll', { count: impact.total })
        : tDel('title', { count: impact.total });
    const { messaged, answeredThemselves: answered } = impact;
    const body = singleName
      ? messaged + answered > 0
        ? tDel('bodyOneHistory')
        : null
      : messaged > 0 && answered > 0
        ? tDel('bodyBoth', { messaged, answered })
        : messaged > 0
          ? tDel('bodyMessaged', { messaged })
          : answered > 0
            ? tDel('bodyAnswered', { answered })
            : null;
    const label = singleName
      ? tDel('confirmOne')
      : strong
        ? tDel('confirmAll', { count: impact.total })
        : tDel('confirm', { count: impact.total });

    return (
      <MobileSheet
        open
        onOpenChange={(open) => !open && onClose()}
        title={title}
      >
        {strong && (
          <span className="bg-destructive/10 text-destructive -mt-1 flex size-11 items-center justify-center rounded-xl">
            <IconTrash size={22} />
          </span>
        )}
        {body && (
          <p className="text-muted-foreground text-[14.5px] leading-relaxed text-pretty">
            {body}
          </p>
        )}
        <div className={cn('mt-1 flex gap-2', strong && 'flex-col')}>
          {strong ? (
            <>
              <Button
                variant="destructive"
                onClick={confirm}
                className="h-12 rounded-xl text-[15px] font-bold"
              >
                {label}
              </Button>
              <Button
                variant="outline"
                autoFocus
                onClick={onClose}
                className="border-primary ring-ring/50 h-12 rounded-xl text-[15px] font-bold ring-[3px]"
              >
                {tDel('cancel')}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                className="h-12 flex-1 rounded-xl text-[15px] font-bold"
              >
                {tDel('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={confirm}
                className="h-12 flex-[1.4] rounded-xl text-[15px] font-bold"
              >
                {label}
              </Button>
            </>
          )}
        </div>
      </MobileSheet>
    );
  }

  return null;
}
