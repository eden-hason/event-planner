'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { GuestApp } from '@/lib/schemas/guest.schema';

const getStatusBadge = (status: GuestApp['rsvpStatus']) => {
  const statusConfig = {
    confirmed: {
      className: 'bg-green-100 text-green-800 border-green-200',
      label: 'Confirmed',
    },
    pending: {
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      label: 'Pending',
    },
    declined: {
      className: 'bg-red-100 text-red-800 border-red-200',
      label: 'Declined',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  return <Badge className={config.className}>{config.label}</Badge>;
};

export const guestColumns: ColumnDef<GuestApp>[] = [
  {
    accessorKey: 'name',
    header: () => <div>Name</div>,
    cell: ({ row }) => {
      return (
        <div className="flex items-center">
          <span>{row.getValue('name')}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'phone',
    header: () => <div>Phone</div>,
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
    accessorKey: 'guestGroup',
    header: () => <div>Group</div>,
    cell: ({ row }) => {
      const guestGroup = row.getValue('guestGroup') as string;
      return guestGroup ? (
        <Badge variant="outline">{guestGroup}</Badge>
      ) : (
        <span className="text-sm text-gray-400">-</span>
      );
    },
    filterFn: (row, id, value) => {
      const group = row.getValue(id) as string;
      if (Array.isArray(value)) {
        return value.length === 0 || value.includes(group);
      }
      return group === value;
    },
  },
  {
    accessorKey: 'rsvpStatus',
    header: () => <div>RSVP Status</div>,
    cell: ({ row }) => {
      const status = row.getValue('rsvpStatus') as GuestApp['rsvpStatus'];
      return getStatusBadge(status);
    },
  },
  {
    accessorKey: 'dietaryRestrictions',
    header: () => <div>Dietary Restrictions</div>,
    cell: ({ row }) => {
      const dietaryRestrictions = row.getValue('dietaryRestrictions') as
        | string
        | undefined;
      return dietaryRestrictions ? (
        <span className="text-sm text-gray-600">{dietaryRestrictions}</span>
      ) : (
        <span className="text-sm text-gray-400">None</span>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: () => <div>Amount</div>,
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
    header: () => <div>Notes</div>,
    cell: ({ row }) => {
      const notes = row.getValue('notes') as string | undefined;
      return notes ? (
        <span className="text-sm text-gray-600 max-w-xs truncate block">
          {notes}
        </span>
      ) : (
        <span className="text-sm text-gray-400">-</span>
      );
    },
  },
];
