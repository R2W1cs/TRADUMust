import type { SignLanguageCode } from "@/lib/sign-languages";
import { SIGN_LANGUAGE_META } from "@/lib/sign-languages";

/** Languages with a native SiGML gloss library for the CWASA avatar. */
export type CwasaLibraryId = "ALSL" | "ASL";

export interface CwasaLibrary {
  id: CwasaLibraryId;
  label: string;
  flag: string;
  /** Path served from /asl-avatar/ — gloss filename = {gloss}.sigml */
  sigmlBase: string;
  placeholder: string;
  defaultText: string;
  hint: string;
  inputScript: "arabic" | "latin";
}

export const CWASA_LIBRARIES: Record<CwasaLibraryId, CwasaLibrary> = {
  ALSL: {
    id: "ALSL",
    label: "Arabic Sign (ALSL)",
    flag: "🇩🇿",
    sigmlBase: "/asl-avatar/sigml/alsl/",
    placeholder: "اكتب بالعربية — مثال: مرحبا شكرا نعم",
    defaultText: "مرحبا شكرا",
    hint: "Authentic Algerian Sign Language SiGML — Arabic glosses only",
    inputScript: "arabic",
  },
  ASL: {
    id: "ASL",
    label: "ASL",
    flag: SIGN_LANGUAGE_META.ASL.flag,
    sigmlBase: "/asl-avatar/sigml/asl/",
    placeholder: "Type English — e.g. hello thank you yes",
    defaultText: "hello thank you",
    hint: "American Sign Language SiGML — native ASL glosses (not Arabic)",
    inputScript: "latin",
  },
};

/** Shown in UI; BSL/LSF/TSL need their own SiGML corpora before CWASA can sign them. */
export const CWASA_COMING_SOON: {
  code: SignLanguageCode;
  label: string;
  flag: string;
  reason: string;
}[] = [
  {
    code: "BSL",
    label: "BSL",
    flag: SIGN_LANGUAGE_META.BSL.flag,
    reason: "British Sign Language SiGML library not bundled yet",
  },
  {
    code: "LSF",
    label: "LSF",
    flag: SIGN_LANGUAGE_META.LSF.flag,
    reason: "French Sign Language SiGML library not bundled yet",
  },
  {
    code: "TSL",
    label: "TSL",
    flag: SIGN_LANGUAGE_META.TSL.flag,
    reason: "Use Express → TSL (Photos) for the dataset; 3D SiGML pending",
  },
];

export const CWASA_LIBRARY_LIST = Object.values(CWASA_LIBRARIES);

export function getCwasaLibrary(id: CwasaLibraryId): CwasaLibrary {
  return CWASA_LIBRARIES[id];
}
