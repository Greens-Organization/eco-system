import { redirect } from 'next/navigation';
import { locales } from '@pack/i18n';

export default function RootPage() {
  // Redirect to the default locale
  redirect(`/${locales[0]}`);
}
