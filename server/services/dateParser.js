/**
 * Date Parser Service for LabelLens
 * Extracts dates, shelf-life instructions, and after-opening periods from OCR text.
 * Strictly preserves precision ('day', 'month', 'year') and detects ambiguity (e.g. 03/04/2026).
 */

const MONTH_NAMES = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

const MFG_KEYWORDS = ['mfg', 'mfd', 'manuf', 'manufactured', 'production', 'prod', 'pkd', 'packed', 'batch'];
const EXP_KEYWORDS = ['exp', 'exd', 'expiry', 'expires', 'expire', 'use by', 'best before', 'bbe', 'bb', 'val', 'validity'];

/**
 * Returns number of days in month (handles leap years)
 */
export function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Helper to normalize year string to 4-digit number
 */
function normalizeYear(yearStr) {
  const y = parseInt(yearStr, 10);
  if (yearStr.length === 2) {
    // 2000-2049 for 00-49, 1950-1999 for 50-99
    return y < 50 ? 2000 + y : 1900 + y;
  }
  return y;
}

/**
 * Check if a snippet of text surrounding the match contains target keywords
 */
function getContextKeywords(text, matchIndex, matchLength, windowSize = 40) {
  const precedingStart = Math.max(0, matchIndex - windowSize);
  const precedingText = text.substring(precedingStart, matchIndex).toLowerCase();
  
  const followingEnd = Math.min(text.length, matchIndex + matchLength + windowSize);
  const followingText = text.substring(matchIndex + matchLength, followingEnd).toLowerCase();

  // Find closest keyword preceding the date (e.g. "MFG: 2024-05-10")
  let closestMfgDist = Infinity;
  let closestExpDist = Infinity;

  MFG_KEYWORDS.forEach(k => {
    const idx = precedingText.lastIndexOf(k);
    if (idx !== -1) {
      closestMfgDist = Math.min(closestMfgDist, precedingText.length - idx);
    }
  });

  EXP_KEYWORDS.forEach(k => {
    const idx = precedingText.lastIndexOf(k);
    if (idx !== -1) {
      closestExpDist = Math.min(closestExpDist, precedingText.length - idx);
    }
  });

  // If not found in preceding, check following (e.g. "2024-05-10 (MFD)")
  if (closestMfgDist === Infinity) {
    MFG_KEYWORDS.forEach(k => {
      const idx = followingText.indexOf(k);
      if (idx !== -1) closestMfgDist = Math.min(closestMfgDist, 50 + idx);
    });
  }
  if (closestExpDist === Infinity) {
    EXP_KEYWORDS.forEach(k => {
      const idx = followingText.indexOf(k);
      if (idx !== -1) closestExpDist = Math.min(closestExpDist, 50 + idx);
    });
  }

  const isMfg = closestMfgDist < closestExpDist && closestMfgDist !== Infinity;
  const isExp = closestExpDist < closestMfgDist && closestExpDist !== Infinity;
  const contextSnippet = text.substring(precedingStart, followingEnd);

  return { contextSnippet, isMfg, isExp };
}

/**
 * Parse an explicit shelf life phrase
 * e.g., "best before 24 months from manufacture", "shelf life 12 months", "use within 6 months"
 */
export function parseShelfLife(text) {
  const shelfLifeRegex = /(?:best\s+before|shelf\s*life|use\s+within)\s*(?:of|is|:)?\s*(\d{1,2})\s*(months|month|m|years|year|y|days|day|d)/i;
  const match = text.match(shelfLifeRegex);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    let months = value;
    if (unit.startsWith('year') || unit === 'y') {
      months = value * 12;
    } else if (unit.startsWith('day') || unit === 'd') {
      months = Math.round(value / 30);
    }
    return {
      raw: match[0],
      months: months,
      unit: unit,
      value: value
    };
  }
  return null;
}

/**
 * Parse Period After Opening (PAO)
 * e.g. "12M", "6M", "24 M", "use within 6 months of opening"
 */
export function parsePAO(text) {
  // Check for PAO jar icon standard text like "12M", "6M", "24M" or explicit phrase
  const paoExplicitRegex = /(?:after\s+opening|once\s+opened)\s*(?:use\s+within)?\s*(\d{1,2})\s*(months|month|m|days|day)/i;
  const explicitMatch = text.match(paoExplicitRegex);
  if (explicitMatch) {
    const val = parseInt(explicitMatch[1], 10);
    return {
      raw: explicitMatch[0],
      months: explicitMatch[2].toLowerCase().startsWith('d') ? Math.max(1, Math.round(val / 30)) : val
    };
  }

  const paoSymbolRegex = /\b(\d{1,2})\s*M\b/gi;
  const matches = [...text.matchAll(paoSymbolRegex)];
  for (const match of matches) {
    const val = parseInt(match[1], 10);
    // Typical cosmetic PAO is between 3M and 36M
    if ([3, 6, 9, 12, 18, 24, 36].includes(val)) {
      return {
        raw: match[0],
        months: val
      };
    }
  }

  return null;
}

/**
 * Main Date Extraction Pipeline
 */
export function extractDateCandidates(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  const candidates = [];
  const text = rawText.replace(/\r\n/g, '\n');

  // 1. Text Month Formats: e.g. "15 OCT 2026", "OCT 15, 2026", "OCT 2026", "15-OCT-26"
  const monthNameKeys = Object.keys(MONTH_NAMES).join('|');
  const textMonthRegex = new RegExp(
    `\\b(?:(\\d{1,2})[\\s/.-]+)?(${monthNameKeys})[\\s/.-]+(?:(\\d{1,2})[\\s/.-]+)?(\\d{2,4})\\b`,
    'gi'
  );

  let match;
  while ((match = textMonthRegex.exec(text)) !== null) {
    const rawMatch = match[0];
    const matchIndex = match.index;
    const part1 = match[1]; // optional day before month
    const monthStr = match[2].toLowerCase();
    const part3 = match[3]; // optional day after month
    const yearStr = match[4];

    const month = MONTH_NAMES[monthStr];
    const year = normalizeYear(yearStr);
    const dayStr = part1 || part3;
    const day = dayStr ? parseInt(dayStr, 10) : null;

    if (year >= 1990 && year <= 2045) {
      const precision = day ? 'day' : 'month';
      const daysInMonth = getDaysInMonth(year, month);
      const validDay = day ? Math.min(Math.max(1, day), daysInMonth) : 1;
      const parsedDate = new Date(Date.UTC(year, month - 1, validDay));

      const { contextSnippet, isMfg, isExp } = getContextKeywords(text, matchIndex, rawMatch.length);
      let detectedType = 'unknown';
      if (isMfg && !isExp) detectedType = 'mfg';
      else if (isExp) detectedType = 'exp';

      candidates.push({
        rawText: rawMatch,
        parsedDate,
        year,
        month,
        day: day || null,
        precision,
        type: detectedType,
        isAmbiguous: false,
        confidence: day ? 0.9 : 0.85,
        context: contextSnippet
      });
    }
  }

  // 2. ISO format YYYY-MM-DD or YYYY/MM/DD
  const isoRegex = /\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/g;
  while ((match = isoRegex.exec(text)) !== null) {
    const rawMatch = match[0];
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    const { contextSnippet, isMfg, isExp } = getContextKeywords(text, match.index, rawMatch.length);

    candidates.push({
      rawText: rawMatch,
      parsedDate: new Date(Date.UTC(year, month - 1, day)),
      year,
      month,
      day,
      precision: 'day',
      type: isMfg && !isExp ? 'mfg' : (isExp ? 'exp' : 'unknown'),
      isAmbiguous: false,
      confidence: 0.95,
      context: contextSnippet
    });
  }

  // 3. Numeric formats: DD/MM/YYYY or MM/DD/YYYY or DD/MM/YY
  const numericSlashRegex = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/g;
  while ((match = numericSlashRegex.exec(text)) !== null) {
    const rawMatch = match[0];
    // Avoid re-matching ISO if already caught
    if (match[1].length === 4) continue;

    const firstNum = parseInt(match[1], 10);
    const secondNum = parseInt(match[2], 10);
    const year = normalizeYear(match[3]);

    if (year >= 1990 && year <= 2045) {
      const { contextSnippet, isMfg, isExp } = getContextKeywords(text, match.index, rawMatch.length);
      let detectedType = isMfg && !isExp ? 'mfg' : (isExp ? 'exp' : 'unknown');

      // Ambiguity analysis:
      // If firstNum <= 12 and secondNum <= 12 and firstNum !== secondNum,
      // it could be DD/MM/YYYY or MM/DD/YYYY!
      const isAmbiguous = (firstNum <= 12 && secondNum <= 12 && firstNum !== secondNum);

      let day, month;
      if (firstNum > 12 && secondNum <= 12) {
        // Definitely DD/MM/YYYY
        day = firstNum;
        month = secondNum;
      } else if (firstNum <= 12 && secondNum > 12) {
        // Definitely MM/DD/YYYY
        month = firstNum;
        day = secondNum;
      } else {
        // Ambiguous or equal (e.g., 05/05)
        // Default international convention: DD/MM/YYYY, but flag as ambiguous if different
        day = firstNum;
        month = secondNum;
      }

      if (month >= 1 && month <= 12) {
        const daysInMonth = getDaysInMonth(year, month);
        if (day <= daysInMonth) {
          const parsedDate = new Date(Date.UTC(year, month - 1, day));
          candidates.push({
            rawText: rawMatch,
            parsedDate,
            year,
            month,
            day,
            precision: 'day',
            type: detectedType,
            isAmbiguous,
            ambiguousOptions: isAmbiguous ? [
              {
                interpretation: 'DD/MM/YYYY',
                day: firstNum,
                month: secondNum,
                year,
                date: new Date(Date.UTC(year, secondNum - 1, firstNum))
              },
              {
                interpretation: 'MM/DD/YYYY',
                day: secondNum,
                month: firstNum,
                year,
                date: new Date(Date.UTC(year, firstNum - 1, secondNum))
              }
            ] : null,
            confidence: isAmbiguous ? 0.65 : 0.88,
            context: contextSnippet
          });
        }
      }
    }
  }

  // 4. Month & Year only: MM/YYYY or MM/YY (e.g., "10/2026", "05/27")
  const monthYearRegex = /\b(0[1-9]|1[0-2])[-/.](20\d{2}|\d{2})\b/g;
  while ((match = monthYearRegex.exec(text)) !== null) {
    const rawMatch = match[0];
    const matchIndex = match.index;
    
    // Check if this was already part of a 3-part date (e.g. 15/10/2026)
    const prevChar = text[matchIndex - 1];
    if (prevChar === '/' || prevChar === '-' || prevChar === '.') {
      continue;
    }

    const month = parseInt(match[1], 10);
    const year = normalizeYear(match[2]);

    if (year >= 1990 && year <= 2045) {
      // Avoid duplicate if already found in candidates
      const alreadyCaptured = candidates.some(c => 
        c.rawText.includes(rawMatch) || rawMatch.includes(c.rawText)
      );
      if (!alreadyCaptured) {
        const { contextSnippet, isMfg, isExp } = getContextKeywords(text, matchIndex, rawMatch.length);
        // By standard policy, month precision points to the last day of that month for expiry comparison
        const lastDay = getDaysInMonth(year, month);
        const parsedDate = new Date(Date.UTC(year, month - 1, lastDay));

        candidates.push({
          rawText: rawMatch,
          parsedDate,
          year,
          month,
          day: null,
          precision: 'month',
          type: isMfg && !isExp ? 'mfg' : (isExp ? 'exp' : 'unknown'),
          isAmbiguous: false,
          confidence: 0.8,
          context: contextSnippet
        });
      }
    }
  }

  // Deduplicate overlapping candidates
  const uniqueCandidates = [];
  const seenKeys = new Set();
  for (const c of candidates) {
    const key = `${c.parsedDate.toISOString()}_${c.precision}_${c.rawText}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueCandidates.push(c);
    }
  }

  return uniqueCandidates;
}
