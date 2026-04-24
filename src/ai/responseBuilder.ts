/**
 * MedScanAI : Dynamic Response Builder
 * Formats responses naturally with markdown lists.
 */
import { Medicine } from '../types/medicine';
import { Intent } from './intentEngine';

// Removes dangling, incomplete sentences from truncated database entries
function cleanText(text: string | null | undefined, fallback: string): string {
  if (!text || text.trim() === '') return fallback;
  let str = text.trim();
  if (!/[.!?"]$/.test(str)) {
    const lastPunctuation = Math.max(str.lastIndexOf('.'), str.lastIndexOf('!'), str.lastIndexOf('?'));
    if (lastPunctuation > 0) {
      str = str.substring(0, lastPunctuation + 1);
    }
  }
  return str;
}

export function formatSideEffects(medicine: Medicine): string {
  const common = cleanText(medicine.common_side_effects, 'None explicitly listed.');
  const serious = cleanText(medicine.serious_side_effects, 'None explicitly listed.');
  
  if (common === serious) {
    return `**Side Effects of ${medicine.brand_name}**\n\nReported Side Effects:\n• ${common.replace(/;/g, '\n• ')}\n\nNote: Consult a doctor if any severe symptoms persist.`;
  }
  
  return `**Side Effects of ${medicine.brand_name}**\n\nCommon (usually mild):\n• ${common.replace(/;/g, '\n• ')}\n\nRare (seek medical help):\n• ${serious.replace(/;/g, '\n• ')}\n\nNote: Most side effects fade as your body adjusts. Consult a doctor if severe symptoms occur.`;
}

export function formatDosage(medicine: Medicine): string {
  const dosage = cleanText(medicine.typical_dosing, 'Refer to the packaging or a physician.');
  const tips = cleanText(medicine.administration_tips, 'Take as directed.');
  
  if (dosage === tips) {
    return `**Dosage Information for ${medicine.brand_name}**\n\nTypical Dose:\n${dosage}`;
  }
  
  return `**Dosage Information for ${medicine.brand_name}**\n\nTypical Dose:\n${dosage}\n\nAdministration Tips:\n${tips}`;
}

export function formatPregnancySafety(medicine: Medicine): string {
  const preg = cleanText(medicine.pregnancy_warning, 'Information not fully available.');
  const ped = cleanText(medicine.pediatric_warning, 'Information not fully available.');
  
  if (preg === ped) {
    return `**Safety Warnings for ${medicine.brand_name}**\n\nWarnings:\n${preg}`;
  }
  
  return `**Safety Warnings for ${medicine.brand_name}**\n\nPregnancy and Breastfeeding:\n${preg}\n\nPediatric Safety:\n${ped}`;
}

export function formatInteractions(medicine: Medicine): string {
  const interactions = cleanText(medicine.drug_interactions, 'No common major interactions listed.');
  const spacing = cleanText(medicine.spacing_medications, 'No specific spacing required.');
  
  if (interactions === spacing) {
    return `**Interactions for ${medicine.brand_name}**\n\nKnown Interactions:\n${interactions.replace(/;/g, '\n• ')}`;
  }
  
  return `**Interactions for ${medicine.brand_name}**\n\nKnown Interactions:\n${interactions.replace(/;/g, '\n• ')}\n\nSpacing Recommendations:\n${spacing}`;
}

export function formatGeneralInfo(medicine: Medicine): string {
  const uses = cleanText(medicine.clinical_applications || medicine.therapeutic_indications, 'No specific uses listed.');
  return `**Overview of ${medicine.brand_name}**\n\nActive Substance: ${medicine.active_substance}\nForm: ${medicine.pharmaceutical_form}\n\nUses:\n${uses}`;
}

export function formatSymptomResults(query: string, medicines: Medicine[]): string {
  if (medicines.length === 0) {
    return `**Medicines for ${query}**\n\nWhile I am checking the database, common over-the-counter options usually include:\n• Paracetamol (Antipyretic/Analgesic)\n• Ibuprofen (NSAID)\n\nPlease consult a healthcare professional for specific advice.`;
  }
  
  const list = medicines.slice(0, 3).map(m => `**${m.brand_name}** (${m.active_substance || 'Various'})`).join('\n• ');
  return `**Medicines for ${query}**\n\nHere are some top options commonly used:\n• ${list}\n\nClick any medicine name below to see more details.`;
}

export function formatComparison(med1: Medicine, med2Name: string): string {
  const uses = cleanText(med1.therapeutic_indications, 'its active properties');
  return `**Comparison**\n\nYou asked to compare ${med1.brand_name} with ${med2Name}.\n\nWhile I cannot do a full clinical comparison yet, ${med1.brand_name} is primarily used for:\n${uses}\n\nTry searching for ${med2Name} directly to see its specific details.`;
}

export function formatClarification(medicineName: string): string {
  return `Are you asking about the dosage, side effects, or interactions for ${medicineName}?`;
}

export function buildDynamicResponse(
  intent: Intent,
  medicine: Medicine | null,
  query: string,
  searchResults?: Medicine[]
): { answer: string; chips: string[] } {
  if (intent === 'symptom_query' && searchResults && searchResults.length > 0) {
    return {
      answer: formatSymptomResults(query, searchResults),
      chips: searchResults.slice(0, 3).map(m => m.brand_name)
    };
  }

  if (intent === 'symptom_query') {
    return {
      answer: formatSymptomResults(query, searchResults || []),
      chips: searchResults && searchResults.length > 0 ? searchResults.slice(0, 3).map(m => m.brand_name) : ['Paracetamol', 'Ibuprofen']
    };
  }

  if (!medicine) {
    return {
      answer: `I am sorry, I could not find a medicine matching "${query}". Please check the spelling.`,
      chips: ['Paracetamol', 'Ibuprofen']
    };
  }

  let answer = '';
  let chips: string[] = [];

  switch (intent) {
    case 'side_effects':
      answer = formatSideEffects(medicine);
      chips = ['Dosage', 'Interactions', 'Pregnancy safety'];
      break;
    case 'dosage':
      answer = formatDosage(medicine);
      chips = ['Side effects', 'Interactions', 'Pregnancy safety'];
      break;
    case 'pregnancy_safety':
      answer = formatPregnancySafety(medicine);
      chips = ['Dosage', 'Side effects'];
      break;
    case 'interactions':
      answer = formatInteractions(medicine);
      chips = ['Dosage', 'Side effects'];
      break;
    case 'comparison':
      answer = formatComparison(medicine, query.replace(/vs|versus/i, '').trim());
      chips = ['Side effects', 'Dosage'];
      break;
    case 'clarification':
      answer = formatClarification(medicine.brand_name);
      chips = ['Dosage', 'Side effects', 'Interactions'];
      break;
    case 'general':
    case 'medicine_lookup':
    default:
      answer = formatGeneralInfo(medicine);
      chips = ['Dosage', 'Side effects', 'Pregnancy safety', 'Interactions'];
      break;
  }

  return { answer, chips };
}
