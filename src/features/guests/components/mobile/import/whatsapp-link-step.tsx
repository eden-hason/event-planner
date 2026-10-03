'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  IconBrandWhatsapp,
  IconChevronRight,
  IconCopy,
  IconLock,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type {
  WhatsAppImportError,
  WhatsAppImportState,
} from '@/features/guests/types';

interface WhatsAppLinkStepProps {
  state: WhatsAppImportState;
  defaultPhone: string;
  onStart: (phone: string) => void;
  onCancel: () => void;
}

const ERROR_KEYS: Record<WhatsAppImportError, string> = {
  pairing_timeout: 'errorPairingTimeout',
  connection_closed: 'errorConnectionClosed',
  timeout: 'errorTimeout',
  unknown: 'errorUnknown',
  invalid_phone: 'errorInvalidPhone',
};

/**
 * First step of the WhatsApp import: the Owner's number, then the pairing
 * code to enter on their phone, then a wait while groups and contacts are
 * read. Everything here is a view of `useWhatsAppImport` - the session itself
 * lives in the open request (backlog 0017).
 */
export function WhatsAppLinkStep({
  state,
  defaultPhone,
  onStart,
  onCancel,
}: WhatsAppLinkStepProps) {
  const t = useTranslations('guests.import.whatsapp.link');
  const [phone, setPhone] = useState(defaultPhone);

  if (state.status === 'code') {
    return <CodeView code={state.code} onCancel={onCancel} />;
  }

  if (state.status === 'requesting' || state.status === 'linked') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <Spinner className="text-primary size-8" />
        <div className="flex flex-col gap-1">
          <span className="text-[16px] font-bold">
            {state.status === 'requesting' ? t('requesting') : t('reading')}
          </span>
          {state.groups && (
            <span className="text-muted-foreground text-[13px]">
              {t('groupsFound', { count: state.groups.length })}
            </span>
          )}
        </div>
        <Button variant="ghost" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) onStart(phone.trim());
  };

  return (
    <form onSubmit={submit} className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col items-center gap-2.5 px-2 pt-4 pb-2 text-center">
        <span className="bg-success/10 text-success flex size-14 items-center justify-center rounded-2xl">
          <IconBrandWhatsapp size={28} />
        </span>
        <span className="text-[18px] font-bold">{t('title')}</span>
        <span className="text-muted-foreground text-[13px] leading-relaxed">
          {t('subtitle')}
        </span>
      </div>

      {state.status === 'error' && (
        <Alert variant="destructive">
          <IconAlertTriangle />
          <AlertDescription>{t(ERROR_KEYS[state.error])}</AlertDescription>
        </Alert>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">{t('phoneLabel')}</span>
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="050-1234567"
          className="h-11 text-start text-[16px]"
        />
        <span className="text-muted-foreground text-xs">{t('phoneHint')}</span>
      </label>

      <div className="bg-muted/50 flex items-start gap-2.5 rounded-xl p-3.5">
        <IconLock size={18} className="text-muted-foreground mt-px shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold">{t('privacyTitle')}</span>
          <span className="text-muted-foreground text-xs leading-relaxed">
            {t('privacyBody')}
          </span>
        </div>
      </div>

      <Button type="submit" disabled={!phone.trim()} className="mt-auto h-11 font-bold">
        {state.status === 'error' ? t('tryAgain') : t('getCode')}
      </Button>
    </form>
  );
}

function CodeView({ code, onCancel }: { code: string; onCancel: () => void }) {
  const t = useTranslations('guests.import.whatsapp.link');
  const display = `${code.slice(0, 4)}-${code.slice(4)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t('copied'));
    } catch {
      // Clipboard can be blocked; the code is on screen to type by hand.
    }
  };

  const path = [t('pathLinkedDevices'), t('pathLinkDevice'), t('pathPhoneInstead')];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col items-center gap-3 rounded-2xl border p-5 text-center">
        <span className="text-muted-foreground text-[13px]">{t('codeTitle')}</span>
        <span
          dir="ltr"
          className="font-mono text-[34px] font-bold tracking-[0.12em] select-all"
        >
          {display}
        </span>
        <Button variant="outline" size="sm" onClick={copy} className="gap-1.5">
          <IconCopy size={15} />
          {t('copy')}
        </Button>
      </div>

      <ol className="flex flex-col gap-3 text-[14px]">
        <li className="flex gap-2.5">
          <StepNumber n={1} />
          <span>{t('instructionNotification')}</span>
        </li>
        <li className="flex gap-2.5">
          <StepNumber n={2} />
          <div className="flex flex-col gap-1.5">
            <span>{t('instructionManual')}</span>
            <span className="flex flex-wrap items-center gap-1 text-[13px]">
              {path.map((segment, i) => (
                <span key={segment} className="flex items-center gap-1">
                  {i > 0 && (
                    <IconChevronRight
                      size={14}
                      className="text-muted-foreground rtl:rotate-180"
                    />
                  )}
                  <span className="bg-muted rounded-md px-2 py-0.5 font-medium">
                    {segment}
                  </span>
                </span>
              ))}
            </span>
          </div>
        </li>
      </ol>

      <div className="text-muted-foreground mt-auto flex items-center justify-center gap-2 text-[13px]">
        <Spinner className="size-4" />
        {t('waiting')}
      </div>
      <Button variant="ghost" onClick={onCancel}>
        {t('cancel')}
      </Button>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
      {n}
    </span>
  );
}
