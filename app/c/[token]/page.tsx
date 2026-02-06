import { getConfirmationByToken } from '@/features/confirmation/queries';
import { ConfirmationForm } from '@/features/confirmation/components/confirmation-form';
import { ErrorMessage } from '@/features/confirmation/components/error-message';

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getConfirmationByToken(token);

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
      {data ? (
        <ConfirmationForm data={data} token={token} />
      ) : (
        <ErrorMessage />
      )}
    </main>
  );
}
