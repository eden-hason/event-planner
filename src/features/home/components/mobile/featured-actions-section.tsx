import { getTranslations } from 'next-intl/server';
import { formatPhone } from '@/lib/phone';
import { RecordPackageProvider } from '@/features/billing';
import { getGuestPackageView } from '@/features/billing/queries';
import { getFeaturedActionFacts, getHomeEvent, getHomeViewer, getPreviewToken } from '../../queries';
import { rankFeaturedActions } from '../../utils/featured-actions';
import type { FeaturedActionKey } from '../../types';
import { FeaturedActionList, type FeaturedActionView } from './featured-action-list';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : 'http://localhost:3000');

/** Masks all but the last four digits: 052-•••-3341. */
function maskPhone(e164: string): string {
  const local = formatPhone(e164);
  const digits = local.replace(/\D/g, '');
  if (digits.length < 7) return local;
  return `${digits.slice(0, 3)}-•••-${digits.slice(-4)}`;
}

export async function FeaturedActionsSection({ eventId }: { eventId: string }) {
  const [t, event, viewer, previewToken] = await Promise.all([
    getTranslations('home.mobile.actions'),
    getHomeEvent(eventId),
    getHomeViewer(eventId),
    getPreviewToken(eventId),
  ]);
  // Seating Managers get Hero and analytics only - nearly every action leads
  // somewhere they cannot go.
  if (!event || !viewer?.isOwner) return null;

  // The package is loaded here, not with the other facts, because its sheet needs it too.
  const [baseFacts, recordPackage] = await Promise.all([
    getFeaturedActionFacts(event, viewer),
    getGuestPackageView(eventId),
  ]);
  const facts = { ...baseFacts, recordsOverPackage: recordPackage?.over ?? 0 };

  const why = (key: FeaturedActionKey): string => {
    switch (key) {
      case 'health':
        if (facts.duplicateRecords > 0 && facts.noPhoneRecords > 0) {
          return t('health.whyBoth', { duplicates: facts.duplicateRecords, noPhone: facts.noPhoneRecords });
        }
        return facts.duplicateRecords > 0
          ? t('health.whyDuplicates', { duplicates: facts.duplicateRecords })
          : t('health.whyNoPhone', { noPhone: facts.noPhoneRecords });
      case 'seating':
        return t('seating.why', { count: facts.confirmedHeads });
      case 'package':
        return t('package.why');
      case 'viewList':
        return t('viewList.why', { count: facts.guestRecords });
      default:
        return t(`${key}.why`);
    }
  };

  const actions: FeaturedActionView[] = rankFeaturedActions(facts).map((key) => ({
    key,
    label:
      key === 'package'
        ? t('package.label', { count: facts.recordsOverPackage })
        : t(`${key}.label`),
    why: why(key),
  }));

  return (
    <RecordPackageProvider view={recordPackage} eventName={event.title}>
      <FeaturedActionList
        eventId={eventId}
        title={t('title')}
        subtitle={t('subtitle')}
        actions={actions}
        maskedPhone={viewer.phone ? maskPhone(viewer.phone) : null}
        previewUrl={previewToken ? `${SITE_URL}/p/${previewToken}` : null}
        health={{ duplicates: facts.duplicateRecords, noPhone: facts.noPhoneRecords }}
      />
    </RecordPackageProvider>
  );
}
