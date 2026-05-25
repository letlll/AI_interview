import { describe, it, expect } from 'vitest';
import { formatDateTime } from '@/utils/format';

describe('formatDateTime', () => {
  it('formats a date string with default format', () => {
    const result = formatDateTime('2024-03-15');
    expect(result).toBe('2024-03-15 00:00:00');
  });

  it('formats with custom format', () => {
    const result = formatDateTime('2024-03-15', 'YYYY/MM/DD');
    expect(result).toBe('2024/03/15');
  });

  it('returns placeholder for null input', () => {
    expect(formatDateTime(null)).toBe('N/A');
  });

  it('returns placeholder for undefined input', () => {
    expect(formatDateTime(undefined)).toBe('N/A');
  });

  it('returns custom placeholder when provided', () => {
    const result = formatDateTime(null, 'YYYY-MM-DD', '未知');
    expect(result).toBe('未知');
  });

  it('returns placeholder for invalid date', () => {
    const result = formatDateTime('not-a-date');
    expect(result).toBe('N/A');
  });

  it('handles Date object input', () => {
    const date = new Date('2024-06-01');
    const result = formatDateTime(date, 'YYYY-MM-DD');
    expect(result).toBe('2024-06-01');
  });

  it('formats with time components', () => {
    const result = formatDateTime('2024-12-25 09:30:00', 'HH:mm');
    expect(result).toBe('09:30');
  });
});
