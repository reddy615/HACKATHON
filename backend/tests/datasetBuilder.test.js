const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPriorUserStats, deriveLabelFromOrders } = require('../src/ai/services/datasetBuilderService');

test('buildPriorUserStats excludes the current session from historical counts', () => {
  const currentSession = {
    startedAt: '2024-02-01T10:30:00.000Z',
    endedAt: '2024-02-01T10:45:00.000Z',
  };

  const userOrders = [
    { createdAt: '2024-01-31T09:00:00.000Z', status: 'paid' },
    { createdAt: '2024-02-01T10:30:00.000Z', status: 'paid' },
  ];

  const userSessions = [
    {
      startedAt: '2024-01-15T09:00:00.000Z',
      endedAt: '2024-01-15T09:05:00.000Z',
      ordersInWindow: [{ status: 'pending' }],
    },
    {
      startedAt: '2024-02-01T10:30:00.000Z',
      endedAt: '2024-02-01T10:45:00.000Z',
      ordersInWindow: [{ status: 'paid' }],
    },
  ];

  const stats = buildPriorUserStats(currentSession, userOrders, userSessions);

  assert.equal(stats.previousOrders, 1);
  assert.equal(stats.previousAbandonments, 1);
});

test('deriveLabelFromOrders labels successful orders as purchase events', () => {
  assert.equal(deriveLabelFromOrders([{ status: 'paid' }]), 1);
  assert.equal(deriveLabelFromOrders([{ status: 'pending' }]), 0);
  assert.equal(deriveLabelFromOrders([], []), 0);
});
