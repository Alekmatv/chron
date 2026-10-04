/**
 * Interface translations.
 *
 * Polish is the source language: every UI text is written in Polish in the code and
 * the Polish text itself is the translation key. t() returns the translation for the
 * current language, or the original text when no translation exists, so a missing
 * entry never breaks the interface.
 */
import en from '@/i18n/en.js';
import uk from '@/i18n/uk.js';

/** Supported languages; Polish needs no dictionary. */
const DICTIONARIES = { pl: {}, en, uk };

/** localStorage key that keeps the selected language between visits. */
const STORAGE_KEY = 'chron_lang';

let currentLanguage = readStoredLanguage();
document.documentElement.lang = currentLanguage;

/** Compiled template keys per language, e.g. 'Schron nr {v0}' → /^Schron nr (.+?)$/ (built on first use). */
const templateCache = {};

/** Dictionary keys with {placeholders}, compiled into regular expressions. */
function templatesFor(language) {
  if (!templateCache[language]) {
    templateCache[language] = Object.keys(DICTIONARIES[language])
      .filter((key) => /\{\w+\}/.test(key))
      .map((key) => {
        const names = [...key.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
        const pattern = key
          .split(/\{\w+\}/)
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('(.+?)');
        return { regex: new RegExp(`^${pattern}$`), names, translation: DICTIONARIES[language][key] };
      });
  }
  return templateCache[language];
}

/**
 * Translates a text assembled from a template (e.g. "Schron nr 42"): finds the matching
 * template key and translates the inserted values too. Returns undefined when nothing matches.
 */
function translateByTemplate(core) {
  for (const { regex, names, translation } of templatesFor(currentLanguage)) {
    const match = core.match(regex);
    if (match) {
      return names.reduce((result, name, index) => result.replace(`{${name}}`, t(match[index + 1])), translation);
    }
  }
  return undefined;
}

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored in DICTIONARIES ? stored : 'pl';
  } catch {
    return 'pl';
  }
}

/** Current interface language code: 'pl' | 'en' | 'uk'. */
export function getLanguage() {
  return currentLanguage;
}

/** Switches the interface language and remembers the choice on the device. */
export function setLanguage(language) {
  if (!(language in DICTIONARIES)) return;
  currentLanguage = language;
  document.documentElement.lang = language;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The language still applies for this session.
  }
}

/**
 * Translates a Polish UI text. Surrounding whitespace is kept as is, so text fragments
 * joined with other values (e.g. " min pieszo") stay correctly spaced. Texts assembled
 * from templates ("Schron nr 42") are matched against template keys ("Schron nr {v0}").
 * @param {string} text Polish source text
 */
export function t(text) {
  if (typeof text !== 'string' || currentLanguage === 'pl') return text;
  const [, lead, core, trail] = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const translated = DICTIONARIES[currentLanguage][core] ?? translateByTemplate(core);
  return translated === undefined ? text : lead + translated + trail;
}

/**
 * Translates a text template and fills in its {placeholders}.
 * Placeholder values that are themselves Polish texts are translated too.
 * @param {string} template Polish template, e.g. 'Idź {distance} m {direction}'
 * @param {Record<string, string | number>} values
 */
export function tf(template, values) {
  return t(template).replace(/\{(\w+)\}/g, (match, name) => (name in values ? t(String(values[name])) : match));
}

/**
 * Translates every string inside a value (objects and arrays are walked recursively).
 * Used for data returned by the data layer; functions and other values are left untouched.
 */
export function translateDeep(value) {
  if (currentLanguage === 'pl') return value;
  if (typeof value === 'string') return t(value);
  if (Array.isArray(value)) return value.map(translateDeep);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const result = {};
    for (const key of Object.keys(value)) result[key] = translateDeep(value[key]);
    return result;
  }
  return value;
}
