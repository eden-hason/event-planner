import { getTranslations } from 'next-intl/server';

export default async function Loading() {
  const t = await getTranslations('common');
  return (
    <div className="flex min-h-[calc(100vh-101px)] flex-col items-center justify-center py-12">
      <div className="border-primary mb-4 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
      <span className="text-muted-foreground text-sm">{t('loading')}</span>
    </div>
  );
}
