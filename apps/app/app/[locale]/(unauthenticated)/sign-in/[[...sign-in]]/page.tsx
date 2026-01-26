import { getDictionary } from '@pack/i18n';
import type { Locale } from '@/lib/i18n/utils';
import { createMetadata } from '@pack/seo/metadata';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const SignIn = dynamic(() =>
  import('@pack/auth/components/sign-in').then((mod) => mod.SignIn)
);

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return createMetadata({
    title: dictionary.app.auth.signIn.title,
    description: dictionary.app.auth.signIn.description,
  });
}

export default async function SignInPage({ params }: PageProps) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">
          {dictionary.app.auth.signIn.title}
        </h1>
        <p className="text-muted-foreground text-sm">
          {dictionary.app.auth.signIn.description}
        </p>
      </div>
      <SignIn />
    </>
  );
}
