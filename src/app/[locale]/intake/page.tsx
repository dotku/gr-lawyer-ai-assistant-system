import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getIntakes } from '@/app/actions/intake';
import { IntakeInboxView } from '@/components/intake/IntakeInboxView';

export default async function IntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();

  if (!session) {
    const { locale } = await params;
    redirect(`/${locale}/auth/login`);
  }

  const { filter } = await searchParams;
  const intakes = await getIntakes(filter as any);

  return <IntakeInboxView intakes={intakes} currentFilter={filter} />;
}
