/**
 * Date Parser & Label Field Extraction Service for LabelLens
 * Extracts manufacturing dates (MFG), expiry dates (EXP), shelf-life durations,
 * period after opening (PAO), storage instructions, categories, and clean brand/product names.
 *
 * Adheres strictly to:
 * - Never fabricating missing text, dates, or precision.
 * - Preserving partial date precision ('day', 'month', 'year').
 * - Detecting ambiguity (e.g. 03/04/2026) and presenting options.
 * - Distinguishing manufacturing dates from expiry dates regardless of order.
 * - Disregarding batch numbers, barcodes, net weights, and noise.
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

// Manufacturing keywords
const MFG_KEYWORDS = [
  'manufacturing date', 'manufactured date', 'manufactured', 'manufacturing',
  'date of mfg', 'date of manufacture', 'date of pkg', 'date of packing',
  'mfg date', 'mfd date', 'mfg.date', 'mfd.date',
  'production date', 'prod date', 'packing date', 'pack date',
  'mfg.', 'mfd.', 'dom.', 'dom', 'mfg', 'mfd', 'pkd', 'packed', 'prod'
];

// Expiry keywords
const EXP_KEYWORDS = [
  'expiry date', 'expiration date', 'expires on', 'expires', 'expire',
  'best before date', 'best before', 'use by date', 'use by', 'use before',
  'best by', 'expiry', 'exp date', 'exp.date', 'exd.date',
  'bbe date', 'bb date', 'valid thru', 'valid through', 'validity',
  'exp.', 'exd.', 'bbe.', 'bb.', 'val.', 'exp', 'exd', 'bbe', 'val'
];

// Batch / Lot keywords to isolate and prevent confusing with dates or MFG
const BATCH_KEYWORDS = [
  'batch no', 'batch number', 'batch #', 'batch',
  'lot no', 'lot number', 'lot #', 'lot',
  'b.no', 'b. no', 'b/no', 'bno', 'bn.'
];

/**
 * Returns number of days in month (handles leap years).
 */
export function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Normalizes year string to 4-digit integer.
 */
export function normalizeYear(yearStr) {
  const y = parseInt(yearStr, 10);
  if (yearStr.length === 2) {
    // 2000-2049 for 00-49, 1970-1999 for 50-99
    return y < 50 ? 2000 + y : 1900 + y;
  }
  return y;
}

/**
 * Analyzes proximity to keywords on the same line, preceding line, and local window.
 */
function analyzeDateContext(fullText, lineIndex, lines, matchIndex, matchLength) {
  const currentLine = lines[lineIndex] || '';
  const currentLineLower = currentLine.toLowerCase();

  // 1. Check same-line keywords
  let hasMfgSameLine = false;
  let hasExpSameLine = false;
  let hasBatchSameLine = false;
  let mfgDist = Infinity;
  let expDist = Infinity;

  const matchInLine = currentLine.indexOf(fullText.substr(matchIndex, matchLength));
  const posInLine = matchInLine !== -1 ? matchInLine : 0;

  for (const k of MFG_KEYWORDS) {
    const idx = currentLineLower.indexOf(k);
    if (idx !== -1) {
      hasMfgSameLine = true;
      mfgDist = Math.min(mfgDist, Math.abs(posInLine - idx));
    }
  }

  for (const k of EXP_KEYWORDS) {
    const idx = currentLineLower.indexOf(k);
    if (idx !== -1) {
      hasExpSameLine = true;
      expDist = Math.min(expDist, Math.abs(posInLine - idx));
    }
  }

  for (const k of BATCH_KEYWORDS) {
    if (currentLineLower.includes(k)) {
      hasBatchSameLine = true;
    }
  }

  // Same line decision
  if (hasMfgSameLine && !hasExpSameLine) {
    return { type: 'mfg', context: currentLine };
  }
  if (hasExpSameLine && !hasMfgSameLine) {
    return { type: 'exp', context: currentLine };
  }
  if (hasMfgSameLine && hasExpSameLine) {
    return { type: mfgDist < expDist ? 'mfg' : 'exp', context: currentLine };
  }

  // 2. Check preceding line if current line has no keywords (e.g. Header line followed by Date line)
  if (lineIndex > 0) {
    const prevLine = lines[lineIndex - 1].toLowerCase();
    const prevHasMfg = MFG_KEYWORDS.some(k => prevLine.includes(k));
    const prevHasExp = EXP_KEYWORDS.some(k => prevLine.includes(k));
    if (prevHasMfg && !prevHasExp) return { type: 'mfg', context: `${lines[lineIndex - 1]} | ${currentLine}` };
    if (prevHasExp && !prevHasMfg) return { type: 'exp', context: `${lines[lineIndex - 1]} | ${currentLine}` };
  }

  // 3. Fallback to 50-char window search
  const windowStart = Math.max(0, matchIndex - 50);
  const windowEnd = Math.min(fullText.length, matchIndex + matchLength + 50);
  const preceding = fullText.substring(windowStart, matchIndex).toLowerCase();
  const following = fullText.substring(matchIndex + matchLength, windowEnd).toLowerCase();

  let winMfgDist = Infinity;
  let winExpDist = Infinity;

  MFG_KEYWORDS.forEach(k => {
    const idxPre = preceding.lastIndexOf(k);
    if (idxPre !== -1) winMfgDist = Math.min(winMfgDist, preceding.length - idxPre);
    const idxPost = following.indexOf(k);
    if (idxPost !== -1) winMfgDist = Math.min(winMfgDist, 50 + idxPost);
  });

  EXP_KEYWORDS.forEach(k => {
    const idxPre = preceding.lastIndexOf(k);
    if (idxPre !== -1) winExpDist = Math.min(winExpDist, preceding.length - idxPre);
    const idxPost = following.indexOf(k);
    if (idxPost !== -1) winExpDist = Math.min(winExpDist, 50 + idxPost);
  });

  let detectedType = 'unknown';
  if (winMfgDist < winExpDist && winMfgDist < 45) detectedType = 'mfg';
  else if (winExpDist < winMfgDist && winExpDist < 45) detectedType = 'exp';

  return {
    type: detectedType,
    context: fullText.substring(windowStart, windowEnd).replace(/\s+/g, ' ').trim()
  };
}

/**
 * Checks if a string or number looks like a batch/barcode/phone/netwt rather than a date.
 */
function isDisallowedDateToken(text, index) {
  const preceding = text.substring(Math.max(0, index - 20), index).toLowerCase();
  // If directly preceded by "batch", "lot", "b.no", "bar code", "net wt", "mrp", "tel", "pin"
  if (/(?:batch|lot|b\.no|bno|barcode|net\s*wt|mrp|tel|pin|fssai)\s*[:#.]?\s*$/i.test(preceding)) {
    return true;
  }
  return false;
}

/**
 * Extracts all candidate manufacturing and expiry dates from text.
 */
export function extractDateCandidates(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  const text = rawText.replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const candidates = [];

  const addCandidate = (cand) => {
    // Year range check: packaged goods should be within 2000-2045
    if (cand.year < 2000 || cand.year > 2045) return;
    if (cand.month < 1 || cand.month > 12) return;
    if (cand.day !== null) {
      const maxDays = getDaysInMonth(cand.year, cand.month);
      if (cand.day < 1 || cand.day > maxDays) return;
    }
    candidates.push(cand);
  };

  // 1. Text Month Formats: e.g. "15 OCT 2026", "15-OCT-2026", "OCT 15, 2026", "OCT 2026", "15 OCT 26", "OCT-26"
  const monthKeys = Object.keys(MONTH_NAMES).join('|');
  const textMonthRegex = new RegExp(
    `\\b(?:(\\d{1,2})[\\s/.-]+)?(${monthKeys})[\\s/.,-]+(?:(\\d{1,2})[\\s/.,-]+)?(\\d{2,4})\\b`,
    'gi'
  );

  let match;
  while ((match = textMonthRegex.exec(text)) !== null) {
    if (isDisallowedDateToken(text, match.index)) continue;

    const rawMatch = match[0];
    const part1 = match[1];
    const monthName = match[2].toLowerCase();
    const part3 = match[3];
    const yearStr = match[4];

    const month = MONTH_NAMES[monthName];
    const year = normalizeYear(yearStr);
    const dayStr = part1 || part3;
    const day = dayStr ? parseInt(dayStr, 10) : null;
    const precision = day ? 'day' : 'month';

    const lineIdx = text.substring(0, match.index).split('\n').length - 1;
    const { type, context } = analyzeDateContext(text, lineIdx, lines, match.index, rawMatch.length);

    const validDay = day || getDaysInMonth(year, month);
    const parsedDate = new Date(Date.UTC(year, month - 1, validDay));

    addCandidate({
      rawText: rawMatch,
      parsedDate,
      year,
      month,
      day: day || null,
      precision,
      type,
      isAmbiguous: false,
      confidence: day ? 0.95 : 0.88,
      context
    });
  }

  // 2. ISO format YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoRegex = /\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/g;
  while ((match = isoRegex.exec(text)) !== null) {
    if (isDisallowedDateToken(text, match.index)) continue;

    const rawMatch = match[0];
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    const lineIdx = text.substring(0, match.index).split('\n').length - 1;
    const { type, context } = analyzeDateContext(text, lineIdx, lines, match.index, rawMatch.length);

    addCandidate({
      rawText: rawMatch,
      parsedDate: new Date(Date.UTC(year, month - 1, day)),
      year,
      month,
      day,
      precision: 'day',
      type,
      isAmbiguous: false,
      confidence: 0.95,
      context
    });
  }

  // 3. Three-part numeric dates: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY, DD MM YYYY (with spaces)
  // Matches e.g. "15/10/2026", "15-10-26", "15 . 10 . 2026", "15 10 2026"
  const numeric3Regex = /\b(\d{1,2})\s*[-/. ]\s*(\d{1,2})\s*[-/. ]\s*(\d{2,4})\b/g;
  while ((match = numeric3Regex.exec(text)) !== null) {
    if (isDisallowedDateToken(text, match.index)) continue;
    if (match[1].length === 4) continue; // skip ISO if matched

    const firstNum = parseInt(match[1], 10);
    const secondNum = parseInt(match[2], 10);
    const year = normalizeYear(match[3]);

    if (year < 2000 || year > 2045) continue;

    const lineIdx = text.substring(0, match.index).split('\n').length - 1;
    const { type, context } = analyzeDateContext(text, lineIdx, lines, match.index, match[0].length);

    // Ambiguity detection: if both parts are <= 12 and distinct, e.g. 03/04/2026
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
      // Ambiguous or equal numbers (e.g. 05/05/2026)
      // Default to DD/MM/YYYY as standard international packaging notation
      day = firstNum;
      month = secondNum;
    }

    if (month >= 1 && month <= 12) {
      const maxDays = getDaysInMonth(year, month);
      if (day >= 1 && day <= maxDays) {
        addCandidate({
          rawText: match[0].trim(),
          parsedDate: new Date(Date.UTC(year, month - 1, day)),
          year,
          month,
          day,
          precision: 'day',
          type,
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
          confidence: isAmbiguous ? 0.70 : 0.90,
          context
        });
      }
    }
  }

  // 4. Two-part Month & Year dates: MM/YYYY, MM-YYYY, MM.YYYY, MM/YY, MM-YY, MM.YY
  // e.g. "10/2025", "05-2027", "10/25", "05-27", "EXP 10 2025"
  const monthYearRegex = /\b(0[1-9]|1[0-2])\s*[-/. ]\s*(20\d{2}|\d{2})\b/g;
  while ((match = monthYearRegex.exec(text)) !== null) {
    if (isDisallowedDateToken(text, match.index)) continue;

    const matchIndex = match.index;
    const rawMatch = match[0].trim();

    // Check if part of 3-part date already matched
    const prevChar = text[matchIndex - 1];
    if (prevChar === '/' || prevChar === '-' || prevChar === '.') continue;
    const nextChar = text[matchIndex + rawMatch.length];
    if (nextChar === '/' || nextChar === '-' || nextChar === '.') continue;

    const month = parseInt(match[1], 10);
    const year = normalizeYear(match[2]);

    if (year < 2000 || year > 2045) continue;

    // Avoid duplicate if already covered by an existing candidate
    const alreadyCaptured = candidates.some(c =>
      c.rawText.includes(rawMatch) || rawMatch.includes(c.rawText)
    );
    if (alreadyCaptured) continue;

    const lineIdx = text.substring(0, matchIndex).split('\n').length - 1;
    const { type, context } = analyzeDateContext(text, lineIdx, lines, matchIndex, rawMatch.length);

    // Standard policy: month precision points to the last day of month for expiry comparison
    const lastDay = getDaysInMonth(year, month);
    const parsedDate = new Date(Date.UTC(year, month - 1, lastDay));

    addCandidate({
      rawText: rawMatch,
      parsedDate,
      year,
      month,
      day: null, // Explicitly null: never fabricate a day!
      precision: 'month',
      type,
      isAmbiguous: false,
      confidence: 0.85,
      context
    });
  }

  // 5. Intelligent disambiguation if two dates are detected (one MFG, one EXP)
  const expList = candidates.filter(c => c.type === 'exp');
  const mfgList = candidates.filter(c => c.type === 'mfg');
  const unknownList = candidates.filter(c => c.type === 'unknown');

  // If one is labeled MFG and the other is unknown, the other is likely EXP
  if (mfgList.length === 1 && expList.length === 0 && unknownList.length === 1) {
    unknownList[0].type = 'exp';
  } else if (expList.length === 1 && mfgList.length === 0 && unknownList.length === 1) {
    unknownList[0].type = 'mfg';
  } else if (mfgList.length === 0 && expList.length === 0 && unknownList.length === 2) {
    // Two unlabeled dates: earlier date is MFG, later date is EXP
    const d0 = unknownList[0].parsedDate.getTime();
    const d1 = unknownList[1].parsedDate.getTime();
    if (d0 < d1) {
      unknownList[0].type = 'mfg';
      unknownList[1].type = 'exp';
    } else if (d1 < d0) {
      unknownList[1].type = 'mfg';
      unknownList[0].type = 'exp';
    }
  } else if (mfgList.length === 2 && expList.length === 0) {
    // Both assigned MFG from a single keyword (e.g. "Packed: 15/01/2024 ... 15/01/2026")
    const d0 = mfgList[0].parsedDate.getTime();
    const d1 = mfgList[1].parsedDate.getTime();
    if (d0 < d1) {
      mfgList[1].type = 'exp';
    } else if (d1 < d0) {
      mfgList[0].type = 'exp';
    }
  } else if (expList.length === 2 && mfgList.length === 0) {
    // Both assigned EXP from a single keyword (e.g. "Use between 15/01/2024 and 15/01/2026")
    const d0 = expList[0].parsedDate.getTime();
    const d1 = expList[1].parsedDate.getTime();
    if (d0 < d1) {
      expList[0].type = 'mfg';
    } else if (d1 < d0) {
      expList[1].type = 'mfg';
    }
  }

  // Deduplicate overlapping candidates
  const uniqueCandidates = [];
  const seenKeys = new Set();
  for (const c of candidates) {
    const key = `${c.parsedDate.toISOString()}_${c.precision}_${c.type}_${c.rawText}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueCandidates.push(c);
    }
  }

  return uniqueCandidates;
}

/**
 * Parses shelf life phrases from label text.
 * e.g. "best before 24 months from manufacture", "shelf life: 12 months", "use within 6 months of mfg"
 */
export function parseShelfLife(text) {
  if (!text) return null;

  const shelfLifeRegex = /(?:best\s+before|shelf\s*life|use\s+within|expiry\s*[:\s]*within)\s*(?:of|is|:)?\s*(\d{1,2})\s*(months|month|m|years|year|y|days|day|d)(?:\s+(?:from|of)\s+(?:date\s+of\s+)?(?:mfg|manufacture|mfd|packaging|pkd))?/i;
  const match = text.match(shelfLifeRegex);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    let months = value;
    if (unit.startsWith('year') || unit === 'y') {
      months = value * 12;
    } else if (unit.startsWith('day') || unit === 'd') {
      months = Math.max(1, Math.round(value / 30));
    }
    return {
      raw: match[0].trim(),
      months,
      unit,
      value
    };
  }
  return null;
}

/**
 * Parses Period After Opening (PAO) jar icon text and explicit phrases.
 * e.g. "6M", "12M", "24M", "use within 6 months of opening"
 */
export function parsePAO(text) {
  if (!text) return null;

  // 1. Explicit phrase
  const paoExplicitRegex = /(?:after\s+opening|once\s+opened)\s*(?:use\s+within)?\s*(\d{1,2})\s*(months|month|m|days|day)/i;
  const explicitMatch = text.match(paoExplicitRegex);
  if (explicitMatch) {
    const val = parseInt(explicitMatch[1], 10);
    return {
      raw: explicitMatch[0].trim(),
      months: explicitMatch[2].toLowerCase().startsWith('d') ? Math.max(1, Math.round(val / 30)) : val
    };
  }

  // 2. PAO jar icon symbol standard notation (e.g. 6M, 12M, 24M)
  const paoSymbolRegex = /\b([369]|12|18|24|36)\s*M\b/gi;
  const match = paoSymbolRegex.exec(text);
  if (match) {
    return {
      raw: match[0].trim(),
      months: parseInt(match[1], 10)
    };
  }

  return null;
}

/**
 * Extracts storage instructions from text.
 * e.g. "Store in a cool, dry place", "Keep refrigerated below 4°C"
 */
export function extractStorageInstructions(text) {
  if (!text || typeof text !== 'string') return '';

  const storageRegex = /(?:store\s+(?:in\s+a\s+)?(?:cool|dry|dark|refrigerated|below|at)|keep\s+(?:refrigerated|chilled|frozen|cool|in\s+a\s+cool|dry|out\s+of\s+reach|away\s+from)|refrigerate\s+after\s+opening|protect\s+from\s+(?:direct\s+)?sunlight|do\s+not\s+freeze|shake\s+well\s+before\s+use)[^.\n\r]*(?:\.|$)/i;
  const match = text.match(storageRegex);
  if (match) {
    return match[0].trim().replace(/\s+/g, ' ');
  }
  return '';
}

/**
 * Detects product category based on label text keywords.
 */
export function detectCategory(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  const categories = [
    {
      id: 'skincare',
      keywords: ['serum', 'moisturizer', 'moisturising', 'sunscreen', 'cleanser', 'toner', 'spf', 'hyaluronic', 'dermatolog', 'niacinamide', 'face wash', 'lotion', 'skin', 'cream', 'hydrating', 'body wash', 'shampoo', 'conditioner']
    },
    {
      id: 'makeup_cosmetics',
      keywords: ['lipstick', 'foundation', 'mascara', 'eyeliner', 'blush', 'eyeshadow', 'powder', 'nail polish', 'concealer', 'cosmetic', 'lip gloss', 'palette', 'kajal']
    },
    {
      id: 'medicine',
      keywords: ['tablets', 'capsules', 'syrup', 'paracetamol', 'dosage', 'pharmacist', 'prescription', 'usp', 'bp', 'ip', 'ointment', 'pharma', 'analgesic', 'mg/ml', 'suspension', 'drops', 'antibiotic']
    },
    {
      id: 'household',
      keywords: ['detergent', 'disinfectant', 'cleaner', 'bleach', 'dishwash', 'surface', 'floor', 'laundry', 'repellent', 'stain remover', 'mosquito', 'air freshener']
    },
    {
      id: 'food_beverage',
      keywords: ['ingredients', 'nutrition facts', 'calories', 'sugar', 'protein', 'serving size', 'juice', 'milk', 'pasteurized', 'toned milk', 'yogurt', 'curd', 'tea', 'coffee', 'snack', 'chocolate', 'flavour', 'flavor', 'edible', 'cookies', 'sauce', 'biscuit', 'cereal', 'bread']
    }
  ];

  // Specific high-signal single-word indicators
  const directIndicators = {
    skincare: ['serum', 'sunscreen', 'moisturizer', 'moisturising', 'lotion'],
    makeup_cosmetics: ['lipstick', 'mascara', 'foundation', 'eyeliner'],
    medicine: ['tablets', 'capsules', 'paracetamol', 'syrup', 'ointment'],
    household: ['detergent', 'bleach', 'dishwash', 'disinfectant'],
    food_beverage: ['milk', 'yogurt', 'pasteurized', 'juice', 'chocolate', 'tea', 'coffee']
  };

  for (const [catId, words] of Object.entries(directIndicators)) {
    if (words.some(w => lower.includes(w))) {
      return catId;
    }
  }

  for (const cat of categories) {
    const matchCount = cat.keywords.filter(k => lower.includes(k)).length;
    if (matchCount >= 2) {
      return cat.id;
    }
  }

  return null;
}

/**
 * Extracts clean candidate brand and product name from top prominent lines,
 * aggressively filtering out noise, dates, barcode strings, ingredients, and regulatory blocks.
 */
export function extractBrandAndName(text) {
  if (!text || typeof text !== 'string') {
    return { detectedBrand: '', detectedName: '' };
  }

  const rawLines = text
    .split('\n')
    .map(l => l.replace(/^[|:;~_*\-—#[\]{}<>=+©§\s]+|[|:;~_*\-—#[\]{}<>=+©§\s]+$/g, '').trim())
    .filter(l => l.length >= 3);

  // Blacklist regex for metadata, dates, addresses, licensing
  const blacklistRegex = /^(?:mfg|mfd|dom|exp|exd|batch|lot|b\.no|bno|best before|use by|use before|ingredients|nutrition|net wt|net content|mrp|rs\.|fssai|marketed by|manufactured by|pkd by|customer care|email|website|www\.|http|keep refrigerated|store in|made in|lic no|barcode|\d+$)/i;

  const validLines = rawLines.filter(l => {
    if (blacklistRegex.test(l)) return false;

    // Discard lines with stray symbols like §, ~, <, >, =
    if (/[§~<>=]/.test(l)) return false;

    // Split into words and ensure words are meaningful
    const words = l.split(/\s+/).filter(Boolean);
    const lettersOnlyWords = words.filter(w => /^[a-zA-Z]{3,}$/.test(w));
    if (lettersOnlyWords.length === 0) return false;

    // Discard lines that contain mostly numbers or special characters (< 65% alphabetic)
    const alphaCount = (l.match(/[a-zA-Z]/g) || []).length;
    if (alphaCount / l.length < 0.65) return false;

    // Discard if line is just generic words
    if (/^(?:date|expiry|details|pack|item|warning|caution|directions)$/i.test(l)) return false;

    return true;
  });

  let detectedBrand = '';
  let detectedName = '';

  if (validLines.length >= 2) {
    if (validLines[0].length <= 30 && /^[A-Z0-9]/.test(validLines[0])) {
      detectedBrand = validLines[0].substring(0, 50);
      detectedName = validLines[1].substring(0, 80);
    } else {
      detectedName = validLines[0].substring(0, 80);
      detectedBrand = validLines[1].substring(0, 50);
    }
  } else if (validLines.length === 1) {
    detectedName = validLines[0].substring(0, 80);
  }

  return { detectedBrand, detectedName };
}
