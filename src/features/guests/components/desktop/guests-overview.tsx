'use client';

import { useMemo, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconBrandGoogleDrive,
  IconBrandWhatsapp,
  IconBus,
  IconChevronDown,
  IconDownload,
  IconFileSpreadsheet,
  IconPlus,
  IconTable,
  IconUpload,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { GuestWithGroupApp } from '@/features/guests/schemas';
import {
  rsvpPresentation,
  type IplanScope,
  type RsvpStatus,
} from '@/features/guests/utils';
import { GUEST_STATUS_FILTERS } from '@/features/guests/utils/guest-list-params';
import {
  headcountShare,
  type RsvpHeadcounts,
} from '@/features/guests/utils/rsvp-headcounts';
import { transportationSummary } from '@/features/guests/utils/transportation-summary';
import { cn } from '@/lib/utils';
import { useIplanExportOptions } from '@/features/guests/hooks/use-iplan-export-options';
import { PackageLine } from '../package';
import { RsvpMeterBar } from '../rsvp-meter-bar';

/**
 * What sits above the list (Guests table controls design): the data actions -
 * add, import, export to iPlan - on a row of their own, then the overview card.
 * The card's status cards double as the status filter; the transportation card
 * filters to the Guests who need a ride; the Record Package runs along its
 * bottom. Counts are Guests (the sum of amounts), with the records under them;
 * the list below counts records.
 */
export function GuestsOverview({
  guests,
  counts,
  statusCounts,
  status,
  showTransportation,
  transportOn,
  onStatusChange,
  onTransportToggle,
  onShowOutside,
  onAddGuest,
  onImportFile,
  onImportDrive,
  onImportWhatsApp,
  onExport,
}: {
  guests: GuestWithGroupApp[];
  /** Guests (the sum of amounts) per status. */
  counts: RsvpHeadcounts;
  /** Guest Records per status, over the whole list. */
  statusCounts: Record<RsvpStatus | 'all', number>;
  /** The status the list is narrowed to; `undefined` while no status card is on. */
  status: RsvpStatus | null | undefined;
  /** The Event asks the transportation question, so the card shows. */
  showTransportation: boolean;
  /** The list is narrowed to the Guests who need transportation. */
  transportOn: boolean;
  onStatusChange: (status: RsvpStatus | null) => void;
  onTransportToggle: () => void;
  /** From the package sheet, while the list is over the package. */
  onShowOutside: () => void;
  onAddGuest: () => void;
  onImportFile: () => void;
  onImportDrive: () => void;
  onImportWhatsApp: () => void;
  onExport: (scope: IplanScope) => void;
}) {
  const t = useTranslations('guests');
  const needTransport = useMemo(
    () => (showTransportation ? transportationSummary(guests).yes : 0),
    [showTransportation, guests],
  );

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={onAddGuest}
          className="h-9 gap-1.5 rounded-[10px] px-3.5 text-[13.5px] font-bold"
        >
          <IconPlus size={16} stroke={2.4} />
          {t('list.addGuest')}
        </Button>
        <ImportMenu
          onImportFile={onImportFile}
          onImportDrive={onImportDrive}
          onImportWhatsApp={onImportWhatsApp}
        />
        <ExportMenu
          counts={counts}
          statusCounts={statusCounts}
          onExport={onExport}
        />
      </div>

      <div className="bg-card overflow-hidden rounded-[14px] border">
        <div className="flex flex-wrap items-stretch gap-1 p-1.5">
          <div className="flex min-w-[176px] flex-1 flex-col justify-center gap-2 px-3.5 py-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] leading-none font-extrabold tabular-nums">
                {Math.round(headcountShare(counts, 'confirmed'))}%
              </span>
              <span className="text-muted-foreground text-[13px]">
                {t('list.overview.confirmed')}
              </span>
            </div>
            <RsvpMeterBar counts={counts} />
          </div>

          <Divider />

          <div
            role="radiogroup"
            aria-label={t('list.overview.label')}
            className="flex flex-wrap gap-1"
          >
            {GUEST_STATUS_FILTERS.map((key) => (
              <OverviewCard
                key={key ?? 'all'}
                role="radio"
                on={status === key}
                leading={
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      key ? rsvpPresentation(key).solid : 'bg-foreground',
                    )}
                  />
                }
                label={t(`list.status.${key ?? 'all'}`)}
                people={key ? counts[key] : counts.total}
                detail={t('list.overview.records', {
                  count: statusCounts[key ?? 'all'],
                })}
                onClick={() => onStatusChange(key)}
              />
            ))}
          </div>

          {showTransportation && (
            <>
              <Divider />
              <OverviewCard
                on={transportOn}
                leading={<IconBus size={15} className="text-primary" />}
                label={t('list.overview.transport')}
                people={needTransport}
                detail={t('list.overview.transportOf', {
                  count: counts.confirmed,
                })}
                onClick={onTransportToggle}
              />
            </>
          )}
        </div>

        <PackageLine onShowOutside={onShowOutside} />
      </div>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="bg-border mx-1 my-2.5 w-px" />;
}

/**
 * One card in the overview: a label, the Guests it counts, and a detail under
 * them. A status card is one radio of the status filter; the transportation
 * card toggles on its own.
 */
function OverviewCard({
  role,
  on,
  leading,
  label,
  people,
  detail,
  onClick,
}: {
  role?: 'radio';
  on: boolean;
  leading: ReactNode;
  label: string;
  people: number;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role ? on : undefined}
      aria-pressed={role ? undefined : on}
      onClick={onClick}
      className={cn(
        'flex min-w-[128px] flex-col items-start gap-0.5 rounded-[10px] border px-3 py-1.5 text-start transition-colors',
        on
          ? 'border-primary bg-primary/8'
          : 'hover:bg-muted/60 border-transparent',
      )}
    >
      <span
        className={cn(
          'flex items-center gap-1.5 text-[13px] font-semibold',
          on ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <span aria-hidden className="flex">
          {leading}
        </span>
        {label}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-foreground text-xl leading-tight font-bold tabular-nums">
          {people.toLocaleString()}
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {detail}
        </span>
      </span>
    </button>
  );
}

const MENU_TRIGGER_CLASS =
  'data-[state=open]:border-primary h-9 gap-[7px] rounded-[10px] px-3 text-[13.5px] font-semibold';
const MENU_CONTENT_CLASS = 'w-[300px] rounded-[14px] p-2';
const MENU_HEADING_CLASS =
  'text-muted-foreground px-2.5 pt-1.5 pb-1 text-xs font-semibold';
const MENU_ITEM_CLASS = 'gap-3 rounded-[10px] p-2';

/** An icon tile, a title and a hint - one source or one export in the menus. */
function MenuRow({
  tile,
  icon,
  title,
  hint,
  aside,
}: {
  tile: string;
  icon: ReactNode;
  title: string;
  hint: string;
  aside?: ReactNode;
}) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-[9px] [&_svg]:size-[17px]',
          tile,
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13.5px] font-semibold">{title}</span>
        <span className="text-muted-foreground text-xs">{hint}</span>
      </span>
      {aside}
    </>
  );
}

function ImportMenu({
  onImportFile,
  onImportDrive,
  onImportWhatsApp,
}: {
  onImportFile: () => void;
  onImportDrive: () => void;
  onImportWhatsApp: () => void;
}) {
  const t = useTranslations('guests.list.importMenu');
  const locale = useLocale();
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const templateHref =
    locale === 'he'
      ? '/templates/guest-import-template-he.csv'
      : '/templates/guest-import-template-en.csv';

  return (
    <DropdownMenu dir={dir}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={MENU_TRIGGER_CLASS}>
          <IconDownload size={16} />
          {t('button')}
          <IconChevronDown size={14} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={MENU_CONTENT_CLASS}
      >
        <DropdownMenuLabel className={MENU_HEADING_CLASS}>
          {t('heading')}
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={onImportFile} className={MENU_ITEM_CLASS}>
          <MenuRow
            tile="bg-rsvp-confirmed-tint text-rsvp-confirmed-strong"
            icon={<IconFileSpreadsheet />}
            title={t('file')}
            hint={t('fileHint')}
          />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImportDrive} className={MENU_ITEM_CLASS}>
          <MenuRow
            tile="bg-info-tint text-info-strong"
            icon={<IconBrandGoogleDrive />}
            title={t('drive')}
            hint={t('driveHint')}
          />
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onImportWhatsApp}
          className={MENU_ITEM_CLASS}
        >
          <MenuRow
            tile="bg-rsvp-confirmed-tint text-rsvp-confirmed-strong"
            icon={<IconBrandWhatsapp />}
            title={t('whatsapp')}
            hint={t('whatsappHint')}
          />
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem
          asChild
          className="text-primary focus:text-primary px-2.5 py-1.5 text-[12.5px] font-semibold"
        >
          <a href={templateHref} download>
            {t('sample')}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ExportMenu({
  counts,
  statusCounts,
  onExport,
}: {
  counts: RsvpHeadcounts;
  statusCounts: Record<RsvpStatus | 'all', number>;
  onExport: (scope: IplanScope) => void;
}) {
  const t = useTranslations('guests');
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';
  const options = useIplanExportOptions(counts, statusCounts);

  return (
    <DropdownMenu dir={dir}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={MENU_TRIGGER_CLASS}>
          <IconUpload size={16} />
          {t('directory.exportIplan')}
          <IconChevronDown size={14} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={MENU_CONTENT_CLASS}
      >
        <DropdownMenuLabel className={MENU_HEADING_CLASS}>
          {t('list.exportMenu.heading')}
        </DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.scope}
            disabled={option.records === 0}
            onClick={() => onExport(option.scope)}
            className={MENU_ITEM_CLASS}
          >
            <MenuRow
              tile="bg-muted text-primary"
              icon={<IconTable />}
              title={option.label}
              hint={option.hint}
              aside={
                <span className="bg-muted rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                  {option.people.toLocaleString()}
                </span>
              }
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
