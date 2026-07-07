export const SIGN_LANGUAGE_CODES = ["ASL", "BSL", "LSF", "TSL"] as const;
export type SignLanguageCode = (typeof SIGN_LANGUAGE_CODES)[number];

export const SIGN_LANGUAGE_META: Record<
  SignLanguageCode,
  { name: string; flag: string; nativeName?: string }
> = {
  ASL: { name: "American Sign Language", flag: "🇺🇸" },
  BSL: { name: "British Sign Language", flag: "🇬🇧" },
  LSF: { name: "French Sign Language", flag: "🇫🇷" },
  TSL: { name: "Tunisian Sign Language", flag: "🇹🇳", nativeName: "لغة الإشارة التونسية" },
};

export function isSignLanguageCode(value: string): value is SignLanguageCode {
  return (SIGN_LANGUAGE_CODES as readonly string[]).includes(value);
}
