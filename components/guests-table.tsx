'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GuestForm } from './guest-form';
import { GuestApp } from '@/lib/schemas/guest.schema';

interface GuestsTableProps {
  guests: GuestApp[];
  searchTerm: string;
  eventId: string;
  onSelectGuest: (id: string) => void;
}

export function GuestsTable({
  guests,
  searchTerm,
  eventId,
  onSelectGuest,
}: GuestsTableProps) {
  const [selectedGuest, setSelectedGuest] = useState<GuestApp | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const filteredGuests = useMemo(() => {
    if (!searchTerm.trim()) return guests;

    const searchLower = searchTerm.toLowerCase();
    return guests.filter(
      (guest) =>
        guest.name.toLowerCase().includes(searchLower) ||
        guest.phone?.toLowerCase().includes(searchLower) ||
        guest.guestGroup.toLowerCase().includes(searchLower) ||
        guest.notes?.toLowerCase().includes(searchLower),
    );
  }, [guests, searchTerm]);

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

  const handleRowClick = (guest: GuestApp) => {
    // setSelectedGuest(guest);
    onSelectGuest(guest.id);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedGuest(null);
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setSelectedGuest(null);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-4 px-4">Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>RSVP Status</TableHead>
              <TableHead>Dietary Restrictions</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGuests.map((guest) => (
              <TableRow
                key={guest.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors group"
                onClick={() => handleRowClick(guest)}
              >
                <TableCell className="font-medium py-4 px-4">
                  <div className="flex items-center">
                    <span>{guest.name}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  {guest.phone ? (
                    <span className="text-sm">{guest.phone}</span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="py-4">
                  {guest.guestGroup ? (
                    <Badge variant="outline">{guest.guestGroup}</Badge>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="py-4">
                  {getStatusBadge(guest.rsvpStatus)}
                </TableCell>
                <TableCell className="py-4">
                  {guest.dietaryRestrictions ? (
                    <span className="text-sm text-gray-600">
                      {guest.dietaryRestrictions}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">None</span>
                  )}
                </TableCell>
                <TableCell className="py-4">
                  <div className="text-sm">
                    <div className="text-gray-500">{guest.amount}</div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  {guest.notes ? (
                    <span className="text-sm text-gray-600 max-w-xs truncate block">
                      {guest.notes}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredGuests.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {searchTerm
              ? 'No guests found matching your search.'
              : 'No guests found.'}
          </div>
        )}
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Guest</DialogTitle>
            {selectedGuest?.updatedAt && (
              <DialogDescription>
                Last edit on:{' '}
                {(() => {
                  try {
                    return new Date(selectedGuest.updatedAt).toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    );
                  } catch {
                    return 'Unknown date';
                  }
                })()}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedGuest && (
            <GuestForm
              eventId={eventId}
              guest={selectedGuest as GuestApp}
              onSuccess={handleEditSuccess}
              onCancel={handleEditCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
