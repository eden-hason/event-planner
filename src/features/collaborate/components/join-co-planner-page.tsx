'use client';

import * as React from 'react';
import { IconUsersGroup } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useRouter } from '@/i18n/navigation';
import { joinEventByCoPlannerLink } from '../actions';
import { AUTO_JOIN_PARAM, coPlannerLinkPath, JOINED_PARAM } from '../utils';
import type { CoPlannerLinkPreview } from '../types';

interface JoinCoPlannerPageProps {
  token: string;
  preview: CoPlannerLinkPreview;
  /** Signed in with a real account - a Visitor counts as signed out (ADR 0028). */
  signedIn: boolean;
  /** Back from sign-in: join straight away. */
  autoJoin: boolean;
}

/**
 * The page a Co-planner Link opens (ADR 0041). Signed out, it sends the
 * co-planner through the usual sign-in and back here to join automatically.
 * Signed in, one Join button. Either way they land on the Event's Home, which
 * tells them they joined. There is no Decline: nothing was addressed to them.
 */
export function JoinCoPlannerPage({
  token,
  preview,
  signedIn,
  autoJoin,
}: JoinCoPlannerPageProps) {
  const t = useTranslations('collaborate.joinPage');
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(autoJoin);
  const started = React.useRef(false);

  const join = React.useCallback(async () => {
    setIsPending(true);
    const result = await joinEventByCoPlannerLink(token);
    if (result.success) {
      router.replace(
        `/app/${result.eventId}/home${result.joined ? `?${JOINED_PARAM}=1` : ''}`,
      );
      return;
    }
    setIsPending(false);
    toast.error(result.reason === 'not_found' ? t('toast.notFound') : t('toast.failed'));
  }, [token, router, t]);

  React.useEffect(() => {
    if (!autoJoin || started.current) return;
    started.current = true;
    void join();
  }, [autoJoin, join]);

  const signInHref = `/login?next=${encodeURIComponent(
    `${coPlannerLinkPath(token)}?${AUTO_JOIN_PARAM}=1`,
  )}`;

  return (
    // theme-locked-light: reached from a shared link, before the co-planner is
    // necessarily set up in the app - see the comment above
    // `.theme-locked-light` in globals.css.
    <div className="theme-locked-light flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 pt-8 text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-16 items-center justify-center rounded-full">
            <IconUsersGroup className="size-8" />
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              {preview.inviterName
                ? t('invitedBy', { name: preview.inviterName })
                : t('invited')}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {preview.eventTitle || t('untitledEvent')}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('description')}
            </p>
          </div>

          {signedIn ? (
            <Button size="lg" className="w-full" onClick={join} disabled={isPending}>
              {isPending ? t('joining') : t('join')}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button size="lg" className="w-full" asChild>
                <Link href={signInHref}>{t('signInToJoin')}</Link>
              </Button>
              <p className="text-muted-foreground text-xs">{t('signInHint')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
