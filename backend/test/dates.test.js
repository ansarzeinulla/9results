import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endOfDay } from '../src/shared/dates.js';

test('endOfDay extends a bare date to the end of that day', () => {
  assert.equal(endOfDay('2026-07-16'), '2026-07-16T23:59:59.999');
});

test('endOfDay leaves full timestamps untouched', () => {
  assert.equal(endOfDay('2026-07-16T10:00:00Z'), '2026-07-16T10:00:00Z');
});

test('endOfDay leaves non-date strings untouched', () => {
  assert.equal(endOfDay('garbage'), 'garbage');
});
