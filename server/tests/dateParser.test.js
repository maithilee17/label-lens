import {
  extractDateCandidates,
  parseShelfLife,
  parsePAO,
  extractStorageInstructions,
  detectCategory,
  extractBrandAndName,
  extractBatchNumber,
  extractNetWeight,
  getDaysInMonth
} from '../services/dateParser.js';

describe('Date Parser & Label Extraction Service', () => {
  describe('Days in Month & Leap Years', () => {
    test('correctly calculates days in month including leap years', () => {
      expect(getDaysInMonth(2024, 2)).toBe(29); // Leap year
      expect(getDaysInMonth(2023, 2)).toBe(28); // Non-leap year
      expect(getDaysInMonth(2026, 10)).toBe(31);
      expect(getDaysInMonth(2026, 4)).toBe(30);
    });
  });

  describe('Manufacturing and Expiry Date Extraction', () => {
    test('extracts ISO dates YYYY-MM-DD for both MFG and EXP', () => {
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

    test('extracts multi-line dates with label variations: MFD and BEST BEFORE', () => {
      const text = `
        Product: Organic Greek Yogurt
        MFD: 15/04/2024
        BEST BEFORE: 15/04/2026
        NET WT: 500g
      `;
      const candidates = extractDateCandidates(text);
      const mfg = candidates.find(c => c.type === 'mfg');
      const exp = candidates.find(c => c.type === 'exp');

      expect(mfg).toBeDefined();
      expect(mfg.day).toBe(15);
      expect(mfg.month).toBe(4);
      expect(mfg.year).toBe(2024);

      expect(exp).toBeDefined();
      expect(exp.day).toBe(15);
      expect(exp.month).toBe(4);
      expect(exp.year).toBe(2026);
    });

    test('extracts DOM (Date of Manufacture) and USE BY dates', () => {
      const text = 'DOM 10-06-2024 USE BY 10-06-2027';
      const candidates = extractDateCandidates(text);
      const mfg = candidates.find(c => c.type === 'mfg');
      const exp = candidates.find(c => c.type === 'exp');

      expect(mfg).toBeDefined();
      expect(mfg.year).toBe(2024);
      expect(exp).toBeDefined();
      expect(exp.year).toBe(2027);
    });
  });

  describe('Dates Appearing in Different Orders', () => {
    test('correctly identifies fields when EXP appears before MFG on separate lines', () => {
      const text = `
        EXPIRY DATE: 25/12/2026
        MANUFACTURING DATE: 25/12/2024
        BATCH: B-9981
      `;
      const candidates = extractDateCandidates(text);
      const mfg = candidates.find(c => c.type === 'mfg');
      const exp = candidates.find(c => c.type === 'exp');

      expect(exp).toBeDefined();
      expect(exp.year).toBe(2026);
      expect(exp.month).toBe(12);

      expect(mfg).toBeDefined();
      expect(mfg.year).toBe(2024);
      expect(mfg.month).toBe(12);
    });

    test('correctly identifies fields when EXP appears before MFG on the same line', () => {
      const text = 'EXP: 20/08/2026  MFD: 20/08/2024';
      const candidates = extractDateCandidates(text);
      const exp = candidates.find(c => c.type === 'exp');
      const mfg = candidates.find(c => c.type === 'mfg');

      expect(exp).toBeDefined();
      expect(exp.year).toBe(2026);
      expect(mfg).toBeDefined();
      expect(mfg.year).toBe(2024);
    });

    test('infers earlier date as MFG and later as EXP when dates are unlabeled', () => {
      const text = 'Packed in facility: 15/01/2024 ... 15/01/2026';
      const candidates = extractDateCandidates(text);
      expect(candidates.length).toBe(2);

      const mfg = candidates.find(c => c.type === 'mfg');
      const exp = candidates.find(c => c.type === 'exp');
      expect(mfg).toBeDefined();
      expect(mfg.year).toBe(2024);
      expect(exp).toBeDefined();
      expect(exp.year).toBe(2026);
    });
  });

  describe('Month/Year Precision & No Fabricated Days', () => {
    test('extracts month-only dates MM/YYYY and assigns month precision with null day', () => {
      const text = 'EXP: 10/2025';
      const candidates = extractDateCandidates(text);
      expect(candidates.length).toBe(1);
      expect(candidates[0].precision).toBe('month');
      expect(candidates[0].month).toBe(10);
      expect(candidates[0].year).toBe(2025);
      expect(candidates[0].day).toBeNull(); // Day must not be fabricated!
      expect(candidates[0].parsedDate.getUTCDate()).toBe(31); // Points to month end
    });

    test('extracts MM/YY format with month precision', () => {
      const text = 'MFD 05/24 EXP 05/27';
      const candidates = extractDateCandidates(text);
      expect(candidates.length).toBe(2);

      const mfg = candidates.find(c => c.type === 'mfg');
      const exp = candidates.find(c => c.type === 'exp');

      expect(mfg.precision).toBe('month');
      expect(mfg.month).toBe(5);
      expect(mfg.year).toBe(2024);
      expect(mfg.day).toBeNull();

      expect(exp.precision).toBe('month');
      expect(exp.month).toBe(5);
      expect(exp.year).toBe(2027);
      expect(exp.day).toBeNull();
    });

    test('extracts named month formats: 15 OCT 2026 vs OCT 2026', () => {
      const textDay = 'BEST BEFORE: 15 OCT 2026';
      const candDay = extractDateCandidates(textDay);
      expect(candDay[0].precision).toBe('day');
      expect(candDay[0].day).toBe(15);
      expect(candDay[0].month).toBe(10);
      expect(candDay[0].year).toBe(2026);

      const textMonth = 'BEST BEFORE: OCT 2026';
      const candMonth = extractDateCandidates(textMonth);
      expect(candMonth[0].precision).toBe('month');
      expect(candMonth[0].day).toBeNull();
      expect(candMonth[0].month).toBe(10);
      expect(candMonth[0].year).toBe(2026);
    });
  });

  describe('Ambiguous and Unambiguous Dates', () => {
    test('detects ambiguous dates such as 03/04/2026 and provides both options', () => {
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

    test('treats equal day and month (05/05/2026) as unambiguous', () => {
      const text = 'EXP: 05/05/2026';
      const candidates = extractDateCandidates(text);
      expect(candidates.length).toBe(1);
      expect(candidates[0].isAmbiguous).toBe(false);
      expect(candidates[0].day).toBe(5);
      expect(candidates[0].month).toBe(5);
    });
  });

  describe('Excluding Batch Numbers and Barcodes from Dates', () => {
    test('does not treat batch numbers or lot numbers as dates', () => {
      const text = `
        BATCH NO: 202410
        LOT: 991823
        B.NO: 4921
        EXP: 15/08/2026
      `;
      const candidates = extractDateCandidates(text);
      expect(candidates.length).toBe(1);
      expect(candidates[0].type).toBe('exp');
      expect(candidates[0].year).toBe(2026);
    });

    test('does not treat net weight, prices, or regulatory numbers as dates', () => {
      const text = `
        NET WT: 250g
        MRP: Rs. 150.00
        FSSAI: 10014022002654
        BEST BEFORE 12/2026
      `;
      const candidates = extractDateCandidates(text);
      expect(candidates.length).toBe(1);
      expect(candidates[0].month).toBe(12);
      expect(candidates[0].year).toBe(2026);
    });

    test('never fabricates dates when no date exists', () => {
      const text = 'Pure Cotton Bedsheet 100% Cotton Made in India Machine Wash Warm';
      const candidates = extractDateCandidates(text);
      expect(candidates).toEqual([]);
    });
  });

  describe('Shelf Life & PAO Parsing', () => {
    test('parses explicit shelf-life phrases in months and years', () => {
      const res1 = parseShelfLife('Best before 24 months from manufacture date');
      expect(res1.months).toBe(24);

      const res2 = parseShelfLife('Shelf life: 12 months');
      expect(res2.months).toBe(12);

      const res3 = parseShelfLife('Use within 2 years of packing');
      expect(res3.months).toBe(24);
    });

    test('parses Period After Opening (PAO) jar notations and phrases', () => {
      const res1 = parsePAO('Storage: Store at 25C. 12M');
      expect(res1.months).toBe(12);

      const res2 = parsePAO('Once opened use within 6 months.');
      expect(res2.months).toBe(6);

      const res3 = parsePAO('Cosmetic container marked 24M');
      expect(res3.months).toBe(24);
    });
  });

  describe('Storage Instructions & Category Classification', () => {
    test('extracts common storage instructions', () => {
      const text1 = 'Ingredients: Milk, Sugar. Keep refrigerated below 4°C after opening. Net Wt 200g';
      expect(extractStorageInstructions(text1)).toContain('Keep refrigerated below 4°C');

      const text2 = 'STORE IN A COOL, DRY PLACE AWAY FROM SUNLIGHT. BATCH 123';
      expect(extractStorageInstructions(text2).toLowerCase()).toContain('store in a cool, dry place');
    });

    test('detects product categories based on label keywords', () => {
      const skincare = 'Hydrating Hyaluronic Acid Serum with 2% Niacinamide';
      expect(detectCategory(skincare)).toBe('skincare');

      const cosmetic = 'Velvet Matte Lipstick with Vitamin E. Long lasting';
      expect(detectCategory(cosmetic)).toBe('makeup_cosmetics');

      const medicine = 'Paracetamol 500mg Tablets BP. Dosage: as directed by pharmacist';
      expect(detectCategory(medicine)).toBe('medicine');

      const household = 'Concentrated Liquid Laundry Detergent for Stain Removal';
      expect(detectCategory(household)).toBe('household');

      const food = 'Organic Greek Yogurt. Ingredients: Pasteurized Milk, Live Active Cultures. Calories 120';
      expect(detectCategory(food)).toBe('food_beverage');
    });
  });

  describe('Product Name and Brand Extraction Heuristics', () => {
    test('extracts clean brand and product name while filtering out dates and metadata', () => {
      const text = `
        CeraVe
        Daily Moisturizing Lotion 473ml
        MFG: 01/2024
        EXP: 01/2027
        LOT: 98124
        Keep in a cool place
      `;
      const { detectedBrand, detectedName } = extractBrandAndName(text);
      expect(detectedBrand).toBe('CeraVe');
      expect(detectedName).toBe('Daily Moisturizing Lotion 473ml');
    });

    test('returns empty strings for OCR noise or gibberish and rejects keyboard brands', () => {
      const text = `
        SONY
        ||||---====
        #$$%%^^&&*
        J § fleas
        EXP 10/2026
      `;
      const { detectedBrand, detectedName } = extractBrandAndName(text);
      expect(detectedBrand).toBe('');
      expect(detectedName).toBe('');
    });

    test('extracts explicit manufacturer as brand from Mfd. By prefix', () => {
      const text = `
        Mfd. By: Viva Cosmetics, Thane - 421601
        Berry Crumble
        Batch No.: B0415
        Mfg. Date: 12/25
        Use Before: 11/27
        Net Wt.: 5g
      `;
      const { detectedBrand, detectedName } = extractBrandAndName(text);
      expect(detectedBrand).toBe('Viva Cosmetics');
      expect(detectedName).toBe('Berry Crumble lipstick');
    });
  });

  describe('Batch Number & Net Weight Extraction', () => {
    test('extracts batch / lot numbers from diverse formats', () => {
      expect(extractBatchNumber('Batch No.: B0415')).toBe('B0415');
      expect(extractBatchNumber('Batch: B-9812')).toBe('B-9812');
      expect(extractBatchNumber('LOT: 2410A')).toBe('2410A');
      expect(extractBatchNumber('B.NO. 4819')).toBe('4819');
    });

    test('extracts net weight and volume correctly', () => {
      expect(extractNetWeight('Net Wt.: 5g')).toBe('5g');
      expect(extractNetWeight('Net Wt.: 4g')).toBe('4g');
      expect(extractNetWeight('Net Weight: 500g')).toBe('500g');
      expect(extractNetWeight('Net Vol.: 250ml')).toBe('250ml');
    });
  });

  describe('Cosmetic Product Label Comprehensive Verification', () => {
    test('extracts all expected fields for cosmetic product label', () => {
      const text = `
        Mfd. By: Viva Cosmetics, Thane - 421601
        Berry Crumble
        Batch No.: B0415
        Mfg. Date: 12/25
        Use Before: 11/27
        Net Wt.: 5g
      `;

      const dates = extractDateCandidates(text);
      expect(dates.length).toBe(2);

      const mfg = dates.find(d => d.type === 'mfg');
      const exp = dates.find(d => d.type === 'exp');

      expect(mfg).toBeDefined();
      expect(mfg.month).toBe(12);
      expect(mfg.year).toBe(2025);
      expect(mfg.precision).toBe('month');
      expect(mfg.day).toBeNull();

      expect(exp).toBeDefined();
      expect(exp.month).toBe(11);
      expect(exp.year).toBe(2027);
      expect(exp.precision).toBe('month');
      expect(exp.day).toBeNull();

      expect(detectCategory(text)).toBe('makeup_cosmetics');
      expect(extractBatchNumber(text)).toBe('B0415');
      expect(extractNetWeight(text)).toBe('5g');

      const { detectedBrand, detectedName } = extractBrandAndName(text);
      expect(detectedBrand).toBe('Viva Cosmetics');
      expect(detectedName).toBe('Berry Crumble lipstick');
    });
  });
});
