import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { missingOccasionPhrase } from './send-payload';
import {
  buildDynamicButtonParameters,
  buildDynamicTemplateParameters,
  type ParameterResolutionContext,
} from './parameter-resolvers';
import { buildTodayLine } from '@/features/events/utils/event-title';
import type { MessageTemplateApp } from '../schemas/message-templates';

describe('buildTodayLine', () => {
  it('takes the article and agrees the verb with the occasion', () => {
    assert.equal(
      buildTodayLine({
        eventTypeKey: 'wedding',
        hostDetails: { bride: { name: 'נועה' }, groom: { name: 'דורון' } },
      }),
      'החתונה של נועה ודורון מתקיימת היום',
    );
    assert.equal(
      buildTodayLine({ eventTypeKey: 'bar_mitzva', hostDetails: { child: { name: 'רועי' } } }),
      'בר המצווה של רועי מתקיים היום',
    );
    assert.equal(
      buildTodayLine({ eventTypeKey: 'bat_mitzva', hostDetails: { child: { name: 'מאיה' } } }),
      'בת המצווה של מאיה מתקיימת היום',
    );
  });

  it('is missing exactly when the Occasion Phrase is', () => {
    assert.equal(buildTodayLine({ eventTypeKey: 'wedding', hostDetails: {} }), null);
    assert.equal(buildTodayLine({ eventTypeKey: 'general', hostDetails: undefined }), null);
  });
});

describe('missingOccasionPhrase', () => {
  it('guards the Event Reminder opening line', () => {
    const reminder = {
      payload: {
        parameters: {
          placeholders: [
            { name: 'event.todayLine', source: 'event.todayLine', transformer: 'none' as const },
          ],
        },
      },
    } as unknown as MessageTemplateApp;
    const without = { event: { todayLine: null } } as unknown as ParameterResolutionContext;
    const withLine = {
      event: { todayLine: 'החתונה של נועה ודורון מתקיימת היום' },
    } as unknown as ParameterResolutionContext;
    assert.match(missingOccasionPhrase(reminder, without) ?? '', /host names/);
    assert.equal(missingOccasionPhrase(reminder, withLine), null);
  });
});

describe('singleLine transformer', () => {
  it('folds a multi-line note onto one line Meta accepts', () => {
    const context = {
      schedule: { customText: '  חניה בחינם\n\nבכניסה   האחורית\tלאולם     ' },
    } as unknown as ParameterResolutionContext;
    const [param] = buildDynamicTemplateParameters(
      [{ name: 'schedule.customText', source: 'schedule.customText', transformer: 'singleLine' }],
      context,
    );
    assert.equal(param.text, 'חניה בחינם בכניסה האחורית לאולם');
  });
});

describe('Event Reminder buttons', () => {
  it('fills both URL buttons with the short code as the suffix', () => {
    const context = { event: { shortCode: 'abc123' } } as unknown as ParameterResolutionContext;
    const buttons = buildDynamicButtonParameters(
      [
        { index: 0, subType: 'url', text: 'ניווט לאירוע', placeholders: [{ source: 'event.shortCode', transformer: 'none' }] },
        { index: 1, subType: 'url', text: 'שליחת מתנה', placeholders: [{ source: 'event.shortCode', transformer: 'none' }] },
      ],
      context,
    );
    assert.deepEqual(
      buttons.map((b) => [b.index, b.sub_type, b.parameters]),
      [
        [0, 'url', [{ type: 'text', text: 'abc123' }]],
        [1, 'url', [{ type: 'text', text: 'abc123' }]],
      ],
    );
  });
});
