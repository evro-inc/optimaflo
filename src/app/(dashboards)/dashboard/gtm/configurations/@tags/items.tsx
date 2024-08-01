import { listTriggers } from '@/src/lib/fetch/dashboard/actions/gtm/triggers';

export const tagTypeArray = [
  { type: 'googtag', name: 'Google Tag' },
  { type: 'gaawe', name: 'Google Analytic 4: GA4 Event' },
  { type: 'html', name: 'Custom HTML' },
  { type: 'gclidw', name: 'Google Conversion Linker' },
];

export const filterType = [
  { type: 'equals', name: 'equals' },
  { type: 'contains', name: 'contains' },
  { type: 'startsWith', name: 'starts with' },
  { type: 'endsWith', name: 'ends with' },
  { type: 'matchCssSelector', name: 'matches CSS selector' },
  { type: 'matchRegex', name: 'matches RegEx' },
  { type: 'matchRegexIgnoreCase', name: 'matches RegEx (ignore case)' },
  { type: 'doesNotEqual', name: 'does not equal' },
  { type: 'doesNotContain', name: 'does not contain' },
  { type: 'doesNotStartWith', name: 'does not start with' },
  { type: 'doesNotEndWith', name: 'does not end with' },
  { type: 'doesNotMatchCssSelector', name: 'does not match CSS selector' },
  { type: 'doesNotMatchRegex', name: 'does not match RegEx' },
  { type: 'doesNotMatchRegexIgnoreCase', name: 'does not match RegEx (ignore case)' },
  { type: 'less', name: 'less than' },
  { type: 'lessOrEquals', name: 'less than or equal to' },
  { type: 'greater', name: 'greater than' },
  { type: 'greaterOrEquals', name: 'greater than or equal to' },
];

export async function fetchAllTriggers() {
  try {
    const [triggers] = await Promise.all([listTriggers()]);

    // Clean and structure the data
    const formattedTriggers = triggers.flat().map((data) => ({
      name: data.name,
      type: data.type,
      id: data.triggerId,
    }));

    const allTriggers = [...formattedTriggers];

    // Remove duplicates by type
    const uniqueTriggers = Array.from(new Set(allTriggers.map((variable) => variable.id))).map(
      (id) => {
        return allTriggers.find((t) => t.id === id);
      }
    );

    return uniqueTriggers;
  } catch (error) {
    console.error('Error fetching variables:', error);
    return [];
  }
}
