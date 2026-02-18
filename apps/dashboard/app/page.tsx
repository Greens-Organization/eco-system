import { locales } from '@pack/i18n';
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to the default locale
  redirect(`/${locales[0]}`);
}
