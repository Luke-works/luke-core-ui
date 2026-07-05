import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the shared axios client so we can assert which endpoints get hit and with
// what params, without a real engine. vi.hoisted keeps `get` available inside the
// hoisted vi.mock factory.
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ api: { get } }));

import {
  getExternalTaskLifecycleCounts,
  getExternalTaskTopics,
  TOPIC_SAMPLE_CAP,
} from './endpoints';

beforeEach(() => get.mockReset());

describe('getExternalTaskLifecycleCounts (#33 — server counts, not capped)', () => {
  it('derives available = notLocked - failed and uses /external-task/count', async () => {
    // total=100, locked=30, failed=10, notLocked=70 → available = 70 - 10 = 60
    const byParams = { total: 100, locked: 30, failed: 10, notLocked: 70 };
    get.mockImplementation((_url: unknown, cfg?: { params?: Record<string, unknown> }) => {
      const p = cfg?.params;
      let count = byParams.total;
      if (p?.locked) count = byParams.locked;
      else if (p?.withException) count = byParams.failed;
      else if (p?.notLocked) count = byParams.notLocked;
      return Promise.resolve({ data: { count } });
    });

    const c = await getExternalTaskLifecycleCounts();
    expect(c).toEqual({ total: 100, locked: 30, failed: 10, available: 60 });
    // 4 independent count calls against the count endpoint — never lists tasks.
    expect(get).toHaveBeenCalledTimes(4);
    for (const call of get.mock.calls) {
      expect(call[0]).toBe('/external-task/count');
    }
  });

  it('never returns a negative available count', async () => {
    get.mockResolvedValue({ data: { count: 5 } }); // notLocked==failed==5
    const c = await getExternalTaskLifecycleCounts();
    expect(c.available).toBe(0);
  });
});

describe('getExternalTaskTopics (enumeration sample)', () => {
  it('groups tasks by topic and classifies state', async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    get.mockResolvedValue({
      data: [
        { topicName: 'email', errorMessage: null, lockExpirationTime: null },
        { topicName: 'email', errorMessage: 'boom', lockExpirationTime: null },
        { topicName: 'sms', errorMessage: null, lockExpirationTime: future },
      ],
    });

    const topics = await getExternalTaskTopics();
    // sorted by count desc → email(2) before sms(1)
    expect(topics.map((t) => t.topicName)).toEqual(['email', 'sms']);
    const email = topics.find((t) => t.topicName === 'email')!;
    expect(email).toMatchObject({ count: 2, failed: 1, available: 1, locked: 0 });
    const sms = topics.find((t) => t.topicName === 'sms')!;
    expect(sms).toMatchObject({ count: 1, locked: 1, available: 0 });
    // enumeration is capped by the documented sample size
    expect(get).toHaveBeenCalledWith('/external-task', { params: { maxResults: TOPIC_SAMPLE_CAP } });
  });
});
