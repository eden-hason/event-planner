'use server';

import { z } from 'zod';
import { getChangedAnswersInput } from '@/features/guests/queries/changed-answers';
import {
  findChangedAnswers,
  type ChangedAnswer,
} from '@/features/guests/utils/changed-answers';

/**
 * The Guests the export lists as having changed their own answer, newest
 * change first. Loaded when the Owner asks for the file, not with the page.
 * `null` means it could not be read.
 */
export async function loadChangedAnswers(
  eventId: string,
): Promise<ChangedAnswer[] | null> {
  if (!z.uuid().safeParse(eventId).success) return null;
  try {
    const { guests, snapshots } = await getChangedAnswersInput(eventId);
    return findChangedAnswers(guests, snapshots);
  } catch (error) {
    console.error('loadChangedAnswers failed:', error);
    return null;
  }
}
