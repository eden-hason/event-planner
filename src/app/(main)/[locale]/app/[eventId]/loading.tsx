import { getTranslations } from 'next-intl/server';

export default async function Loading() {
  const t = await getTranslations('common');
  return (
    // Centered on the whole content column beside the sidebar, not just the
    // space under the page header: `absolute` resolves against `SidebarInset`,
    // the nearest positioned ancestor, which spans the full viewport height.
    // It overlays the page's header row too, so it must not swallow clicks.
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <div className="border-primary mb-4 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
      <span className="text-muted-foreground text-sm">{t('loading')}</span>
    </div>
  );
}
