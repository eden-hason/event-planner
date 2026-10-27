// Public API for the billing feature - the per-event "Free to Plan, Pay to Send"
// boundary. Schemas and services are consumed from './schemas' / './services'
// directly (the events feature's schema reuses EVENT_BILLING_STATUSES from
// there); the payment webhook write path lives in './services'.

// Types
export type {
  EventBillingStatus,
  RecordPackageChannel,
  BillingPaymentMethod,
  BillingPaymentKind,
  RecordPackage,
  PackageSplit,
  EventPayment,
  RecordsPayment,
  BillingActionResult,
  GuestPackageView,
  PackageState,
} from './types';

// Pure utils
export {
  deriveHeaderStatus,
  BILLING_STATUS_LABELS,
  billingWhatsAppUrl,
  isRecordsPayment,
  PAYMENT_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  paymentKindBlocker,
  RECORD_PACKAGE_CHANNEL_LABELS,
  RECORD_PACKAGE_CHANNELS,
  RECORD_PACKAGE_RATES,
  BONUS_STEPS,
  bonusRecords,
  nextBonusStep,
  packageAside,
  packageState,
  PRICING_CHANNELS,
  type PricingChannel,
  formatShekels,
  onSale,
  recordPackage,
  splitByPackage,
  topUpTotal,
  UPSELL_CTA_CLASS,
  UPSELL_SURFACE_CLASS,
} from './utils';

// Server Actions
export { setEventBillingStatus, recordEventPayment, setBonusOverride } from './actions';

// Components
export {
  EventBillingStatusProvider,
  useEventBillingStatus,
} from './components/event-billing-status-provider';
export { EventBillingStatusPill } from './components/event-billing-status-pill';
export { EventPlanCard } from './components/event-plan-card';
export { EventBillingStatusControl } from './components/event-billing-status-control';
// The way to the plans page. Exported so surfaces outside this feature (the
// schedules timeline's upsell) lead where the header pill does, rather than
// inventing a second billing story.
export { usePlansHref } from './components/use-plans-href';
export { PackageBar } from './components/package-bar';
export { PackageUncountedNote } from './components/package-hero';
export { RecordPackagePage } from './components/record-package-page';
export { RecordPackageCard } from './components/record-package-card';
export {
  RecordPackageProvider,
  useRecordPackage,
} from './components/record-package-context';
