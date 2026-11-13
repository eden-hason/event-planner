import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allShapes,
  isAskStage,
  stageOfScheduleType,
  templateNameFor,
  type MessageShape,
} from './shape';

test('every shape has its own template name, 42 in all', () => {
  const names = allShapes().map(templateNameFor);
  assert.equal(names.length, 42);
  assert.equal(new Set(names).size, 42);
});

test('the name follows {stage}_{wording}[_header][_day][_tables][_gift][_p{n}]', () => {
  const cases: [MessageShape, string][] = [
    [
      { stage: 'invitation', wording: 'kululu', attachment: 'none' },
      'invitation_kululu',
    ],
    [
      { stage: 'invitation', wording: 'kululu', attachment: 'video' },
      'invitation_kululu_video',
    ],
    [
      {
        stage: 'invitation',
        wording: 'personal',
        attachment: 'image',
        paragraphs: 2,
      },
      'invitation_personal_image_p2',
    ],
    [
      { stage: 'follow_up', wording: 'kululu', attachment: 'image' },
      'follow_up_kululu_image',
    ],
    [
      {
        stage: 'follow_up',
        wording: 'personal',
        attachment: 'none',
        paragraphs: 1,
      },
      'follow_up_personal_p1',
    ],
    [
      {
        stage: 'event_reminder',
        wording: 'kululu',
        day: 'today',
        table: false,
        gift: false,
      },
      'event_reminder_kululu_today',
    ],
    [
      {
        stage: 'event_reminder',
        wording: 'kululu',
        day: 'dated',
        table: true,
        gift: true,
      },
      'event_reminder_kululu_dated_tables_gift',
    ],
    [
      {
        stage: 'event_reminder',
        wording: 'personal',
        gift: true,
        paragraphs: 3,
      },
      'event_reminder_personal_gift_p3',
    ],
    [
      { stage: 'thank_you', wording: 'kululu', gift: true },
      'thank_you_kululu_gift',
    ],
    [
      { stage: 'thank_you', wording: 'personal', gift: false, paragraphs: 2 },
      'thank_you_personal_p2',
    ],
  ];
  for (const [shape, name] of cases) assert.equal(templateNameFor(shape), name);
});

test('impossible shapes do not type-check', () => {
  // Each directive sits on the line of the property that cannot exist.
  const video: MessageShape = {
    stage: 'follow_up',
    wording: 'kululu',
    // @ts-expect-error a Follow-up never carries the video
    attachment: 'video',
  };
  const day: MessageShape = {
    stage: 'event_reminder',
    wording: 'personal',
    gift: false,
    paragraphs: 1,
    // @ts-expect-error a Personal Message Reminder has no day axis
    day: 'today',
  };
  const paragraphs: MessageShape = {
    stage: 'thank_you',
    wording: 'kululu',
    gift: false,
    // @ts-expect-error a Kululu Wording has no paragraph count
    paragraphs: 1,
  };
  const four: MessageShape = {
    stage: 'invitation',
    wording: 'personal',
    attachment: 'none',
    // @ts-expect-error there is no fourth paragraph
    paragraphs: 4,
  };
  const attached: MessageShape = {
    stage: 'thank_you',
    wording: 'kululu',
    gift: false,
    // @ts-expect-error the Thank You has no attachment
    attachment: 'image',
  };
  assert.ok([video, day, paragraphs, four, attached]);
});

test('Schedule Type keys map to stages, the Thank You under post_event', () => {
  assert.equal(stageOfScheduleType('invitation'), 'invitation');
  assert.equal(stageOfScheduleType('follow_up'), 'follow_up');
  assert.equal(stageOfScheduleType('event_reminder'), 'event_reminder');
  assert.equal(stageOfScheduleType('post_event'), 'thank_you');
  assert.equal(stageOfScheduleType('confirmation'), null);
  assert.equal(stageOfScheduleType('thank_you'), null);
  assert.equal(isAskStage('follow_up'), true);
  assert.equal(isAskStage('event_reminder'), false);
});
