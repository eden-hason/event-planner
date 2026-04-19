'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { GuestWithGroupApp } from '@/features/guests/schemas';
import { RowActions } from './row-actions';
import { GroupIcon } from '../groups';

type TFn = (key: string) => string;

const getStatusBadge = (status: GuestWithGroupApp['rsvpStatus'], t: TFn) => {
  const statusConfig = {
    confirmed: { className: 'bg-green-100 text-green-800 border-green-200' },
    pending: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    declined: { className: 'bg-red-100 text-red-800 border-red-200' },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const label = t(`rsvp.${status}`);
  return <Badge className={config.className}>{label}</Badge>;
};

interface GuestColumnsOptions {
  onDelete: (guest: GuestWithGroupApp) => void;
  showDietary?: boolean;
  t: TFn;
  dietaryLabelMap: Record<string, string>;
}

export const createGuestColumns = (
  options: GuestColumnsOptions,
): ColumnDef<GuestWithGroupApp>[] => {
  const { t, dietaryLabelMap } = options;

  const cols: ColumnDef<GuestWithGroupApp>[] = [
    {
      accessorKey: 'name',
      header: () => <div>{t('table.name')}</div>,
      cell: ({ row }) => (
        <div className="flex items-center">
          <span>{row.getValue('name')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: () => <div>{t('table.phone')}</div>,
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string;
        return phone ? (
          <span className="text-sm">{phone}</span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: 'group',
      header: () => <div>{t('table.group')}</div>,
      cell: ({ row }) => {
        const group = row.original.group;
        return group ? (
          <Badge variant="outline" className="gap-1.5">
            <GroupIcon iconName={group.icon} size="sm" />
            {group.name}
          </Badge>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        );
      },
      filterFn: (row, _id, value) => {
        const group = row.original.group;
        if (!group) {
          return Array.isArray(value) ? value.length === 0 : false;
        }
        if (Array.isArray(value)) {
          return value.length === 0 || value.includes(group.id);
        }
        return group.id === value;
      },
    },
    {
      accessorKey: 'rsvpStatus',
      header: () => <div>{t('table.rsvpStatus')}</div>,
      cell: ({ row }) => {
        const status = row.getValue('rsvpStatus') as GuestWithGroupApp['rsvpStatus'];
        return getStatusBadge(status, t);
      },
      filterFn: (row, _id, value: string[]) => {
        return value.length === 0 || value.includes(row.original.rsvpStatus);
      },
    },
  ];

  if (options.showDietary) {
    cols.push({
      accessorKey: 'dietaryRestrictions',
      header: () => <div>{t('table.dietaryRestrictions')}</div>,
      cell: ({ row }) => {
        const dietaryRestrictions = row.getValue('dietaryRestrictions') as
          | string
          | undefined;
        return dietaryRestrictions ? (
          <span className="text-sm text-gray-600">
            {dietaryLabelMap[dietaryRestrictions] ?? dietaryRestrictions}
          </span>
        ) : (
          <span className="text-sm text-gray-400">{t('table.dietaryNone')}</span>
        );
      },
    });
  }

  cols.push(
    {
      accessorKey: 'amount',
      header: () => <div>{t('table.amount')}</div>,
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number;
        return (
          <div className="text-sm">
            <div className="text-gray-500">{amount}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'notes',
      header: () => <div>{t('table.notes')}</div>,
      cell: ({ row }) => {
        const notes = row.getValue('notes') as string | undefined;
        return notes ? (
          <span className="block max-w-xs truncate text-sm text-gray-600">
            {notes}
          </span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        );
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const guest = row.original;
        return <RowActions guest={guest} onDelete={options.onDelete} t={t} />;
      },
    },
  );

  return cols;
};
