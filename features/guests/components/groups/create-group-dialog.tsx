'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import {
  GroupUpsertSchema,
  GROUP_ICONS,
  GROUP_SIDES,
  GROUP_SIDE_LABELS,
  type GroupUpsert,
} from '@/features/guests/schemas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as TablerIcons from '@tabler/icons-react';
import { Beer, type LucideIcon } from 'lucide-react';

// Map of Lucide icons used in the group icon selector
const LucideIcons: Record<string, LucideIcon> = {
  LucideBeer: Beer,
};

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGroup: (formData: FormData) => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  onCreateGroup,
}: CreateGroupDialogProps) {
  const form = useForm<GroupUpsert>({
    resolver: zodResolver(GroupUpsertSchema),
    defaultValues: {
      name: '',
      description: '',
      icon: 'IconUsers',
    },
  });

  const onSubmit = (values: GroupUpsert) => {
    const formData = new FormData();

    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });

    // Close dialog and reset form immediately
    onOpenChange(false);
    form.reset();

    // Invoke the parent's create handler
    onCreateGroup(formData);
  };

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Add a new group to organize your guests
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Family, Friends, Colleagues"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="side"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Side (optional)</FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a side" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GROUP_SIDES.map((side) => (
                        <SelectItem key={side} value={side}>
                          {GROUP_SIDE_LABELS[side]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a brief description for this group..."
                      className="min-h-[80px] resize-none"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-6 gap-2">
                      {GROUP_ICONS.map((iconName) => {
                        // Check if it's a Lucide icon (prefixed with 'Lucide')
                        const isLucideIcon = iconName.startsWith('Lucide');
                        const isSelected = field.value === iconName;

                        // Get the appropriate icon component
                        const renderIcon = () => {
                          if (isLucideIcon) {
                            const LucideIcon = LucideIcons[iconName];
                            return LucideIcon ? (
                              <LucideIcon className="h-6 w-6" />
                            ) : null;
                          }
                          const TablerIcon = TablerIcons[
                            iconName as keyof typeof TablerIcons
                          ] as React.ComponentType<{ className?: string }>;
                          return TablerIcon ? (
                            <TablerIcon className="h-6 w-6" />
                          ) : null;
                        };

                        const iconElement = renderIcon();
                        if (!iconElement) return null;

                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => field.onChange(iconName)}
                            className={cn(
                              'hover:bg-accent flex aspect-square w-full items-center justify-center rounded-lg border-2 transition-all',
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:border-primary/50',
                            )}
                            title={iconName.replace(/^(Icon|Lucide)/, '')}
                          >
                            {iconElement}
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Group</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
