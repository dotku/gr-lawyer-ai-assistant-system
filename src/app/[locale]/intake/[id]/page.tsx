import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getIntakeById, getIntakes } from '@/app/actions/intake';
import { IntakeDetailView } from '@/components/intake/IntakeDetailView';

export default async function IntakeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await auth();

  if (!session) {
    const { locale } = await params;
    redirect(`/${locale}/auth/login`);
  }

  const { id } = await params;

  try {
    const intake = await getIntakeById(id);
    const allIntakes = await getIntakes();

    return <IntakeDetailView intake={intake} allIntakes={allIntakes} />;
  } catch (error) {
    const { locale } = await params;
    redirect(`/${locale}/intake`);
  }
}
