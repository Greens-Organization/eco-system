import { getDictionary } from '@pack/i18n';
import type { Locale } from '@/lib/i18n/utils';
import { webhooks } from '@pack/webhooks';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return {
    title: dictionary.app.webhooks.title,
    description: dictionary.app.webhooks.description,
  };
}

export default async function WebhooksPage({ params }: PageProps) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);
  const response = await webhooks.getAppPortal();

  if (!response?.url) {
    notFound();
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <iframe
        title={dictionary.app.webhooks.title}
        src={response.url}
        className="h-full w-full border-none"
        allow="clipboard-write"
        loading="lazy"
      />
    </div>
  );
}
