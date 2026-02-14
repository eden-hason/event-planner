'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { toast } from 'sonner';
import { createInvitation } from '../actions';
import { ScopePicker } from './scope-picker';
import type { GroupApp, GuestApp } from '@/features/guests/schemas';
import type { CollaboratorRole } from '../schemas';

interface InviteCollaboratorDialogProps {
  eventId: string;
  groups: GroupApp[];
  guests: GuestApp[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'form' | 'scope' | 'success';

export function InviteCollaboratorDialog({
  eventId,
  groups,
  guests,
  open,
  onOpenChange,
}: InviteCollaboratorDialogProps) {
  const [step, setStep] = React.useState<Step>('form');
  const [isPending, setIsPending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Form state
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<CollaboratorRole>('owner');
  const [selectedGroups, setSelectedGroups] = React.useState<string[]>([]);
  const [selectedGuests, setSelectedGuests] = React.useState<string[]>([]);
  const [invitationLink, setInvitationLink] = React.useState('');

  const resetForm = () => {
    setStep('form');
    setEmail('');
    setRole('owner');
    setSelectedGroups([]);
    setSelectedGuests([]);
    setInvitationLink('');
    setCopied(false);
  };

  const handleNext = () => {
    if (!email) {
      toast.error('Please enter an email address.');
      return;
    }

    if (role === 'seating_manager') {
      setStep('scope');
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsPending(true);

    const formData = new FormData();
    formData.set('email', email);
    formData.set('role', role);
    formData.set('scopeGroups', JSON.stringify(selectedGroups));
    formData.set('scopeGuests', JSON.stringify(selectedGuests));

    try {
      const result = await createInvitation(eventId, formData);
      if (!result.success) {
        toast.error(result.message || 'Failed to create invitation.');
        return;
      }

      setInvitationLink(result.invitationLink || '');
      setStep('success');
      toast.success('Invitation created!');
    } catch {
      toast.error('Failed to create invitation.');
    } finally {
      setIsPending(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(invitationLink);
    setCopied(true);
    toast.success('Link copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'form' && 'Invite Collaborator'}
            {step === 'scope' && 'Set Scope'}
            {step === 'success' && 'Invitation Created'}
          </DialogTitle>
          <DialogDescription>
            {step === 'form' &&
              'Invite someone to collaborate on this event.'}
            {step === 'scope' &&
              'Select which groups and guests this seating manager can access.'}
            {step === 'success' &&
              'Share this link with the person you invited.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="collaborator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <RadioGroup
                value={role}
                onValueChange={(v) => setRole(v as CollaboratorRole)}
                className="space-y-2"
              >
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="owner" id="role-owner" />
                  <div>
                    <Label htmlFor="role-owner" className="cursor-pointer">
                      Owner
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Full access to manage the event, guests, and settings.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem
                    value="seating_manager"
                    id="role-seating"
                  />
                  <div>
                    <Label htmlFor="role-seating" className="cursor-pointer">
                      Seating Manager
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      View-only access to assigned guests and groups.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <Button onClick={handleNext} disabled={isPending} className="w-full">
              {role === 'seating_manager' ? 'Next: Set Scope' : 'Send Invitation'}
            </Button>
          </div>
        )}

        {step === 'scope' && (
          <div className="space-y-4">
            <ScopePicker
              groups={groups}
              guests={guests}
              selectedGroups={selectedGroups}
              selectedGuests={selectedGuests}
              onGroupsChange={setSelectedGroups}
              onGuestsChange={setSelectedGuests}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('form')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isPending ||
                  (selectedGroups.length === 0 && selectedGuests.length === 0)
                }
                className="flex-1"
              >
                {isPending ? 'Creating...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4">
            <div className="bg-muted overflow-hidden rounded-md p-3">
              <code className="block break-all text-xs">{invitationLink}</code>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleCopyLink}
            >
              {copied ? (
                <IconCheck className="mr-1.5 h-4 w-4" />
              ) : (
                <IconCopy className="mr-1.5 h-4 w-4" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
