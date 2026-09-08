'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Check, CircleAlert, Info, Loader2, QrCode, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  BitDecodeErrorKind,
  BitDecodePhase,
  GiftProviderConfig,
} from '../types';
import { decodeBitQr, giftProviderStatus } from '../utils';
import { ConnectionBadge } from './connection-badge';
import { SavedLink } from './paybox-card';

const RETRYABLE: BitDecodeErrorKind[] = ['noqr', 'generic'];

interface BitCardProps {
  config: GiftProviderConfig;
  pending: boolean;
  onSave: (config: GiftProviderConfig) => Promise<boolean>;
  onDisconnect: () => Promise<boolean>;
}

export function BitCard({ config, pending, onSave, onDisconnect }: BitCardProps) {
  const t = useTranslations('gifting.bit');

  const startConnected = giftProviderStatus('bit', config) === 'connected';
  const [phase, setPhase] = useState<BitDecodePhase>(
    startConnected ? 'connected' : 'idle',
  );
  const [errorKind, setErrorKind] = useState<BitDecodeErrorKind>('generic');
  const [foundLink, setFoundLink] = useState('');
  const [dragging, setDragging] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = () => inputRef.current?.click();

  const run = async (file: File | null) => {
    if (!file) return;
    setLastFile(file);
    setDragging(false);
    setPhase('decoding');
    const result = await decodeBitQr(file);
    if (result.ok) {
      setFoundLink(result.link);
      setPhase('resolved');
    } else {
      setErrorKind(result.kind);
      setPhase('error');
    }
  };

  const confirm = async () => {
    const ok = await onSave({ enabled: true, link: foundLink });
    if (ok) setPhase('connected');
  };

  const disconnect = async () => {
    const ok = await onDisconnect();
    if (ok) {
      setPhase('idle');
      setFoundLink('');
      setLastFile(null);
    }
  };

  const reset = () => {
    setPhase(giftProviderStatus('bit', config) === 'connected' ? 'connected' : 'idle');
    setFoundLink('');
    setLastFile(null);
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src="/gift-bit-logo.svg" alt="Bit" width={40} height={40} />
            <div>
              <h4 className="font-semibold">Bit</h4>
              <p className="text-xs text-muted-foreground">{t('kind')}</p>
            </div>
          </div>
          <ConnectionBadge
            status={
              phase === 'decoding'
                ? 'off'
                : phase === 'error'
                  ? 'error'
                  : phase === 'resolved'
                    ? 'incomplete'
                    : giftProviderStatus('bit', config)
            }
          />
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label={t('uploadLabel')}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            e.target.value = '';
            run(f);
          }}
        />

        {phase === 'idle' && (
          <div className="flex flex-col gap-3">
            <div
              role="button"
              tabIndex={0}
              onClick={pick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pick();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                run(e.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed p-8 text-center transition-colors',
                dragging ? 'border-primary bg-primary/5' : 'bg-muted',
              )}
            >
              <span className="flex size-12 items-center justify-center rounded-xl border bg-card text-foreground">
                <QrCode className="size-5" />
              </span>
              <span className="text-sm font-medium">{t('dropzone')}</span>
              <span className="text-xs text-muted-foreground">
                {t('dropzoneHint')}
              </span>
            </div>
            <p className="flex gap-1.5 rounded-md bg-primary/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
              {t('help')}
            </p>
          </div>
        )}

        {phase === 'decoding' && (
          <div className="flex items-center gap-3 rounded-lg border bg-muted px-3 py-4">
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
            <span className="text-sm font-medium">{t('decoding')}</span>
          </div>
        )}

        {phase === 'resolved' && (
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="size-4" />
              {t('found')}
            </span>
            <SavedLink href={foundLink} />
            <p className="text-xs text-muted-foreground">{t('foundCheck')}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="rounded-full"
                disabled={pending}
                onClick={confirm}
              >
                {t('use')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={pending}
                onClick={pick}
              >
                {t('replace')}
              </Button>
            </div>
          </div>
        )}

        {phase === 'connected' && (
          <div className="flex flex-col gap-3">
            <SavedLink href={config.link} />
            <p className="text-xs text-muted-foreground">{t('connectedNote')}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={pending}
                onClick={pick}
              >
                {t('replace')}
              </Button>
              <Button
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
        )}

        {phase === 'error' && (
          <div role="alert" className="flex flex-col gap-3">
            <div className="border-destructive/20 bg-destructive/5 flex items-start gap-3 rounded-xl border p-3.5">
              <span className="text-destructive flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card">
                <CircleAlert className="size-4" />
              </span>
              <div className="flex flex-col gap-1">
                <strong className="text-sm font-semibold">
                  {t(`errors.${errorKind}.title`)}
                </strong>
                <span className="text-sm text-muted-foreground text-pretty">
                  {t(`errors.${errorKind}.body`)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {RETRYABLE.includes(errorKind) && lastFile && (
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => run(lastFile)}
                >
                  <RotateCcw className="size-3.5" />
                  {t('tryAgain')}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={pick}
              >
                {t('chooseAnother')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground"
                onClick={reset}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
