import { describe, expect, it, vi } from 'vitest';

import { importData } from '../dataTransfer';

// mock shareFile to prevent actual file sharing in tests
vi.mock('../share', () => ({
  shareFile: vi.fn(() => Promise.resolve({ success: true })),
}));

describe('importData', () => {
  it('parses a v1 backup without groups', () => {
    const json = JSON.stringify({
      version: 1,
      habits: [],
      completions: [],
    });
    const result = importData(json);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.groups).toEqual([]);
    }
  });

  it('parses a v2 backup with groups', () => {
    const json = JSON.stringify({
      version: 2,
      habits: [],
      completions: [],
      groups: [{ id: 'g1', name: '📁 Health', sortOrder: 0 }],
    });
    const result = importData(json);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].name).toBe('📁 Health');
    }
  });

  it('rejects invalid JSON', () => {
    const result = importData('not json');
    expect(result.success).toBe(false);
  });
});
