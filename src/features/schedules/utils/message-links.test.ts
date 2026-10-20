import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { splitMessageLinks } from './message-links.ts';

test('a URL between words becomes a link, the words stay text', () => {
  assert.deepEqual(
    splitMessageLinks('ותתייגו! https://www.instagram.com/julialeer_wedding חניון'),
    [
      { kind: 'text', text: 'ותתייגו! ' },
      {
        kind: 'link',
        text: 'https://www.instagram.com/julialeer_wedding',
        href: 'https://www.instagram.com/julialeer_wedding',
      },
      { kind: 'text', text: ' חניון' },
    ],
  );
});

test('punctuation closing the sentence stays outside the link', () => {
  assert.deepEqual(splitMessageLinks('אלבום: https://x.com/a!'), [
    { kind: 'text', text: 'אלבום: ' },
    { kind: 'link', text: 'https://x.com/a', href: 'https://x.com/a' },
    { kind: 'text', text: '!' },
  ]);
});

test('a www. address links over https', () => {
  assert.deepEqual(splitMessageLinks('www.kululu.co.il'), [
    { kind: 'link', text: 'www.kululu.co.il', href: 'https://www.kululu.co.il' },
  ]);
});

test('text without a URL is one text segment, and empty text none', () => {
  assert.deepEqual(splitMessageLinks('חניה חינם במקום'), [
    { kind: 'text', text: 'חניה חינם במקום' },
  ]);
  assert.deepEqual(splitMessageLinks(''), []);
});

test('a bare scheme is not a link', () => {
  assert.deepEqual(splitMessageLinks('https:// בלבד'), [
    { kind: 'text', text: 'https:// בלבד' },
  ]);
});
