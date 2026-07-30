// Gujarati to English Phonetic Transliteration & Smart Cross-Language Search Utility
import { transliterateEnglishToGujarati } from './translator';

export const gujaratiToEnglishMap = {
  'અ': 'a', 'આ': 'a', 'ઇ': 'i', 'ઈ': 'i', 'ઉ': 'u', 'ઊ': 'u', 'ઋ': 'ru', 'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au',
  'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'n',
  'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'z', 'ઞ': 'n',
  'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n',
  'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
  'પ': 'p', 'ફ': 'f', 'બ': 'b', 'ભ': 'bh', 'મ': 'm',
  'ય': 'y', 'ર': 'r', 'લ': 'l', 'વ': 'v', 'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h', 'ળ': 'l',
  'ા': 'a', 'િ': 'i', 'ી': 'i', 'ુ': 'u', 'ૂ': 'u', 'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au', 'ં': 'n', 'ઃ': 'h', '્': ''
};

export const gujaratiToEnglish = (text) => {
  if (!text) return '';
  let result = '';
  const str = String(text);
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    result += gujaratiToEnglishMap[char] !== undefined ? gujaratiToEnglishMap[char] : char;
  }
  return result.toLowerCase();
};

export const normalizeText = (str) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/w/g, 'v')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/chh/g, 'ch')
    .replace(/sh/g, 's')
    .replace(/ph/g, 'f')
    .replace(/bh/g, 'b')
    .replace(/dh/g, 'd')
    .replace(/th/g, 't')
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
};

/**
 * Smart Search Matcher
 * Matches Gujarati text when searched in English (e.g. typing "ramesh" or "palanpur"),
 * or English text when searched in Gujarati, or exact raw strings/numbers.
 */
export const matchesSearch = (item, searchKeyword) => {
  if (!searchKeyword || !searchKeyword.trim()) return true;
  if (!item) return false;

  const rawQuery = searchKeyword.trim().toLowerCase();
  const normalizedQuery = normalizeText(rawQuery);
  const gujaratiQuery = transliterateEnglishToGujarati(searchKeyword.trim());

  // 1. Direct raw string check
  const rawFields = [
    item.name,
    item.village,
    item.mobile,
    item.email,
    item.paymentId,
    item.receiptNumber,
    item.deceasedName,
    item.dueDate,
    item.payDate,
    item._id,
    item.id
  ].filter(Boolean).map(f => String(f).toLowerCase());

  if (rawFields.some(f => f.includes(rawQuery))) return true;

  // 2. Gujarati Transliterated Query Check (e.g., search="ramesh" -> gujaratiQuery="રમેશ", matches item.name="રમેશભાઈ")
  if (gujaratiQuery && rawFields.some(f => f.includes(gujaratiQuery.toLowerCase()))) {
    return true;
  }

  // 3. Gujarati-to-English Transliterated Fields check (e.g. item.name="રમેશ" -> "ramesh")
  const gujaratiFields = [item.name, item.village, item.deceasedName].filter(Boolean);
  const englishTransliteratedFields = gujaratiFields.map(gujaratiToEnglish);

  if (englishTransliteratedFields.some(f => f.includes(rawQuery))) return true;

  // 4. Normalized Phonetic Match (e.g. "chapi" matches "chhapi", "palanpur" matches "palanpur")
  if (normalizedQuery) {
    const normalizedFields = englishTransliteratedFields.map(normalizeText);
    if (normalizedFields.some(f => f.includes(normalizedQuery))) return true;
  }

  return false;
};
