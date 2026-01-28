import { getDictionary } from '@pack/i18n';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/utils';
import { Header } from './components/header';

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return {
    title: dictionary.app.dashboard.title,
    description: dictionary.app.dashboard.description,
  };
}

export default async function DashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return (
    <>
      <Header
        pages={[dictionary.app.dashboard.pages]}
        page={dictionary.app.dashboard.dataFetching}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-muted/50" />
          ))}
        </div>
        <div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </div>
    </>
  );
}
