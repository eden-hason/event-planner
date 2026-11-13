import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUBMITTED_META_TEMPLATES } from './meta-templates.fixture';
import {
  HEADER_HANDLE_PLACEHOLDERS,
  messagePlanMetaTemplates,
  metaCategoryFor,
  metaTemplatePayload,
  type MetaTemplatePayload,
} from './meta-templates';
import { allShapes, templateNameFor } from './shape';

const submitted = new Map(
  SUBMITTED_META_TEMPLATES.map((t) => [t.payload.name, t]),
);
const built = messagePlanMetaTemplates();

const body = (t: MetaTemplatePayload) =>
  t.components.find((c) => c.type === 'BODY');
const header = (t: MetaTemplatePayload) =>
  t.components.find((c) => c.type === 'HEADER');
const buttons = (t: MetaTemplatePayload) =>
  t.components.find((c) => c.type === 'BUTTONS');
const variableCount = (text: string) => text.match(/\{\{\d+\}\}/g)?.length ?? 0;

test('there are exactly 42 templates, the same 42 names as were submitted', () => {
  assert.equal(built.length, 42);
  assert.equal(SUBMITTED_META_TEMPLATES.length, 42);
  assert.deepEqual(
    built.map((t) => t.name).sort(),
    [...submitted.keys()].sort(),
  );
});

for (const template of built) {
  test(`${template.name} matches what was submitted`, () => {
    const expected = submitted.get(template.name)?.payload;
    assert.ok(expected, 'submitted');
    const builtBody = body(template);
    const expectedBody = body(expected);
    assert.ok(builtBody?.type === 'BODY' && expectedBody?.type === 'BODY');
    assert.equal(builtBody.text, expectedBody.text, 'body text');
    assert.equal(
      variableCount(builtBody.text),
      variableCount(expectedBody.text),
      'variable count',
    );
    assert.equal(
      builtBody.example.body_text[0].length,
      variableCount(builtBody.text),
      'one sample per variable',
    );
    assert.deepEqual(header(template), header(expected), 'header');
    assert.deepEqual(buttons(template), buttons(expected), 'buttons');
    assert.equal(template.category, expected.category, 'submitted category');
    assert.equal(template.language, 'he');
    // Everything else too: samples and component order, byte for byte.
    assert.deepEqual(template, expected);
  });
}

test('every shape maps to a submitted template and every template has a shape', () => {
  const names = new Set(allShapes().map(templateNameFor));
  for (const name of submitted.keys())
    assert.ok(names.has(name), `${name} has a shape`);
  for (const name of names)
    assert.ok(submitted.has(name), `${name} was submitted`);
});

test('the category Meta gave is recorded per template', () => {
  for (const shape of allShapes()) {
    const record = submitted.get(templateNameFor(shape));
    assert.equal(
      metaCategoryFor(shape),
      record?.metaCategory,
      templateNameFor(shape),
    );
  }
});

test('header handles are passed in for a real submission', () => {
  const payload = metaTemplatePayload(
    { stage: 'invitation', wording: 'kululu', attachment: 'video' },
    { image: 'img-handle', video: 'vid-handle' },
  );
  assert.deepEqual(header(payload), {
    type: 'HEADER',
    format: 'VIDEO',
    example: { header_handle: ['vid-handle'] },
  });
  assert.equal(HEADER_HANDLE_PLACEHOLDERS.video, '@@VIDEO@@');
});
