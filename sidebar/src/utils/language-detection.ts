import franc from 'franc-min';

export type LanguageCodeIso1 = string

export function detectLanguage(text: string): LanguageCodeIso1 {
  return LANGUAGE_ISO3_TO_ISO1[franc(text, {only: ['eng', 'deu'], minLength: 1})];
}

const LANGUAGE_ISO3_TO_ISO1: Record<string, LanguageCodeIso1> = {
  und: 'en', // default for unknown languages is English.
  deu: 'de',
  eng: 'en',
};
