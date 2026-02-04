import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

export interface Country {
  name: string;
  /**
   * ISO 3166-1 alpha-2 (same as libphonenumber-js CountryCode)
   * Examples: "US", "GB", "AE"
   */
  code: string;
  /**
   * Calling code with "+" prefix, e.g. "+1", "+971"
   */
  dial_code: string;
  /**
   * Emoji flag (best-effort). Not required by the UI, but useful as a fallback.
   */
  flag?: string;
  /**
   * Legacy fields (kept optional for compatibility with old code/data).
   */
  format?: string;
  length?: number | [number, number];
}

const isoToFlagEmoji = (iso2: string): string | undefined => {
  // Converts "US" -> 🇺🇸 using Unicode Regional Indicator Symbols.
  // Only works for A-Z.
  if (!/^[A-Z]{2}$/.test(iso2)) return undefined;
  const A = 0x1f1e6;
  const codePoints = [...iso2].map((c) => A + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
};

const getCountryName = (iso2: string): string => {
  try {
    // Use built-in Intl data (no extra dataset dependency).
    // In environments without Intl.DisplayNames, fall back to ISO code.
    const DisplayNames = (Intl as any).DisplayNames;
    if (!DisplayNames) return iso2;
    const dn = new DisplayNames(["en"], { type: "region" });
    return dn.of(iso2) || iso2;
  } catch {
    return iso2;
  }
};

/**
 * Full list of countries supported by libphonenumber-js.
 * This ensures the dropdown won’t miss countries due to a hand-maintained list.
 */
const allCountries: Country[] = getCountries()
  .map((code: CountryCode) => ({
    code,
    name: getCountryName(code),
    dial_code: `+${getCountryCallingCode(code)}`,
    flag: isoToFlagEmoji(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Put the most common markets first (as requested), then the rest alphabetically.
 * NOTE: "UK" is represented as "GB" (ISO 3166-1 alpha-2 / libphonenumber-js).
 */
const PRIORITY_COUNTRY_CODES: CountryCode[] = ["US", "GB", "SA", "AE", "CA", "IN"];

export const countries: Country[] = (() => {
  const byCode = new Map<string, Country>(allCountries.map((c) => [c.code, c]));
  const pinned = PRIORITY_COUNTRY_CODES.map((code) => byCode.get(code)).filter(
    (c): c is Country => Boolean(c)
  );
  const pinnedSet = new Set(pinned.map((c) => c.code));
  const rest = allCountries
    .filter((c) => !pinnedSet.has(c.code))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...pinned, ...rest];
})();

export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(c => c.code === code);
};

export const getCountryByDialCode = (dialCode: string): Country | undefined => {
  return countries.find(c => c.dial_code === dialCode);
};

