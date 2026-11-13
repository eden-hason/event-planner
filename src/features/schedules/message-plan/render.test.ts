import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rsvpNoPayload,
  rsvpYesPayload,
} from '@/features/confirmation/utils/conversation-ids';
import { SUBMITTED_META_TEMPLATES } from './meta-templates.fixture';
import { serialisePersonalText, type PersonalText } from './personal-text';
import {
  buildMessageLinks,
  composeMessage,
  describeRefusal,
  renderMessagePlanPayloads,
  type ComposeInput,
  type RenderRefusal,
} from './render';
import {
  DAY_AFTER_10AM,
  DAY_BEFORE_10AM,
  EVENT_DAY_10AM,
  LINKS,
  SEATED,
  TOKEN,
  UNSEATED,
  schedule,
  weddingEvent,
} from './test-fixtures';
import type { MessagePlanSchedule } from './types';

const submittedBody = new Map(
  SUBMITTED_META_TEMPLATES.map((t) => {
    const body = t.payload.components.find((c) => c.type === 'BODY');
    return [t.payload.name, body?.type === 'BODY' ? body.text : ''];
  }),
);

function render(
  overrides: Partial<ComposeInput> & { schedule: MessagePlanSchedule },
) {
  const result = renderMessagePlanPayloads({
    event: weddingEvent(),
    guest: SEATED,
    links: LINKS,
    confirmationToken: TOKEN,
    phone: SEATED.phone,
    ...overrides,
  });
  if (!result.ok) assert.fail(`refused: ${describeRefusal(result.refusal)}`);
  return result;
}

function refusal(
  overrides: Partial<ComposeInput> & {
    schedule: MessagePlanSchedule;
    phone?: string | null;
  },
): RenderRefusal {
  const result = renderMessagePlanPayloads({
    event: weddingEvent(),
    guest: SEATED,
    links: LINKS,
    confirmationToken: TOKEN,
    phone: SEATED.phone,
    ...overrides,
  });
  assert.equal(result.ok, false, 'expected a refusal');
  return (result as { refusal: RenderRefusal }).refusal;
}

const personal = (...paragraphs: string[]): string =>
  serialisePersonalText({
    paragraphs: paragraphs.map((text) => [{ kind: 'text', text }]),
  });

const quickReplies = [
  {
    type: 'button',
    sub_type: 'quick_reply',
    index: 0,
    parameters: [{ type: 'payload', payload: rsvpYesPayload(TOKEN) }],
  },
  {
    type: 'button',
    sub_type: 'quick_reply',
    index: 1,
    parameters: [{ type: 'payload', payload: rsvpNoPayload(TOKEN) }],
  },
];

// ─── Invitation ──────────────────────────────────────────────────────────────

test('Invitation, Kululu Wording, no attachment', () => {
  const { whatsapp, sms, message } = render({
    schedule: schedule({ scheduleTypeKey: 'invitation' }),
  });
  assert.equal(whatsapp.templateName, 'invitation_kululu');
  assert.equal(whatsapp.languageCode, 'he');
  assert.equal(whatsapp.to, '+972541234567');
  assert.deepEqual(whatsapp.components, [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: 'חתונה של נועה ודורון' },
        { type: 'text', text: 'יום חמישי, 12 בנובמבר 2026' },
        { type: 'text', text: 'אולמי הגן, ראשון לציון' },
      ],
    },
    ...quickReplies,
  ]);
  const body =
    'משפחה וחברים יקרים,\nהוזמנתם לחתונה של נועה ודורון\n\n📅 יום חמישי, 12 בנובמבר 2026\n📍 אולמי הגן, ראשון לציון\n\nנשמח לדעת אם תגיעו 🙏🏼';
  assert.equal(message.body, body);
  assert.equal(sms.body, `${body}\nלאישור הגעה: https://kulu-lu.com/c/tok123`);
  assert.equal(message.plainText, `${body}\n\n[נגיע בשמחה] [לא נוכל להגיע]`);
});

test('Invitation with the image, and with the video', () => {
  const image = render({
    schedule: schedule({ scheduleTypeKey: 'invitation', attachment: 'image' }),
  });
  assert.equal(image.whatsapp.templateName, 'invitation_kululu_image');
  assert.deepEqual(image.whatsapp.components[0], {
    type: 'header',
    parameters: [
      {
        type: 'image',
        image: { link: 'https://cdn.example.com/invitation.jpg' },
      },
    ],
  });
  const video = render({
    schedule: schedule({ scheduleTypeKey: 'invitation', attachment: 'video' }),
  });
  assert.equal(video.whatsapp.templateName, 'invitation_kululu_video');
  assert.deepEqual(video.whatsapp.components[0], {
    type: 'header',
    parameters: [
      {
        type: 'video',
        video: { link: 'https://cdn.example.com/invitation.mp4' },
      },
    ],
  });
  // An attachment adds no link to the SMS.
  assert.equal(video.sms.body, image.sms.body);
});

test('a stale attachment falls back to no header, never to the other medium', () => {
  const noImage = weddingEvent({ invitations: null });
  const noVideo = weddingEvent({ invitationVideoUrl: 'not a url' });
  assert.equal(
    render({
      event: noImage,
      schedule: schedule({
        scheduleTypeKey: 'invitation',
        attachment: 'image',
      }),
    }).whatsapp.templateName,
    'invitation_kululu',
  );
  assert.equal(
    render({
      event: noVideo,
      schedule: schedule({
        scheduleTypeKey: 'invitation',
        attachment: 'video',
      }),
    }).whatsapp.templateName,
    'invitation_kululu',
  );
  assert.equal(
    render({
      event: noVideo,
      schedule: schedule({ scheduleTypeKey: 'invitation', attachment: null }),
    }).whatsapp.components[0].type,
    'body',
  );
});

// ─── Follow-up ───────────────────────────────────────────────────────────────

test('Follow-up, Kululu Wording, with and without the image', () => {
  const plain = render({
    schedule: schedule({ scheduleTypeKey: 'follow_up' }),
  });
  assert.equal(plain.whatsapp.templateName, 'follow_up_kululu');
  assert.equal(
    plain.message.body,
    'משפחה וחברים יקרים,\nהחתונה של נועה ודורון מתקרבת\nעדיין לא עדכנתם אם תגיעו\n\n📅 יום חמישי, 12 בנובמבר 2026\n📍 אולמי הגן, ראשון לציון\n\nנשמח לדעת אם תגיעו 🙏🏼',
  );
  assert.deepEqual(plain.whatsapp.components.slice(1), quickReplies);
  const image = render({
    schedule: schedule({ scheduleTypeKey: 'follow_up', attachment: 'image' }),
  });
  assert.equal(image.whatsapp.templateName, 'follow_up_kululu_image');
});

test('a Follow-up asked for the video sends no header', () => {
  const result = render({
    schedule: schedule({ scheduleTypeKey: 'follow_up', attachment: 'video' }),
  });
  assert.equal(result.whatsapp.templateName, 'follow_up_kululu');
  assert.equal(result.message.header, null);
});

// ─── Event Reminder ──────────────────────────────────────────────────────────

const reminder = (overrides: Partial<MessagePlanSchedule> = {}) =>
  schedule({ scheduleTypeKey: 'event_reminder', ...overrides });

test('Reminder on the Event day, seated Guest, gift on', () => {
  const { whatsapp, sms, message } = render({
    schedule: reminder({ giftButton: true }),
  });
  assert.equal(
    whatsapp.templateName,
    'event_reminder_kululu_today_tables_gift',
  );
  assert.deepEqual(whatsapp.components, [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: 'החתונה של נועה ודורון מתקיימת היום' },
        { type: 'text', text: 'אולמי הגן, ראשון לציון' },
        { type: 'text', text: '19:30' },
        { type: 'text', text: '12' },
      ],
    },
    {
      type: 'button',
      sub_type: 'url',
      index: 0,
      parameters: [{ type: 'text', text: 'aB3xY9' }],
    },
    {
      type: 'button',
      sub_type: 'url',
      index: 1,
      parameters: [{ type: 'text', text: 'aB3xY9' }],
    },
  ]);
  const body =
    'תזכורת 🎉\nהחתונה של נועה ודורון מתקיימת היום\n\n📍 אולמי הגן, ראשון לציון\n🕐 19:30\n🪑 מספר השולחן שלכם: 12\n\nמחכים לחגוג איתכם ❤️';
  assert.equal(message.body, body);
  assert.equal(
    sms.body,
    `${body}\nלניווט לאירוע: https://kulu-lu.com/nav/aB3xY9\nלשליחת מתנה: https://kulu-lu.com/r/aB3xY9`,
  );
});

test('Reminder on an earlier day names the date; unseated Guest, gift off', () => {
  const { whatsapp, sms, message } = render({
    guest: UNSEATED,
    schedule: reminder({ scheduledFor: DAY_BEFORE_10AM }),
  });
  assert.equal(whatsapp.templateName, 'event_reminder_kululu_dated');
  const body =
    'תזכורת 🎉\nהחתונה של נועה ודורון מתקרבת\n\n📅 יום חמישי, 12 בנובמבר 2026\n📍 אולמי הגן, ראשון לציון\n🕐 19:30\n\nמחכים לחגוג איתכם ❤️';
  assert.equal(message.body, body);
  assert.equal(whatsapp.components.length, 2);
  assert.equal(
    sms.body,
    `${body}\nלניווט לאירוע: https://kulu-lu.com/nav/aB3xY9`,
  );
});

test('the Reminder day is read in Israel: 23:30 UTC the night before is already the Event day', () => {
  const result = render({
    schedule: reminder({ scheduledFor: '2026-11-11T23:30:00.000Z' }),
  });
  assert.equal(
    result.whatsapp.templateName,
    'event_reminder_kululu_today_tables',
  );
});

test('the table line follows the Event\'s "send table numbers" switch', () => {
  const off = weddingEvent({ guestExperience: { sendTableNumbers: false } });
  assert.equal(
    render({ event: off, schedule: reminder() }).whatsapp.templateName,
    'event_reminder_kululu_today',
  );
  assert.equal(
    render({
      event: off,
      schedule: reminder({ scheduledFor: DAY_BEFORE_10AM }),
    }).whatsapp.templateName,
    'event_reminder_kululu_dated',
  );
  assert.equal(
    render({ schedule: reminder({ scheduledFor: DAY_BEFORE_10AM }) }).whatsapp
      .templateName,
    'event_reminder_kululu_dated_tables',
  );
});

test('a stale gift switch: no gift button without a Gifting page, and none when null', () => {
  const noGifting = weddingEvent({
    eventSettings: { bitConfig: { enabled: true, link: '  ' } },
  });
  assert.equal(
    render({ event: noGifting, schedule: reminder({ giftButton: true }) })
      .whatsapp.templateName,
    'event_reminder_kululu_today_tables',
  );
  assert.equal(
    render({ schedule: reminder({ giftButton: null }) }).whatsapp.templateName,
    'event_reminder_kululu_today_tables',
  );
  const thanks = render({
    event: noGifting,
    schedule: schedule({ scheduleTypeKey: 'post_event', giftButton: true }),
  });
  assert.equal(thanks.whatsapp.templateName, 'thank_you_kululu');
  assert.equal(thanks.whatsapp.components.length, 1);
});

// ─── Thank You ───────────────────────────────────────────────────────────────

test('Thank You with and without the gift', () => {
  const off = render({ schedule: schedule({ scheduleTypeKey: 'post_event' }) });
  assert.equal(off.whatsapp.templateName, 'thank_you_kululu');
  const body =
    'תודה ענקית 🙏🏼\nשמחנו מאוד שהגעתם לחתונה של נועה ודורון וחגגתם איתנו\n\nאוהבים ומעריכים ❤️';
  assert.equal(off.message.body, body);
  assert.equal(off.sms.body, body);
  assert.equal(off.message.plainText, body);
  const on = render({
    schedule: schedule({ scheduleTypeKey: 'post_event', giftButton: true }),
  });
  assert.equal(on.whatsapp.templateName, 'thank_you_kululu_gift');
  assert.deepEqual(on.whatsapp.components[1], {
    type: 'button',
    sub_type: 'url',
    index: 0,
    parameters: [{ type: 'text', text: 'aB3xY9' }],
  });
  assert.equal(
    on.sms.body,
    `${body}\nלשליחת מתנה: https://kulu-lu.com/r/aB3xY9`,
  );
});

// ─── Personal Message ────────────────────────────────────────────────────────

test('Personal Message: 1, 2 and 3 paragraphs pick the template and fill one variable each', () => {
  const one = render({
    schedule: schedule({
      scheduleTypeKey: 'invitation',
      wording: 'personal',
      personalText: personal('שלום'),
    }),
  });
  assert.equal(one.whatsapp.templateName, 'invitation_personal_p1');
  assert.equal(
    one.message.body,
    'הזמנה לאירוע 💌\n\nשלום\n\nנשמח לדעת אם תגיעו 👇',
  );

  const two = render({
    schedule: schedule({
      scheduleTypeKey: 'follow_up',
      wording: 'personal',
      attachment: 'image',
      personalText: personal('א', 'ב'),
    }),
  });
  assert.equal(two.whatsapp.templateName, 'follow_up_personal_image_p2');
  assert.equal(
    two.message.body,
    'עדיין מחכים לתשובה 💌\n\nא\n·\nב\n\nנשמח לדעת אם תגיעו 👇',
  );
  assert.deepEqual(two.whatsapp.components[1], {
    type: 'body',
    parameters: [
      { type: 'text', text: 'א' },
      { type: 'text', text: 'ב' },
    ],
  });

  const three = render({
    schedule: schedule({
      scheduleTypeKey: 'post_event',
      wording: 'personal',
      giftButton: true,
      personalText: personal('א', 'ב', 'ג'),
    }),
  });
  assert.equal(three.whatsapp.templateName, 'thank_you_personal_gift_p3');
  assert.equal(
    three.message.body,
    'תודה מכל הלב ❤️\n\nא\n·\nב\n·\nג\n\nלשליחת מתנה 👇',
  );
  assert.equal(
    three.sms.body,
    `${three.message.body}\nלשליחת מתנה: https://kulu-lu.com/r/aB3xY9`,
  );

  const thanksNoGift = render({
    schedule: schedule({
      scheduleTypeKey: 'post_event',
      wording: 'personal',
      personalText: personal('א'),
    }),
  });
  assert.equal(thanksNoGift.message.body, 'תודה מכל הלב ❤️\n\nא\n\n❤️');
});

test('Personal Message fields are filled per Guest', () => {
  const text: PersonalText = {
    paragraphs: [
      [
        { kind: 'text', text: 'היי ' },
        { kind: 'field', field: 'guestName' },
        { kind: 'text', text: ', נתראה ב' },
        { kind: 'field', field: 'eventDate' },
      ],
    ],
  };
  const result = render({
    schedule: schedule({
      scheduleTypeKey: 'invitation',
      wording: 'personal',
      personalText: serialisePersonalText(text),
    }),
  });
  assert.deepEqual(result.message.bodyParameters, [
    'היי דנה לוי, נתראה ביום חמישי, 12 בנובמבר 2026',
  ]);
});

test('a dropped table sentence changes the paragraph count and so the template', () => {
  const text: PersonalText = {
    paragraphs: [
      [{ kind: 'text', text: 'היום זה קורה!' }],
      [
        {
          kind: 'table_sentence',
          segments: [
            { kind: 'text', text: 'השולחן שלכם: ' },
            { kind: 'field', field: 'tableNumber' },
          ],
        },
      ],
      [{ kind: 'text', text: 'רוקדים עד הבוקר!' }],
    ],
  };
  const s = reminder({
    wording: 'personal',
    personalText: serialisePersonalText(text),
  });
  const seated = render({ schedule: s, guest: SEATED });
  assert.equal(seated.whatsapp.templateName, 'event_reminder_personal_p3');
  assert.deepEqual(seated.message.bodyParameters, [
    'היום זה קורה!',
    'השולחן שלכם: 12',
    'רוקדים עד הבוקר!',
  ]);
  const unseated = render({ schedule: s, guest: UNSEATED });
  assert.equal(unseated.whatsapp.templateName, 'event_reminder_personal_p2');
  assert.deepEqual(unseated.message.bodyParameters, [
    'היום זה קורה!',
    'רוקדים עד הבוקר!',
  ]);
  assert.equal(
    unseated.message.body,
    'תזכורת לאירוע 🎉\n\nהיום זה קורה!\n·\nרוקדים עד הבוקר!\n\nלניווט לאירוע 👇',
  );
});

test('a Personal Reminder reads the same on any day', () => {
  const s = (scheduledFor: string) =>
    reminder({
      wording: 'personal',
      personalText: personal('א'),
      scheduledFor,
    });
  assert.equal(
    render({ schedule: s(EVENT_DAY_10AM) }).message.body,
    render({ schedule: s(DAY_BEFORE_10AM) }).message.body,
  );
  assert.equal(
    render({ schedule: s(DAY_BEFORE_10AM) }).whatsapp.templateName,
    'event_reminder_personal_p1',
  );
});

test('a blank Personal Message sends the Kululu Wording', () => {
  for (const personalText of [
    null,
    '',
    personal('   ', '\t'),
    '{"v":1,"p":[[],[" "]]}',
  ]) {
    const result = render({
      schedule: schedule({
        scheduleTypeKey: 'invitation',
        wording: 'personal',
        personalText,
      }),
    });
    assert.equal(
      result.whatsapp.templateName,
      'invitation_kululu',
      String(personalText),
    );
  }
  // Blank for this Guest: only a table sentence, and no table.
  const onlyTable = serialisePersonalText({
    paragraphs: [
      [
        {
          kind: 'table_sentence',
          segments: [{ kind: 'field', field: 'tableNumber' }],
        },
      ],
    ],
  });
  const result = render({
    guest: UNSEATED,
    schedule: reminder({ wording: 'personal', personalText: onlyTable }),
  });
  assert.equal(result.whatsapp.templateName, 'event_reminder_kululu_today');
});

test('a draft kept while the Kululu Wording is chosen is not sent', () => {
  const result = render({
    schedule: schedule({
      scheduleTypeKey: 'invitation',
      wording: 'kululu',
      personalText: personal('טיוטה'),
    }),
  });
  assert.equal(result.whatsapp.templateName, 'invitation_kululu');
});

test('Owner text is cleaned before it becomes a parameter', () => {
  const result = render({
    schedule: schedule({
      scheduleTypeKey: 'invitation',
      wording: 'personal',
      personalText: personal('a {{1}}\tb     c'),
    }),
  });
  assert.deepEqual(result.message.bodyParameters, ['a {1} b c']);
});

// ─── Every shape, against what Meta holds ────────────────────────────────────

function* grid(): Generator<ComposeInput> {
  const texts = [
    null,
    personal('א'),
    personal('א', 'ב'),
    personal('א', 'ב', 'ג'),
  ];
  for (const scheduleTypeKey of [
    'invitation',
    'follow_up',
    'event_reminder',
    'post_event',
  ]) {
    for (const personalText of texts) {
      for (const attachment of ['image', 'video', 'none'] as const) {
        for (const giftButton of [false, true]) {
          for (const guest of [SEATED, UNSEATED]) {
            for (const scheduledFor of [EVENT_DAY_10AM, DAY_BEFORE_10AM]) {
              const ask =
                scheduleTypeKey === 'invitation' ||
                scheduleTypeKey === 'follow_up';
              yield {
                event: weddingEvent(),
                guest,
                links: LINKS,
                confirmationToken: TOKEN,
                schedule: {
                  scheduleTypeKey,
                  wording: personalText ? 'personal' : 'kululu',
                  personalText,
                  attachment: ask ? attachment : null,
                  giftButton: ask ? null : giftButton,
                  scheduledFor,
                },
              };
            }
          }
        }
      }
    }
  }
}

test('every one of the 42 templates is reachable, and each send matches its template exactly', () => {
  const reached = new Set<string>();
  for (const input of grid()) {
    const result = renderMessagePlanPayloads({
      ...input,
      phone: '+972541234567',
    });
    if (!result.ok) assert.fail(describeRefusal(result.refusal));
    const { whatsapp, sms, message } = result;
    reached.add(whatsapp.templateName);

    const template = submittedBody.get(whatsapp.templateName);
    assert.ok(template, `${whatsapp.templateName} is on Meta`);
    const variables = template.match(/\{\{\d+\}\}/g)?.length ?? 0;
    const body = whatsapp.components.find((c) => c.type === 'body');
    assert.equal(
      body?.parameters.length,
      variables,
      `${whatsapp.templateName} parameter count`,
    );
    for (const parameter of body?.parameters ?? []) {
      assert.ok(
        parameter.type === 'text' && parameter.text.trim(),
        'no empty parameter',
      );
      assert.doesNotMatch(
        parameter.type === 'text' ? parameter.text : '',
        /[\n\t]| {2,}/,
      );
    }

    // What the Guest reads on WhatsApp is the template with its parameters in place...
    const filled = template.replace(
      /\{\{(\d+)\}\}/g,
      (_, n) => message.bodyParameters[Number(n) - 1],
    );
    assert.equal(message.body, filled);
    // ...and the SMS says exactly that, then one link line per button.
    assert.ok(
      sms.body.startsWith(`${message.body}\n`) || sms.body === message.body,
    );
    const linkLines = sms.body
      .slice(message.body.length)
      .split('\n')
      .filter(Boolean);
    const urlButtons = message.buttons.filter(
      (b) => b.button.kind === 'url',
    ).length;
    assert.equal(
      linkLines.length,
      message.stage === 'invitation' || message.stage === 'follow_up'
        ? 1
        : urlButtons,
    );
    for (const line of linkLines)
      assert.match(line, /^[^:]+: https:\/\/kulu-lu\.com\//);
  }
  assert.equal(reached.size, 42);
});

// ─── Refusals ────────────────────────────────────────────────────────────────

test('an Ask in Kululu Wording needs the venue, the date and the hosts', () => {
  assert.deepEqual(
    refusal({
      event: weddingEvent({ location: null }),
      schedule: schedule({ scheduleTypeKey: 'invitation' }),
    }),
    {
      reason: 'missing_details',
      details: ['venue'],
    },
  );
  assert.deepEqual(
    refusal({
      event: weddingEvent({
        occasionPhrase: null,
        approachingLine: null,
        eventDate: null,
      }),
      schedule: schedule({ scheduleTypeKey: 'follow_up' }),
    }),
    { reason: 'missing_details', details: ['hosts', 'eventDate'] },
  );
});

test('a Personal Message Ask does not need the venue', () => {
  const result = render({
    event: weddingEvent({ location: null }),
    schedule: schedule({
      scheduleTypeKey: 'invitation',
      wording: 'personal',
      personalText: personal('בואו'),
    }),
  });
  assert.equal(result.whatsapp.templateName, 'invitation_personal_p1');
});

test('a Reminder needs a venue whatever its wording, and the Kululu one a reception time', () => {
  const noVenue = weddingEvent({ location: { name: ' ' } });
  assert.deepEqual(
    refusal({
      event: noVenue,
      schedule: reminder({ wording: 'personal', personalText: personal('א') }),
    }),
    {
      reason: 'missing_details',
      details: ['venue'],
    },
  );
  assert.deepEqual(
    refusal({
      event: weddingEvent({ receptionTime: null }),
      schedule: reminder(),
    }),
    {
      reason: 'missing_details',
      details: ['receptionTime'],
    },
  );
});

test('a Kululu Reminder needs its day', () => {
  assert.deepEqual(refusal({ schedule: reminder({ scheduledFor: null }) }), {
    reason: 'no_due_time',
  });
  assert.deepEqual(
    refusal({ schedule: reminder({ scheduledFor: DAY_AFTER_10AM }) }),
    { reason: 'reminder_after_event' },
  );
  assert.deepEqual(
    refusal({ event: weddingEvent({ eventDate: null }), schedule: reminder() }),
    {
      reason: 'missing_details',
      details: ['eventDate'],
    },
  );
});

test('the Thank You needs the hosts in Kululu Wording', () => {
  assert.deepEqual(
    refusal({
      event: weddingEvent({ occasionPhrase: null }),
      schedule: schedule({ scheduleTypeKey: 'post_event' }),
    }),
    {
      reason: 'missing_details',
      details: ['hosts'],
    },
  );
});

test('URL buttons need a short code and their links; Asks need the RSVP link and a token', () => {
  assert.deepEqual(
    refusal({ event: weddingEvent({ shortCode: null }), schedule: reminder() }),
    { reason: 'no_short_code' },
  );
  assert.deepEqual(
    refusal({
      links: { ...LINKS, gift: null },
      schedule: reminder({ giftButton: true }),
    }),
    {
      reason: 'missing_link',
      link: 'gift',
    },
  );
  assert.deepEqual(
    refusal({
      links: { ...LINKS, rsvp: null },
      schedule: schedule({ scheduleTypeKey: 'invitation' }),
    }),
    {
      reason: 'missing_link',
      link: 'rsvp',
    },
  );
  assert.deepEqual(
    refusal({
      confirmationToken: null,
      schedule: schedule({ scheduleTypeKey: 'invitation' }),
    }),
    {
      reason: 'no_confirmation_token',
    },
  );
  // A Thank You without the gift has no button, so no short code is needed.
  assert.equal(
    render({
      event: weddingEvent({ shortCode: null }),
      schedule: schedule({ scheduleTypeKey: 'post_event' }),
    }).whatsapp.templateName,
    'thank_you_kululu',
  );
});

test('no phone, and a Schedule Type that is not on the plan', () => {
  assert.deepEqual(
    refusal({
      phone: 'abc',
      schedule: schedule({ scheduleTypeKey: 'invitation' }),
    }),
    { reason: 'no_phone' },
  );
  assert.deepEqual(
    refusal({ schedule: schedule({ scheduleTypeKey: 'confirmation' }) }),
    {
      reason: 'not_a_message_plan_stage',
      scheduleTypeKey: 'confirmation',
    },
  );
});

test('the preview composes without a phone or a token', () => {
  const result = composeMessage({
    event: weddingEvent(),
    guest: SEATED,
    links: LINKS,
    confirmationToken: null,
    schedule: schedule({ scheduleTypeKey: 'invitation', attachment: 'image' }),
  });
  assert.ok(result.ok);
  assert.equal(result.message.templateName, 'invitation_kululu_image');
  assert.deepEqual(result.message.header, {
    type: 'image',
    link: 'https://cdn.example.com/invitation.jpg',
  });
});

test('links are built from the site URL, the short code and the token', () => {
  assert.deepEqual(
    buildMessageLinks({
      siteUrl: 'https://kulu-lu.com/',
      shortCode: 'aB3xY9',
      confirmationToken: 'tok123',
    }),
    LINKS,
  );
  assert.deepEqual(
    buildMessageLinks({
      siteUrl: 'https://kulu-lu.com',
      shortCode: ' ',
      confirmationToken: null,
    }),
    {
      rsvp: null,
      navigation: null,
      gift: null,
    },
  );
});

test('a Reminder due after the Event day is refused in either wording', () => {
  const late = { scheduledFor: DAY_AFTER_10AM };
  assert.deepEqual(refusal({ schedule: reminder(late) }), {
    reason: 'reminder_after_event',
  });
  assert.deepEqual(
    refusal({
      schedule: reminder({
        ...late,
        wording: 'personal',
        personalText: personal('א'),
      }),
    }),
    { reason: 'reminder_after_event' },
  );
});

test('a Personal Message Reminder needs no Due Time to be composed', () => {
  const result = composeMessage({
    schedule: reminder({
      scheduledFor: null,
      wording: 'personal',
      personalText: personal('א'),
    }),
    event: weddingEvent(),
    guest: SEATED,
    links: LINKS,
    confirmationToken: TOKEN,
  });
  assert.equal(result.ok, true);
});

test('every refusal reads as one line', () => {
  const refusals: RenderRefusal[] = [
    { reason: 'not_a_message_plan_stage', scheduleTypeKey: 'x' },
    { reason: 'missing_details', details: ['venue'] },
    { reason: 'no_short_code' },
    { reason: 'missing_link', link: 'rsvp' },
    { reason: 'no_confirmation_token' },
    { reason: 'no_due_time' },
    { reason: 'reminder_after_event' },
    { reason: 'no_phone' },
  ];
  for (const r of refusals) assert.doesNotMatch(describeRefusal(r), /\n|\.$/);
});
