'use server';

import { assertAdmin, getOperatorEmail } from '@/lib/supabase/admin';

export type OperatorIdentity = {
  email: string;
  /** Which database this Back Office is pointed at. */
  environment: string;
};

export async function getOperatorIdentity(): Promise<OperatorIdentity> {
  await assertAdmin();

  // The email comes off the row assertAdmin has already read on this request,
  // so this adds no round trip of its own. It used to be a second read of the
  // same row through the service client.
  const email = await getOperatorEmail();

  // A Back Office that does not say which database it is reading is one
  // mis-click away from an Operator acting on the wrong data.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const environment = url.includes('127.0.0.1') || url.includes('localhost')
    ? 'Local'
    : 'Production';

  return { email: email ?? 'Unknown operator', environment };
}
