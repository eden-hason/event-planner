import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Badge } from '@/components/ui/badge';
import { Search, Plus, User, Mail, Phone, Users } from 'lucide-react';
import { GuestData } from '@/app/actions/guests';
import { getCurrentUser } from '@/lib/auth';
import { getGuests } from '@/lib/dal';
import { redirect } from 'next/navigation';

export default async function GuestsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const guests = await getGuests(currentUser.uid, 'c7C4Kw8bV1AUSTLwEJzS');

  const getStatusBadge = (status: GuestData['rsvpStatus']) => {
    const statusConfig = {
      confirmed: { variant: 'default' as const, label: 'Confirmed' },
      pending: { variant: 'secondary' as const, label: 'Pending' },
      declined: { variant: 'destructive' as const, label: 'Declined' },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleAddGuest = () => {
    // TODO: Implement add guest functionality
    console.log('Add guest clicked');
  };

  return (
    <div className="container mx-auto space-y-6 p-4">
      {/* Header with search and add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            {/* <Input
              placeholder="Search guests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            /> */}
          </div>
        </div>
        {/* <Button
          onClick={handleAddGuest}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Guest</span>
        </Button> */}
      </div>

      {/* Guests table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>RSVP Status</TableHead>
              <TableHead>Dietary Restrictions</TableHead>
              <TableHead>Plus One</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.map((guest) => (
              <TableRow key={guest.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{guest.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-sm">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <span>{guest.email}</span>
                    </div>
                    {guest.phone && (
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Phone className="h-3 w-3" />
                        <span>{guest.phone}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{guest.group}</Badge>
                </TableCell>
                <TableCell>{getStatusBadge(guest.rsvpStatus)}</TableCell>
                <TableCell>
                  {guest.dietaryRestrictions ? (
                    <span className="text-sm text-gray-600">
                      {guest.dietaryRestrictions}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">None</span>
                  )}
                </TableCell>
                <TableCell>
                  {guest.plusOne ? (
                    <div className="text-sm">
                      <span className="font-medium">Yes</span>
                      {guest.plusOneName && (
                        <div className="text-gray-500">{guest.plusOneName}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">No</span>
                  )}
                </TableCell>
                <TableCell>
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
      </div>
    </div>
  );
}
