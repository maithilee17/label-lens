import {
  extractDateCandidates,
  parseShelfLife,
  parsePAO,
  getDaysInMonth
} from '../services/dateParser.js';

describe('Date Parser Service', () => {
  test('correctly calculates days in month including leap years', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29); // Leap year
    expect(getDaysInMonth(2023, 2)).toBe(28); // Non-leap year
    expect(getDaysInMonth(2026, 10)).toBe(31);
    expect(getDaysInMonth(2026, 4)).toBe(30);
  });

  test('extracts ISO dates YYYY-MM-DD', () => {
    const text = 'Item MFG: 2024-05-10 EXP: 2026-10-25 Batch #491';
    const candidates = extractDateCandidates(text);
    expect(candidates.length).toBe(2);

    const mfg = candidates.find(c => c.type === 'mfg');
    const exp = candidates.find(c => c.type === 'exp');

    expect(mfg).toBeDefined();
    expect(mfg.year).toBe(2024);
    expect(mfg.month).toBe(5);
    expect(mfg.day).toBe(10);
    expect(mfg.precision).toBe('day');

    expect(exp).toBeDefined();
    expect(exp.year).toBe(2026);
    expect(exp.month).toBe(10);
    expect(exp.day).toBe(25);
    expect(exp.precision).toBe('day');
  });

  test('extracts named month formats: 15 OCT 2026 and OCT 2026', () => {
    const text = 'BEST BEFORE: 15 OCT 2026';
    const candidates = extractDateCandidates(text);
    expect(candidates.length).toBeGreaterThanOrEqual(1);

    const exp = candidates[0];
    expect(exp.month).toBe(10);
    expect(exp.day).toBe(15);
    expect(exp.year).toBe(2026);
    expect(exp.precision).toBe('day');
  });

  test('detects ambiguous dates such as 03/04/2026', () => {
    const text = 'EXP 03/04/2026';
    const candidates = extractDateCandidates(text);
    expect(candidates.length).toBe(1);
    expect(candidates[0].isAmbiguous).toBe(true);
    expect(candidates[0].ambiguousOptions).toBeDefined();
    expect(candidates[0].ambiguousOptions.length).toBe(2);
    expect(candidates[0].ambiguousOptions[0].interpretation).toBe('DD/MM/YYYY');
    expect(candidates[0].ambiguousOptions[1].interpretation).toBe('MM/DD/YYYY');
  });

  test('correctly identifies unambiguous dates such as 25/08/2026', () => {
    const text = 'EXPIRY: 25/08/2026';
    const candidates = extractDateCandidates(text);
    expect(candidates.length).toBe(1);
    expect(candidates[0].isAmbiguous).toBe(false);
    expect(candidates[0].day).toBe(25);
    expect(candidates[0].month).toBe(8);
    expect(candidates[0].year).toBe(2026);
  });

  test('extracts month-only dates MM/YYYY and assigns month precision', () => {
    const text = 'EXP: 10/2026';
    const candidates = extractDateCandidates(text);
    expect(candidates.length).toBe(1);
    expect(candidates[0].precision).toBe('month');
    expect(candidates[0].month).toBe(10);
    expect(candidates[0].year).toBe(2026);
    expect(candidates[0].day).toBeNull();
  });

  test('parses explicit shelf-life phrases', () => {
    const text1 = 'Best before 24 months from manufacture date';
    const res1 = parseShelfLife(text1);
    expect(res1).not.toBeNull();
    expect(res1.months).toBe(24);

    const text2 = 'Shelf life: 12 months';
    const res2 = parseShelfLife(text2);
    expect(res2).not.toBeNull();
    expect(res2.months).toBe(12);

    const text3 = 'Use within 2 years of packing';
    const res3 = parseShelfLife(text3);
    expect(res3).not.toBeNull();
    expect(res3.months).toBe(24);
  });

  test('parses Period After Opening (PAO) notations', () => {
    const text1 = 'Storage: Store at 25C. 12M';
    const res1 = parsePAO(text1);
    expect(res1).not.toBeNull();
    expect(res1.months).toBe(12);

    const text2 = 'Once opened use within 6 months.';
    const res2 = parsePAO(text2);
    expect(res2).not.toBeNull();
    expect(res2.months).toBe(6);
  });
});
