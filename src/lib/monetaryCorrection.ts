// ─── Monetary correction coefficient (CIRS art. 50) ──────────────────────────
//
// For "partes sociais" (shares in a company — e.g. individual stocks) held for
// more than 24 months, the acquisition cost is corrected for inflation using a
// coefficient published annually by the Ministry of Finance (Portaria).
//
// Scope note (CIRS art. 50, referencing art. 10, n.º 1, al. b)): the correction
// applies to "partes sociais" specifically — i.e. shares/quotas in a company.
// It does NOT apply to "outros valores mobiliários" such as ETF/fund units,
// bonds, or other securities that aren't equity in a specific company.
//
// Table below is from Portaria n.º 382/2025/1, of 11 November 2025 — the
// coefficients to apply to disposals occurring during 2025. A new Portaria is
// published each year for that year's disposals, so this table only applies
// when the fiscal (disposal) year is 2025.
export const MONETARY_CORRECTION_DISPOSAL_YEAR = 2025;

interface CoefficientRange {
  fromYear: number;
  toYear: number; // inclusive
  coefficient: number;
}

const COEFFICIENT_TABLE_2025: CoefficientRange[] = [
  { fromYear: -Infinity, toYear: 1903, coefficient: 5585.78 },
  { fromYear: 1904, toYear: 1910, coefficient: 5199.71 },
  { fromYear: 1911, toYear: 1914, coefficient: 4987.11 },
  { fromYear: 1915, toYear: 1915, coefficient: 4437.01 },
  { fromYear: 1916, toYear: 1916, coefficient: 3631.71 },
  { fromYear: 1917, toYear: 1917, coefficient: 2899.18 },
  { fromYear: 1918, toYear: 1918, coefficient: 2068.48 },
  { fromYear: 1919, toYear: 1919, coefficient: 1585.26 },
  { fromYear: 1920, toYear: 1920, coefficient: 1047.47 },
  { fromYear: 1921, toYear: 1921, coefficient: 683.44 },
  { fromYear: 1922, toYear: 1922, coefficient: 506.14 },
  { fromYear: 1923, toYear: 1923, coefficient: 309.74 },
  { fromYear: 1924, toYear: 1924, coefficient: 260.75 },
  { fromYear: 1925, toYear: 1936, coefficient: 224.73 },
  { fromYear: 1937, toYear: 1939, coefficient: 218.25 },
  { fromYear: 1940, toYear: 1940, coefficient: 183.66 },
  { fromYear: 1941, toYear: 1941, coefficient: 163.12 },
  { fromYear: 1942, toYear: 1942, coefficient: 140.83 },
  { fromYear: 1943, toYear: 1943, coefficient: 119.93 },
  { fromYear: 1944, toYear: 1950, coefficient: 101.78 },
  { fromYear: 1951, toYear: 1957, coefficient: 93.40 },
  { fromYear: 1958, toYear: 1963, coefficient: 87.82 },
  { fromYear: 1964, toYear: 1964, coefficient: 83.92 },
  { fromYear: 1965, toYear: 1965, coefficient: 80.83 },
  { fromYear: 1966, toYear: 1966, coefficient: 77.26 },
  { fromYear: 1967, toYear: 1969, coefficient: 72.24 },
  { fromYear: 1970, toYear: 1970, coefficient: 66.89 },
  { fromYear: 1971, toYear: 1971, coefficient: 63.67 },
  { fromYear: 1972, toYear: 1972, coefficient: 59.52 },
  { fromYear: 1973, toYear: 1973, coefficient: 54.11 },
  { fromYear: 1974, toYear: 1974, coefficient: 41.50 },
  { fromYear: 1975, toYear: 1975, coefficient: 35.46 },
  { fromYear: 1976, toYear: 1976, coefficient: 29.71 },
  { fromYear: 1977, toYear: 1977, coefficient: 22.76 },
  { fromYear: 1978, toYear: 1978, coefficient: 17.83 },
  { fromYear: 1979, toYear: 1979, coefficient: 14.07 },
  { fromYear: 1980, toYear: 1980, coefficient: 12.68 },
  { fromYear: 1981, toYear: 1981, coefficient: 10.37 },
  { fromYear: 1982, toYear: 1982, coefficient: 8.61 },
  { fromYear: 1983, toYear: 1983, coefficient: 6.89 },
  { fromYear: 1984, toYear: 1984, coefficient: 5.35 },
  { fromYear: 1985, toYear: 1985, coefficient: 4.48 },
  { fromYear: 1986, toYear: 1986, coefficient: 4.04 },
  { fromYear: 1987, toYear: 1987, coefficient: 3.71 },
  { fromYear: 1988, toYear: 1988, coefficient: 3.33 },
  { fromYear: 1989, toYear: 1989, coefficient: 3.00 },
  { fromYear: 1990, toYear: 1990, coefficient: 2.69 },
  { fromYear: 1991, toYear: 1991, coefficient: 2.38 },
  { fromYear: 1992, toYear: 1992, coefficient: 2.18 },
  { fromYear: 1993, toYear: 1993, coefficient: 2.01 },
  { fromYear: 1994, toYear: 1994, coefficient: 1.92 },
  { fromYear: 1995, toYear: 1995, coefficient: 1.84 },
  { fromYear: 1996, toYear: 1996, coefficient: 1.80 },
  { fromYear: 1997, toYear: 1997, coefficient: 1.77 },
  { fromYear: 1998, toYear: 1998, coefficient: 1.72 },
  { fromYear: 1999, toYear: 1999, coefficient: 1.70 },
  { fromYear: 2000, toYear: 2000, coefficient: 1.67 },
  { fromYear: 2001, toYear: 2001, coefficient: 1.55 },
  { fromYear: 2002, toYear: 2002, coefficient: 1.49 },
  { fromYear: 2003, toYear: 2003, coefficient: 1.45 },
  { fromYear: 2004, toYear: 2004, coefficient: 1.43 },
  { fromYear: 2005, toYear: 2005, coefficient: 1.40 },
  { fromYear: 2006, toYear: 2006, coefficient: 1.34 },
  { fromYear: 2007, toYear: 2007, coefficient: 1.32 },
  { fromYear: 2008, toYear: 2008, coefficient: 1.28 },
  { fromYear: 2009, toYear: 2009, coefficient: 1.30 },
  { fromYear: 2010, toYear: 2010, coefficient: 1.28 },
  { fromYear: 2011, toYear: 2011, coefficient: 1.24 },
  { fromYear: 2012, toYear: 2015, coefficient: 1.20 },
  { fromYear: 2016, toYear: 2016, coefficient: 1.19 },
  { fromYear: 2017, toYear: 2017, coefficient: 1.18 },
  { fromYear: 2018, toYear: 2020, coefficient: 1.17 },
  { fromYear: 2021, toYear: 2021, coefficient: 1.16 },
  { fromYear: 2022, toYear: 2022, coefficient: 1.06 },
  { fromYear: 2023, toYear: 2023, coefficient: 1.02 },
  { fromYear: 2024, toYear: 2024, coefficient: 1.00 },
];

/** Minimum holding period for the correction to apply: "mais de 24 meses" (CIRS art. 50). */
export const MIN_HOLDING_DAYS_FOR_MONETARY_CORRECTION = 2 * 365;

/**
 * Looks up the official monetary-devaluation coefficient for an acquisition
 * year, for disposals occurring in `disposalYear`. Returns null if no
 * official table is available for that disposal year (only 2025 is
 * currently published in this app), or 1 (no correction) if the acquisition
 * year is the same as or after the disposal year's "current" reference (2024
 * for the 2025 table has coefficient 1.00 anyway).
 */
export function getMonetaryCorrectionCoefficient(
  acquisitionYear: number,
  disposalYear: number
): number | null {
  if (disposalYear !== MONETARY_CORRECTION_DISPOSAL_YEAR) return null;
  const range = COEFFICIENT_TABLE_2025.find(
    (r) => acquisitionYear >= r.fromYear && acquisitionYear <= r.toYear
  );
  return range ? range.coefficient : 1;
}

/** Heuristic guess: is this product an individual company share ("partes sociais"),
 * as opposed to a fund/ETF unit ("outros valores mobiliários")? Always shown as an
 * editable default in the UI — never trust this blindly for a real filing. */
const FUND_KEYWORDS_RE =
  /\bETF\b|UCITS|\bFUND[S]?\b|SICAV|OEIC|\bTRUST\b|INDEX FUND|TRACKER|MSCI|S&P\s?500|FTSE|EURO STOXX/i;

export function guessIsCompanyShare(product: string): boolean {
  return !FUND_KEYWORDS_RE.test(product);
}
