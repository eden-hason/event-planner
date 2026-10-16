'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/toggle-switch';
import {
  GROUP_ICONS,
  GROUP_SIDES,
  GroupSide,
  GroupWithGuestsApp,
} from '@/features/guests/schemas';
import { GroupIcon } from './group-icon';
import { cn } from '@/lib/utils';
import { sideTintClass } from '../side-badge';

type GroupIconName = (typeof GROUP_ICONS)[number];

/**
 * The create/edit group form's state, shared by the phone's bottom sheet and
 * the desktop dialog. Passing a `group` makes it an edit: the form is seeded
 * from it each time `open` turns on.
 */
export function useGroupForm(group: GroupWithGuestsApp | null, open: boolean) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [side, setSide] = useState<GroupSide | null>(null);
  const [icon, setIcon] = useState<GroupIconName>('IconUsers');
  const [assignAfter, setAssignAfter] = useState(true);

  const isEdit = group !== null;

  useEffect(() => {
    if (!open || !group) return;
    setName(group.name);
    setDescription(group.description ?? '');
    setSide(group.side);
    setIcon((group.icon as GroupIconName) ?? 'IconUsers');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group?.id]);

  const reset = () => {
    setName('');
    setDescription('');
    setSide(null);
    setIcon('IconUsers');
    setAssignAfter(true);
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('icon', icon);
    if (group) {
      // An edit must be able to clear these, so they are always sent: an
      // empty value is read as "none" by the action.
      formData.append('id', group.id);
      formData.append('description', description.trim());
      formData.append('side', side ?? '');
    } else {
      if (description.trim()) formData.append('description', description.trim());
      if (side) formData.append('side', side);
    }
    return formData;
  };

  return {
    name,
    setName,
    description,
    setDescription,
    side,
    setSide,
    icon,
    setIcon,
    assignAfter,
    setAssignAfter,
    isEdit,
    canSubmit: name.trim().length > 0,
    reset,
    buildFormData,
  };
}

export type GroupFormState = ReturnType<typeof useGroupForm>;

/**
 * The form's fields: name, description, side, icon, and - when creating with
 * records still unassigned - the "assign right away" switch. `wide` puts name
 * and description side by side, for the desktop dialog.
 */
export function GroupFormFields({
  form,
  wide = false,
  unassignedCount = 0,
}: {
  form: GroupFormState;
  wide?: boolean;
  /** Records with no group; the switch shows only above zero. */
  unassignedCount?: number;
}) {
  const t = useTranslations('guests');
  const fieldHeight = wide ? 'h-10 text-sm' : 'h-[42px] text-[15px]';

  return (
    <>
      <div className={cn(wide ? 'grid grid-cols-2 gap-3' : 'contents')}>
        <div className="flex flex-col gap-1.5">
          <label
            className="text-muted-foreground text-xs font-semibold"
            htmlFor="group-name"
          >
            {t('groups.dialog.nameLabel')}
          </label>
          <Input
            id="group-name"
            autoFocus={wide}
            value={form.name}
            maxLength={100}
            onChange={(e) => form.setName(e.target.value)}
            placeholder={t('groups.mobile.namePlaceholder')}
            className={fieldHeight}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            className="text-muted-foreground text-xs font-semibold"
            htmlFor="group-desc"
          >
            {t('groups.dialog.descriptionLabel')}
          </label>
          <Input
            id="group-desc"
            value={form.description}
            onChange={(e) => form.setDescription(e.target.value)}
            placeholder={t('groups.mobile.descriptionPlaceholder')}
            className={fieldHeight}
          />
        </div>
      </div>

      {/* Side: one segmented control, "no side" is a real option */}
      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-semibold">
          {t('groups.dialog.sideLabel')}
        </span>
        <div
          className={cn(
            'bg-muted flex gap-0.5 p-[3px]',
            wide ? 'h-10 rounded-[10px]' : 'h-[42px] rounded-[11px]',
          )}
        >
          {([...GROUP_SIDES, null] as const).map((side) => {
            const active = form.side === side;
            return (
              <button
                key={side ?? 'none'}
                type="button"
                onClick={() => form.setSide(side)}
                className={cn(
                  'flex flex-1 items-center justify-center rounded-lg text-[13.5px] transition-colors',
                  active
                    ? 'bg-card text-foreground font-bold shadow-sm'
                    : 'text-muted-foreground font-medium',
                )}
              >
                {side ? t(`list.sides.${side}`) : t('groups.mobile.noSide')}
              </button>
            );
          })}
        </div>
        <span className="text-muted-foreground text-xs leading-normal">
          {t('groups.mobile.sideHint')}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-semibold">
          {t('groups.dialog.iconLabel')}
        </span>
        <div className="grid grid-cols-6 gap-2">
          {GROUP_ICONS.map((iconName) => {
            const active = form.icon === iconName;
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => form.setIcon(iconName)}
                className={cn(
                  'flex items-center justify-center rounded-[10px] border-[1.5px] transition-colors',
                  wide ? 'h-11' : 'h-[46px]',
                  active
                    ? form.side
                      ? cn(sideTintClass(form.side), 'border-current')
                      : 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground',
                )}
              >
                <GroupIcon iconName={iconName} size={wide ? 'md' : 'lg'} />
              </button>
            );
          })}
        </div>
      </div>

      {!form.isEdit && unassignedCount > 0 && (
        <div className="flex min-h-12 items-center gap-3 border-t pt-2.5">
          <label
            htmlFor="assign-right-away"
            className="flex min-w-0 flex-1 cursor-pointer flex-col gap-px"
          >
            <span className={cn('font-medium', wide ? 'text-[14.5px]' : 'text-[15px]')}>
              {t('groups.mobile.assignRightAway')}
            </span>
            <span className="text-muted-foreground text-[12.5px]">
              {t('groups.mobile.stillUnassigned', { count: unassignedCount })}
            </span>
          </label>
          <Switch
            id="assign-right-away"
            switchSize="lg"
            checked={form.assignAfter}
            onCheckedChange={form.setAssignAfter}
          />
        </div>
      )}
    </>
  );
}
