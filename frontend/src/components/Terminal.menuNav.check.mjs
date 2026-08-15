// Self-check for the context-menu arrow-key index math in Terminal.tsx.
// Run: node src/components/Terminal.menuNav.check.mjs
import assert from 'node:assert/strict';

const next = (key, currentIndex, len) =>
  key === 'ArrowDown'
    ? (currentIndex + 1) % len
    : (currentIndex <= 0 ? len : currentIndex) - 1;

// nothing focused (-1)
assert.equal(next('ArrowDown', -1, 2), 0);
assert.equal(next('ArrowUp', -1, 2), 1);
// forward + wrap
assert.equal(next('ArrowDown', 0, 2), 1);
assert.equal(next('ArrowDown', 1, 2), 0);
// backward + wrap
assert.equal(next('ArrowUp', 1, 2), 0);
assert.equal(next('ArrowUp', 0, 2), 1);
// single item stays put
assert.equal(next('ArrowDown', 0, 1), 0);
assert.equal(next('ArrowUp', 0, 1), 0);

console.log('menuNav index math OK');
