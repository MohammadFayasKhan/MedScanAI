/**
 * MedScan+ — Dynamic Response Builder
 * Formats responses strictly based on intent. Zero repetition across messages.
 */
import { Medicine } from '../types/medicine';
import { Intent } from './intentEngine';

export function formatSideEffects(medicine: Medicine): string {
  const common = medicine.common_side_effects || 'None explicitly listed.';
  const serious = medicine.serious_side_effects || 'None explicitly listed.';
  return `💊 **Side Effects — ${medicine.brand_name}**\n\n**Common:**\n• ${common.replace(/;/g, '\n• ')}\n\n**Rare/Serious:**\n• ${serious.replace(/;/g, '\n• ')}\n\n⚠️ *Advice: Consult a doctor if any severe symptoms persist.*`;
}

export function formatDosage(medicine: Medicine): string {
  const dosage = medicine.typical_dosing || 'Refer to the packaging or a physician.';
  const tips = medicine.administration_tips || 'Take as directed.';
  return `📏 **Dosage Information — ${medicine.brand_name}**\n\n**Typical Dose:**\n${dosage}\n\n**Administration Tips:**\n${tips}`;
}

export function formatPregnancySafety(medicine: Medicine): string {
  const preg = medicine.pregnancy_warning || 'Information not fully available.';
  const ped = medicine.pediatric_warning || 'Information not fully available.';
  return `🤰 **Safety Warnings — ${medicine.brand_name}**\n\n**Pregnancy/Breastfeeding:**\n${preg}\n\n**Pediatric (Kids):**\n${ped}`;
}

export function formatInteractions(medicine: Medicine): string {
  const interactions = medicine.drug_interactions || 'No common major interactions listed.';
  const spacing = medicine.spacing_medications || 'No specific spacing required.';
  return `🔗 **Interactions — ${medicine.brand_name}**\n\n**Known Interactions:**\n${interactions.replace(/;/g, '\n• ')}\n\n**Spacing:**\n${spacing}`;
}

export function formatGeneralInfo(medicine: Medicine): string {
  return `📘 **Overview — ${medicine.brand_name}**\n\n**Active Substance:** ${medicine.active_substance}\n**Form:** ${medicine.pharmaceutical_form}\n\n**Uses:**\n${medicine.clinical_applications || medicine.therapeutic_indications}`;
}

export function formatSymptomResults(query: string, medicines: Medicine[]): string {
  if (medicines.length === 0) return `I couldn't find any specific medicines for "${query}".`;
  
  const list = medicines.slice(0, 3).map(m => `**${m.brand_name}** (${m.active_substance || 'Various'})`).join('\n• ');
  return `🩺 **Medicines for ${query}**\n\nHere are some top options commonly used:\n• ${list}\n\n*Click any medicine name below to see more details.*`;
}

export function formatComparison(med1: Medicine, med2Name: string): string {
  return `⚖️ **Comparison**\n\nYou asked to compare **${med1.brand_name}** with **${med2Name}**.\n\nWhile I can't do a full clinical comparison yet, **${med1.brand_name}** is primarily used for:\n${med1.therapeutic_indications || 'its active properties'}.\n\n*Try searching for ${med2Name} directly to see its specific details.*`;
}

export function formatClarification(medicineName: string): string {
  return `Are you asking about the **dosage**, **side effects**, or **interactions** for ${medicineName}?`;
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

  if (!medicine) {
    if (intent === 'symptom_query') {
      return { answer: `I couldn't find matches for the symptom: ${query}.`, chips: [] };
    }
    return {
      answer: `I'm sorry, I couldn't find a medicine matching "${query}". Please check the spelling.`,
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
      chips = ['Side effects', 'Interactions', 'When to stop'];
      break;
    case 'pregnancy_safety':
      answer = formatPregnancySafety(medicine);
      chips = ['Dosage', 'Side effects'];
      break;
    case 'interactions':
      answer = formatInteractions(medicine);
      chips = ['Dosage', 'Substitutes'];
      break;
    case 'comparison':
      // Extract the other medicine from query ideally, but this is a simplified fallback
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
