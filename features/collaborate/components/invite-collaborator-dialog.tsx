'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  IconCopy,
  IconCheck,
  IconMail,
  IconShieldCheck,
  IconArmchair,
  IconSend,
  IconInfoCircle,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { createInvitation } from '../actions';
import { ScopePicker } from './scope-picker';
import { cn } from '@/lib/utils';
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

const roles = [
  {
    value: 'owner' as CollaboratorRole,
    label: 'Owner',
    icon: IconShieldCheck,
    badge: 'Full Access',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    iconBgClass: 'bg-amber-50 text-amber-600',
    description: 'Full access to manage the event, guests, and settings.',
  },
  {
    value: 'seating_manager' as CollaboratorRole,
    label: 'Seating Manager',
    icon: IconArmchair,
    badge: 'Limited Access',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    iconBgClass: 'bg-purple-50 text-purple-600',
    description: 'Can manage assigned guests and seating charts only.',
  },
];

function ScopeStep({
  email,
  groups,
  guests,
  selectedGroups,
  selectedGuests,
  onGroupsChange,
  onGuestsChange,
  isPending,
  onSubmit,
  onCancel,
}: {
  email: string;
  groups: GroupApp[];
  guests: GuestApp[];
  selectedGroups: string[];
  selectedGuests: string[];
  onGroupsChange: (ids: string[]) => void;
  onGuestsChange: (ids: string[]) => void;
  isPending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const seatingRole = roles.find((r) => r.value === 'seating_manager')!;

  return (
    <>
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="scope-email" className="font-semibold">
            Email Address
          </Label>
          <div className="relative">
            <IconMail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id="scope-email"
              type="email"
              value={email}
              disabled
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">Role</Label>
          <div
            className={cn(
              'relative flex items-center gap-3 rounded-lg border-2 p-4',
              'border-primary bg-primary/[0.02]',
            )}
          >
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-lg',
                seatingRole.iconBgClass,
              )}
            >
              <seatingRole.icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{seatingRole.label}</p>
              <p className="text-muted-foreground text-xs">
                {seatingRole.description}
              </p>
            </div>
            <div className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary text-white">
              <IconCheck className="size-3" stroke={3} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="mb-3 text-sm font-semibold">Select What They Can Manage</p>
          <ScopePicker
            groups={groups}
            guests={guests}
            selectedGroups={selectedGroups}
            selectedGuests={selectedGuests}
            onGroupsChange={onGroupsChange}
            onGuestsChange={onGuestsChange}
          />
        </div>
      </div>

      <div className="border-border -mx-6 border-t" />

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isPending || (selectedGroups.length === 0 && selectedGuests.length === 0)}
        >
          <IconSend className="size-4" />
          {isPending ? 'Sending...' : 'Send Invitation'}
        </Button>
      </DialogFooter>
    </>
  );
}

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
  const [emailSent, setEmailSent] = React.useState(false);

  const resetForm = () => {
    setStep('form');
    setEmail('');
    setRole('owner');
    setSelectedGroups([]);
    setSelectedGuests([]);
    setInvitationLink('');
    setEmailSent(false);
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
      setEmailSent(result.emailSent ?? false);
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
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'form' && 'Invite Collaborator'}
            {step === 'scope' && 'Invite Collaborator'}
            {step === 'success' && 'Invitation Created'}
          </DialogTitle>
          <DialogDescription>
            {step === 'form' &&
              'Add a new member to your planning team.'}
            {step === 'scope' &&
              'Add a new member to your planning team.'}
            {step === 'success' &&
              (emailSent
                ? 'An invitation email has been sent. You can also share the link manually.'
                : 'Share this link with the person you invited.')}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <IconMail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="partner@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Role</Label>
                <div className="grid grid-cols-2 gap-3">
                  {roles.map((r) => {
                    const isSelected = role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className={cn(
                          'relative flex flex-col items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/[0.02]'
                            : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50',
                        )}
                      >
                        <div className="flex w-full items-start justify-between">
                          <div
                            className={cn(
                              'flex size-10 items-center justify-center rounded-lg',
                              r.iconBgClass,
                            )}
                          >
                            <r.icon className="size-5" />
                          </div>
                          <div
                            className={cn(
                              'flex size-5 items-center justify-center rounded-full border-2 transition-colors',
                              isSelected
                                ? 'border-primary bg-primary text-white'
                                : 'border-muted-foreground/30',
                            )}
                          >
                            {isSelected && (
                              <IconCheck className="size-3" stroke={3} />
                            )}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-sm font-semibold">
                            {r.label}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight',
                              r.badgeClass,
                            )}
                          >
                            {r.badge}
                          </span>
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            {r.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
                <span>
                  New collaborators will receive an email invitation to join your
                  event.
                </span>
              </div>
            </div>

            <div className="border-border -mx-6 border-t" />

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={isPending}>
                <IconSend className="size-4" />
                {role === 'seating_manager'
                  ? 'Next: Set Scope'
                  : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'scope' && (
          <ScopeStep
            email={email}
            groups={groups}
            guests={guests}
            selectedGroups={selectedGroups}
            selectedGuests={selectedGuests}
            onGroupsChange={setSelectedGroups}
            onGuestsChange={setSelectedGuests}
            isPending={isPending}
            onSubmit={handleSubmit}
            onCancel={() => {
              onOpenChange(false);
              resetForm();
            }}
          />
        )}

        {step === 'success' && (
          <div className="space-y-4">
            {emailSent && (
              <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                <IconMail className="h-4 w-4 shrink-0" />
                <span>Invitation email sent to {email}</span>
              </div>
            )}
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
