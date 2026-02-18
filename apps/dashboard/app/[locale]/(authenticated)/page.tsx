import { getDictionary } from '@pack/i18n';
import type { Metadata } from 'next';
import { Activity, Clock, DollarSign, Users } from 'lucide-react';
import { env } from '@/env';
import type { Locale } from '@/lib/i18n/utils';
import { Header } from './components/header';

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

type Stat = {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  recentActivity: Array<{
    id: string;
    user: string;
    action: string;
    timestamp: string;
  }>;
};

async function getStats(): Promise<Stat | null> {
  try {
    const res = await fetch(`${env.API_URL}/v1/stats`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

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
  const stats = await getStats();

  return (
    <>
      <Header
        pages={[dictionary.app.dashboard.pages]}
        page={dictionary.app.dashboard.dataFetching}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="aspect-video rounded-xl bg-muted/50 p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Total Users
              </h3>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {stats?.totalUsers.toLocaleString() ?? '-'}
            </div>
          </div>
          <div className="aspect-video rounded-xl bg-muted/50 p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Active Users
              </h3>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {stats?.activeUsers.toLocaleString() ?? '-'}
            </div>
          </div>
          <div className="aspect-video rounded-xl bg-muted/50 p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </h3>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              ${stats?.totalRevenue.toLocaleString() ?? '-'}
            </div>
          </div>
        </div>
        <div className="flex-1 rounded-xl bg-muted/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>
          <div className="space-y-4">
            {stats?.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 border-border/50"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {activity.user}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.action}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleDateString(locale, {
                    hour: 'numeric',
                    minute: 'numeric',
                  })}
                </div>
              </div>
            ))}
            {!stats && (
              <p className="text-muted-foreground">No activity found.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
