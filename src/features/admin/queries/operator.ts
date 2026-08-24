'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';

export type OperatorIdentity = {
  email: string;
  /** Which database this Back Office is pointed at. */
  environment: string;
};

export async function getOperatorIdentity(): Promise<OperatorIdentity> {
  const userId = await assertAdmin();
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  // A Back Office that does not say which database it is reading is one
  // mis-click away from an Operator acting on the wrong data.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const environment = url.includes('127.0.0.1') || url.includes('localhost')
    ? 'Local'
    : 'Production';

  return { email: data?.email ?? 'Unknown operator', environment };
}
