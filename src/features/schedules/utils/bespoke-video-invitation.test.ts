import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { GuestApp } from '@/features/guests/schemas';
import {
  buildHeaderParameter,
  resolvePlaceholder,
  type ParameterResolutionContext,
} from './parameter-resolvers';

// The two parameters the Bespoke video invitation family carries (migration
// 20261030000000): the WhatsApp video header and the SMS link to /v/.

function context(event: Record<string, unknown>): ParameterResolutionContext {
  return {
    guest: { id: 'guest' } as GuestApp,
    event: { id: 'event', userId: 'user', title: 'title', eventDate: null, ...event },
  };
}

test('the video header carries the Event video URL', () => {
  const url = 'https://example.supabase.co/storage/v1/object/public/invitation-videos/e/v.mp4';
  assert.deepEqual(
    buildHeaderParameter(
      { type: 'video', source: 'event.invitationVideoUrl' },
      context({ invitationVideoUrl: url }),
    ),
    [{ type: 'video', video: { link: url } }],
  );
});

test('with no video uploaded the header is left off', () => {
  assert.deepEqual(
    buildHeaderParameter({ type: 'video', source: 'event.invitationVideoUrl' }, context({})),
    [],
  );
});

test('the SMS link points at the video page for the Event short code', () => {
  const link = resolvePlaceholder(
    'event.videoPageUrl',
    { source: 'event.shortCode', transformer: 'videoPageUrl' },
    context({ shortCode: 'ab12' }),
  );
  assert.match(link, /\/v\/ab12$/);
});
