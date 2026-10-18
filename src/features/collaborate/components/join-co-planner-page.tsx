import { IconUsersGroup } from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getPathname, Link } from '@/i18n/navigation';
import { coPlannerAcceptPath } from '../utils';
import type { CoPlannerLinkPreview } from '../types';

interface JoinCoPlannerPageProps {
  token: string;
  preview: CoPlannerLinkPreview;
  /** Signed in with a real account - a Visitor counts as signed out (ADR 0028). */
  signedIn: boolean;
  /** The last attempt to join did not go through. */
  failed: boolean;
}

/**
 * The page a Co-planner Link opens (ADR 0041). Both buttons lead to the
 * accept route, which joins and lands the co-planner on the Event's Home -
 * signed out, by way of the usual sign-in first. There is no Decline: nothing
 * was addressed to them.
 */
export function JoinCoPlannerPage({ token, preview, signedIn, failed }: JoinCoPlannerPageProps) {
  const t = useTranslations('collaborate.joinPage');
  const locale = useLocale();
  const acceptPath = coPlannerAcceptPath(token);

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

          {failed && <p className="text-destructive text-sm">{t('failed')}</p>}

          {signedIn ? (
            <Button size="lg" className="w-full" asChild>
              {/* A route handler, not a page: a plain anchor, not a client navigation. */}
              <a href={getPathname({ href: acceptPath, locale })}>{t('join')}</a>
            </Button>
          ) : (
            <div className="space-y-2">
              <Button size="lg" className="w-full" asChild>
                <Link href={{ pathname: '/login', query: { next: acceptPath } }}>
                  {t('signInToJoin')}
                </Link>
              </Button>
              <p className="text-muted-foreground text-xs">{t('signInHint')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
