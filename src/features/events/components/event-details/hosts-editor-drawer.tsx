'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { EventDetailsFormValues } from '../../schemas';
import type { ChangeKey } from '../../utils/event-details-form';
import { useEventDetails } from './event-details-context';

type HostRole = 'bride' | 'groom' | 'child';

const COUPLE_KEYS: readonly ChangeKey[] = [
  'brideName',
  'brideParents',
  'groomName',
  'groomParents',
];
const CELEBRANT_KEYS: readonly ChangeKey[] = ['childName', 'childParents'];

function PersonFields({
  role,
  roleLabel,
  initial,
  namePlaceholder,
  parentsPlaceholder,
  sideLabel,
}: {
  role: HostRole;
  roleLabel: string;
  initial: string;
  namePlaceholder: string;
  parentsPlaceholder: string;
  sideLabel?: string;
}) {
  const t = useTranslations('eventDetails.hosts');
  const form = useFormContext<EventDetailsFormValues>();

  return (
    <div className="bg-muted/40 flex flex-col gap-3 rounded-xl p-3">
      <div className="flex items-center gap-2">
        <div
          aria-hidden
          className="bg-primary/15 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        >
          {initial}
        </div>
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {roleLabel}
        </span>
      </div>

      <FormField
        control={form.control}
        name={`hostDetails.${role}.name`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">{t('nameLabel')}</FormLabel>
            <FormControl>
              <Input placeholder={namePlaceholder} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          control={form.control}
          name={`hostDetails.${role}.parents`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">{t('parentsOptional')}</FormLabel>
              <FormControl>
                <Input placeholder={parentsPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/*
          Read-only on purpose. The design asked for an editable side name that
          renames the matching guest group, but a Side is a fixed `bride`/`groom`
          enum on `groups.side` with many named groups hanging off each one -
          there is no single group whose name this could be. See the note below.
        */}
        {sideLabel && (
          <div className="flex flex-col gap-2">
            <span className="text-xs leading-none font-medium">
              {t('sideLabel')}
            </span>
            <div className="bg-muted text-muted-foreground flex h-9 items-center rounded-md border px-3 text-sm font-medium">
              {sideLabel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The focused editor for the names, opened from the hosts section.
 *
 * It writes into the page's one form, but commits on its own: the two or four
 * fields it owns are saved when the Owner confirms and rolled back when they
 * cancel, so closing the drawer never leaves a name half-changed behind the
 * page's save bar.
 */
export function HostsEditorDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('eventDetails.hosts');
  const tHeader = useTranslations('eventDetails.header');
  const tSides = useTranslations('guests.sides');
  const { couple, female, save, revert, isSaving } = useEventDetails();
  const form = useFormContext<EventDetailsFormValues>();

  const keys = couple ? COUPLE_KEYS : CELEBRANT_KEYS;
  const hosts = form.watch('hostDetails');

  const initial = (value: string, fallback: string) =>
    value.trim()[0]?.toUpperCase() || fallback;

  const handleCancel = () => {
    revert(keys);
    onOpenChange(false);
  };

  const handleSave = async () => {
    const saved = await save(keys);
    if (saved) onOpenChange(false);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : handleCancel())}
    >
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="text-start">
          <DrawerTitle>{t('drawerTitle')}</DrawerTitle>
          <DrawerDescription>{t('drawerDescription')}</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-2">
          {couple ? (
            <>
              <PersonFields
                role="bride"
                roleLabel={t('bride')}
                initial={initial(hosts.bride.name, '♀')}
                namePlaceholder={t('brideNamePlaceholder')}
                parentsPlaceholder={t('parentsPlaceholderBride')}
                sideLabel={tSides('bride')}
              />
              <PersonFields
                role="groom"
                roleLabel={t('groom')}
                initial={initial(hosts.groom.name, '♂')}
                namePlaceholder={t('groomNamePlaceholder')}
                parentsPlaceholder={t('parentsPlaceholderGroom')}
                sideLabel={tSides('groom')}
              />
              <p className="text-muted-foreground flex items-start gap-1.5 text-xs leading-relaxed">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                {t('sideNote')}
              </p>
            </>
          ) : (
            <PersonFields
              role="child"
              roleLabel={female ? t('celebrantFemale') : t('celebrantMale')}
              initial={initial(hosts.child.name, female ? '♀' : '♂')}
              namePlaceholder={
                female
                  ? t('celebrantNamePlaceholderFemale')
                  : t('celebrantNamePlaceholderMale')
              }
              parentsPlaceholder={t('parentsPlaceholderCelebrant')}
            />
          )}
        </div>

        <DrawerFooter className="flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
            disabled={isSaving}
          >
            {tHeader('cancel')}
          </Button>
          <Button
            type="button"
            className="flex-[1.6]"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? tHeader('saving') : tHeader('save')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
