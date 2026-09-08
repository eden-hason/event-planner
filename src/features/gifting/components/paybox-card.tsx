'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Check, CircleAlert, Info, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { GiftProviderConfig } from '../types';
import { giftProviderStatus, validatePayboxLink } from '../utils';
import { ConnectionBadge } from './connection-badge';

interface PayboxCardProps {
  config: GiftProviderConfig;
  pending: boolean;
  onSave: (config: GiftProviderConfig) => Promise<boolean>;
  onDisconnect: () => Promise<boolean>;
}

export function PayboxCard({
  config,
  pending,
  onSave,
  onDisconnect,
}: PayboxCardProps) {
  const t = useTranslations('gifting.paybox');
  const tErr = useTranslations('gifting.linkError');

  const isConnected = giftProviderStatus('paybox', config) === 'connected';
  const [editing, setEditing] = useState(!isConnected);
  const [value, setValue] = useState(config.link);
  const [touched, setTouched] = useState(false);

  const error = validatePayboxLink(value);
  const showError = touched && !!error;
  const showValid = !error && value.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (error) return;
    const ok = await onSave({ enabled: true, link: value.trim() });
    if (ok) {
      setEditing(false);
      setTouched(false);
    }
  };

  const disconnect = async () => {
    const ok = await onDisconnect();
    if (ok) {
      setValue('');
      setTouched(false);
      setEditing(true);
    }
  };

  return (
    <Card>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image
              src="/gift-paybox-logo.svg"
              alt="PayBox"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div>
              <h4 className="font-semibold">PayBox</h4>
              <p className="text-xs text-muted-foreground">{t('kind')}</p>
            </div>
          </div>
          <ConnectionBadge status={giftProviderStatus('paybox', config)} />
        </div>

        {isConnected && !editing ? (
          <div className="flex flex-col gap-3">
            <SavedLink href={config.link} />
            <p className="text-xs text-muted-foreground">{t('connectedNote')}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={pending}
                onClick={() => {
                  setValue(config.link);
                  setEditing(true);
                }}
              >
                {t('update')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground hover:text-destructive"
                disabled={pending}
                onClick={disconnect}
              >
                {t('disconnect')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="paybox-url" className="text-sm font-medium">
                {t('label')}
              </label>
              <Input
                id="paybox-url"
                type="url"
                dir="ltr"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder={t('placeholder')}
                value={value}
                aria-invalid={!!showError}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => setTouched(true)}
                className={cn(showValid && 'border-emerald-500')}
              />
              {showError && (
                <p
                  role="alert"
                  className="flex items-start gap-1.5 text-xs text-destructive"
                >
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                  {tErr(error)}
                </p>
              )}
              {showValid && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3.5" />
                  {t('valid')}
                </p>
              )}
              <p className="flex gap-1.5 rounded-md bg-primary/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                {t('help')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                size="sm"
                className="rounded-full"
                disabled={pending}
              >
                {config.link ? t('update') : t('save')}
              </Button>
              {isConnected && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  disabled={pending}
                  onClick={() => {
                    setEditing(false);
                    setValue(config.link);
                    setTouched(false);
                  }}
                >
                  {t('cancel')}
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function SavedLink({ href }: { href: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border bg-muted px-3 py-2.5">
      <Link2 className="size-4 shrink-0 text-muted-foreground" />
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        dir="ltr"
        className="min-w-0 flex-1 truncate font-mono text-xs"
      >
        {href}
      </a>
    </div>
  );
}
