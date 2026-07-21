import { Topic, PluginData, DEFAULT_DATA, getToday, addDays, isOverdue } from './data';
import { calculateNextInterval } from './algorithm';

// Mock test for pure functions
describe('Data module', () => {
  it('should return correct today date', () => {
    const today = getToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should add days correctly', () => {
    expect(addDays('2023-01-01', 5)).toBe('2023-01-06');
    expect(addDays('2023-01-30', 2)).toBe('2023-02-01'); // Month rollover
  });

  it('should detect overdue topics', () => {
    expect(isOverdue('2023-01-01', '2023-01-02')).toBe(true);
    expect(isOverdue('2023-01-02', '2023-01-01')).toBe(false);
    expect(isOverdue('2023-01-01', '2023-01-01')).toBe(false);
  });
});

describe('Algorithm module', () => {
  it('should calculate new interval based on SM-2 logic', () => {
    const res1 = calculateNextInterval(4, 0, 2.5); // Initial correct
    expect(res1.interval).toBe(1);
    expect(res1.easeFactor).toBe(2.5); // (4-4 = 0, so no change)

    const res2 = calculateNextInterval(4, 1, 2.5); // Second correct
    expect(res2.interval).toBe(6);

    const res3 = calculateNextInterval(4, 6, 2.5); // Third correct
    expect(res3.interval).toBe(15); // 6 * 2.5
  });

  it('should reset interval on failed recall (quality < 3)', () => {
    const res = calculateNextInterval(2, 10, 2.5);
    expect(res.interval).toBe(1);
    expect(res.easeFactor).toBeLessThan(2.5);
  });
});
