const test = require('node:test');
const assert = require('node:assert/strict');
const validators = require('../src/validators/common');

test('common validators exposes cart and order status validators', () => {
  assert.ok(Array.isArray(validators.validateCartItemUpdate));
  assert.ok(Array.isArray(validators.validateOrderStatus));
});
