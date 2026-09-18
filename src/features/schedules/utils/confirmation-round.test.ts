import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isFollowUpConfirmation } from './confirmation-round';
import { hasInvitationImage } from './event-config';
import { buildWhatsAppComponents, missingOccasionPhrase } from './send-payload';
import {
  buildDynamicButtonParameters,
  buildDynamicTemplateParameters,
} from './parameter-resolvers';
import {
  buildApproachingLine,
  buildOccasionPhrase,
} from '@/features/events/utils/event-title';
import type { MessageTemplateApp } from '../schemas/message-templates';
import type { ParameterResolutionContext } from './parameter-resolvers';

const confirmation = (id: string, scheduledDate: string, status: string | null = null) => ({
  id,
  scheduleTypeKey: 'confirmation',
  scheduledDate,
  status,
});

const template: MessageTemplateApp = {
  id: '00000000-0000-0000-0000-000000000001',
  key: 'confirmation_1',
  scheduleTypeId: '00000000-0000-0000-0000-000000000002',
  variant: '1',
  name: 'Confirmation - 1',
  description: null,
  languageCode: 'he',
  requiresTableNumbers: false,
  requiresGifting: false,
  requiresNote: false,
  requiresFollowUp: false,
  requiresInvitationImage: false,
  channel: 'whatsapp',
  whatsappTemplateName: 'confirmation_1',
  payload: {
    bodyText: '{{1}} {{2}} {{3}}',
    headerType: null,
    headerText: null,
    footerText: null,
    parameters: {
      headerPlaceholders: [],
      placeholders: [
        { name: 'event.occasionPhrase', source: 'event.occasionPhrase', transformer: 'none' },
        { name: 'event.eventDate', source: 'event.eventDate', transformer: 'none' },
        { name: 'event.venueName', source: 'event.location.name', transformer: 'none' },
      ],
      buttonPlaceholders: [
        { index: 0, subType: 'quick_reply', placeholders: [{ source: 'confirmationToken', transformer: 'rsvpYesPayload' }] },
        { index: 1, subType: 'quick_reply', placeholders: [{ source: 'confirmationToken', transformer: 'rsvpNoPayload' }] },
      ],
    },
  },
};

describe('isFollowUpConfirmation', () => {
  const first = confirmation('a', '2026-10-01T07:00:00Z');
  const second = confirmation('b', '2026-10-08T07:00:00Z');

  it('is the first round when nothing is due before it', () => {
    assert.equal(isFollowUpConfirmation(first, [first, second]), false);
  });

  it('is a follow-up when another Confirmation is due earlier', () => {
    assert.equal(isFollowUpConfirmation(second, [first, second]), true);
  });

  it('ignores an expired earlier round - it never asked anyone', () => {
    const expired = confirmation('a', '2026-10-01T07:00:00Z', 'expired');
    assert.equal(isFollowUpConfirmation(second, [expired, second]), false);
  });

  it('never applies to another Schedule Type', () => {
    const reminder = { ...second, scheduleTypeKey: 'event_reminder' };
    assert.equal(isFollowUpConfirmation(reminder, [first, reminder]), false);
  });
});

describe('buildOccasionPhrase', () => {
  it('builds the phrase without the article, to follow "הוזמנתם ל"', () => {
    assert.equal(
      buildOccasionPhrase({
        eventTypeKey: 'wedding',
        hostDetails: { bride: { name: 'נועה' }, groom: { name: 'דורון' } },
      }),
      'חתונה של נועה ודורון',
    );
    assert.equal(
      buildOccasionPhrase({ eventTypeKey: 'bar_mitzva', hostDetails: { child: { name: 'רועי' } } }),
      'בר המצווה של רועי',
    );
    assert.equal(
      buildOccasionPhrase({ eventTypeKey: 'henna', hostDetails: { bride: { name: 'נועה' } } }),
      'חינה של נועה',
    );
  });

  it('has no phrase - and no fallback - for an unknown type or missing names', () => {
    assert.equal(buildOccasionPhrase({ eventTypeKey: 'general', hostDetails: undefined }), null);
    assert.equal(buildOccasionPhrase({ eventTypeKey: 'wedding', hostDetails: {} }), null);
  });
});

describe('buildApproachingLine', () => {
  it('takes the article and agrees the verb with the occasion', () => {
    assert.equal(
      buildApproachingLine({
        eventTypeKey: 'wedding',
        hostDetails: { bride: { name: 'נועה' }, groom: { name: 'דורון' } },
      }),
      'החתונה של נועה ודורון מתקרבת',
    );
    assert.equal(
      buildApproachingLine({ eventTypeKey: 'bar_mitzva', hostDetails: { child: { name: 'רועי' } } }),
      'בר המצווה של רועי מתקרב',
    );
    assert.equal(
      buildApproachingLine({ eventTypeKey: 'bat_mitzva', hostDetails: { child: { name: 'מאיה' } } }),
      'בת המצווה של מאיה מתקרבת',
    );
    assert.equal(
      buildApproachingLine({ eventTypeKey: 'henna', hostDetails: { bride: { name: 'נועה' }, groom: { name: 'דורון' } } }),
      'החינה של נועה ודורון מתקרבת',
    );
  });

  it('is missing exactly when the Occasion Phrase is', () => {
    assert.equal(buildApproachingLine({ eventTypeKey: 'wedding', hostDetails: {} }), null);
  });
});

describe('missingOccasionPhrase', () => {
  it('also guards the follow-up opening line', () => {
    const followUp = {
      ...template,
      payload: {
        ...template.payload,
        parameters: {
          ...template.payload.parameters,
          placeholders: [
            { name: 'event.approachingLine', source: 'event.approachingLine', transformer: 'none' as const },
          ],
        },
      },
    } as MessageTemplateApp;
    const without = { event: { approachingLine: null } } as unknown as ParameterResolutionContext;
    const withLine = { event: { approachingLine: 'החתונה של נועה ודורון מתקרבת' } } as unknown as ParameterResolutionContext;
    assert.match(missingOccasionPhrase(followUp, without) ?? '', /host names/);
    assert.equal(missingOccasionPhrase(followUp, withLine), null);
  });

  it('fails a template that uses the phrase when the Event has none', () => {
    const context = { event: { occasionPhrase: null } } as unknown as ParameterResolutionContext;
    assert.match(missingOccasionPhrase(template, context) ?? '', /host names/);
  });

  it('passes when the phrase is there', () => {
    const context = { event: { occasionPhrase: 'חתונה של נועה ודורון' } } as unknown as ParameterResolutionContext;
    assert.equal(missingOccasionPhrase(template, context), null);
  });
});

describe('confirmation_1 rendering', () => {

  it('carries the token in each quick reply as a payload', () => {
    const context = {
      guest: { id: 'g', name: 'x' },
      event: {
        id: 'e',
        userId: 'u',
        title: 't',
        eventDate: '2026-10-20',
        occasionPhrase: 'חתונה של נועה ודורון',
        location: { name: 'גן' },
      },
      confirmationToken: 'AbCdEf123456',
    } as unknown as ParameterResolutionContext;

    // Built from the same two resolvers renderSendPayload uses; it is not
    // called directly because its phone parsing (libphonenumber) does not load
    // under the test runner.
    if (template.channel !== 'whatsapp') return;
    const { placeholders, buttonPlaceholders } = template.payload.parameters;
    const [body, yes, no, ...rest] = buildWhatsAppComponents({
      parameters: buildDynamicTemplateParameters(placeholders, context),
      buttonParameters: buildDynamicButtonParameters(buttonPlaceholders, context),
    });
    assert.deepEqual(body, {
      type: 'body',
      parameters: [
        { type: 'text', text: 'חתונה של נועה ודורון' },
        { type: 'text', text: '2026-10-20' },
        { type: 'text', text: 'גן' },
      ],
    });
    assert.deepEqual(yes, {
      type: 'button',
      sub_type: 'quick_reply',
      index: 0,
      parameters: [{ type: 'payload', payload: 'kc1|AbCdEf123456|yes' }],
    });
    assert.deepEqual(no, {
      type: 'button',
      sub_type: 'quick_reply',
      index: 1,
      parameters: [{ type: 'payload', payload: 'kc1|AbCdEf123456|no' }],
    });
    assert.deepEqual(rest, [], 'no website button');
  });
});

describe('hasInvitationImage', () => {
  it('needs a parseable URL, the same test the header builder applies', () => {
    assert.equal(hasInvitationImage({ imageUrl: 'https://cdn.test/invite.jpg' }), true);
    assert.equal(hasInvitationImage({ imageUrl: '  ' }), false);
    assert.equal(hasInvitationImage({ imageUrl: 'invite.jpg' }), false);
    assert.equal(hasInvitationImage(null), false);
  });
});
