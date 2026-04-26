/**
 * MedScanAI : Response Engine V2 — Enhanced (Ultra-Intelligent)
 * Handles 30+ intent types with conversational, context-aware responses.
 * Follows the 5-part structure template and advanced missing data protocol.
 */
import type { IntentResult } from './intentEngineV2';
import type { ChatSession, IntentType, MedScanDatabaseState, Medicine, Message } from '../store/useAppStore';

export interface ChatResponse {
  content: string;
  suggestions: string[];
  metadata?: Record<string, unknown>;
}

/* ── Utilities ───────────────────────────────────────────────────── */
function bullet(items: string[]) { return items.map(x => `• ${x}`).join('\n'); }
function shortList(items: string[], max = 4) { return items.slice(0, max); }

function value(text: unknown): string {
  const str = typeof text === 'string' ? text.trim() : text === null || text === undefined ? '' : String(text);
  return str;
}

function isMissing(arrOrStr: string | string[] | null | undefined): boolean {
  if (!arrOrStr) return true;
  if (Array.isArray(arrOrStr)) return arrOrStr.length === 0;
  return arrOrStr.trim().length === 0 || /not specified/i.test(arrOrStr);
}

function labelBadge(label?: string) {
  const normalized = (value(label) || 'CONSULT DOCTOR').replace(/_/g, ' ');
  if (/safe/i.test(normalized)) return `✅ ${normalized}`;
  if (/avoid|unsafe/i.test(normalized)) return `⛔ ${normalized}`;
  return `⚠️ ${normalized}`;
}

/* ── Form Extraction ─────────────────────────────────────────────── */
export type MedicineForm = 'powder' | 'tablet' | 'capsule' | 'syrup' | 'drop' | 'cream' | 'injection' | 'unknown';

function extractForm(m: Medicine): MedicineForm {
  const combined = `${m.name} ${m.category} ${m.packSize} ${m.class}`.toLowerCase();
  if (combined.includes('powder') || combined.includes('dusting')) return 'powder';
  if (combined.includes('drop')) return 'drop';
  if (combined.includes('syrup') || combined.includes('suspension') || combined.includes('liquid')) return 'syrup';
  if (combined.includes('cream') || combined.includes('ointment') || combined.includes('gel')) return 'cream';
  if (combined.includes('injection') || combined.includes('vial') || combined.includes('ampoule')) return 'injection';
  if (combined.includes('capsule')) return 'capsule';
  if (combined.includes('tablet') || combined.includes('tab')) return 'tablet';
  return 'unknown';
}

function getFormSpecificTip(form: MedicineForm): string {
  switch (form) {
    case 'powder': return 'Apply a thin layer to clean, dry skin. Wash hands before and after.';
    case 'tablet': return 'Swallow whole with a glass of water. Do not crush or chew unless advised.';
    case 'capsule': return 'Swallow whole with water. Do not open the capsule.';
    case 'drop': return 'Wash hands before use. Do not touch the dropper tip to any surface to avoid contamination.';
    case 'syrup': return 'Use a proper measuring spoon or cup, not a household spoon, for an accurate dose.';
    case 'cream': return 'Apply a thin layer and rub in gently. Wash hands after applying.';
    case 'injection': return 'This should only be administered by a qualified healthcare professional.';
    default: return 'Use exactly as directed by your healthcare provider.';
  }
}

/* ── Missing Data Protocol ───────────────────────────────────────── */
function handleMissingData(m: Medicine, topicLabel: string, expectedClassBehavior: string, specificQuestions: string[]): string {
  const medClass = value(m.class) || 'similar medications';
  return [
    `While our database doesn't have specific data on ${topicLabel} for **${m.name}**, medicines in this class (${medClass}) typically ${expectedClassBehavior}.`,
    '',
    `⚠️ **When you speak with your doctor, you might ask:**`,
    bullet(specificQuestions),
  ].join('\n');
}

/* ── Suggestion sets ─────────────────────────────────────────────── */
function getRecentTopics(messages: Message[]): string[] {
  return Array.from(new Set(messages.slice(-6).map(m => m.metadata?.type).filter(Boolean) as string[]));
}

function nextSuggestions(intent: IntentType, m?: Medicine, session?: ChatSession): string[] {
  const history = session ? getRecentTopics(session.messages) : [];
  
  const contextualMap: Record<string, string[]> = {
    side_effects: ['Dosage', 'When to contact a doctor', 'Usage instructions'],
    price: ['Generic alternatives', 'Dosage', 'Usage instructions'],
    usage_instructions: ['Storage', 'Missed dose', 'Side effects'],
    dosage: ['Side effects', 'Usage instructions', 'Missed dose'],
    interactions: ['Side effects', 'Alternatives', 'Usage instructions'],
    pregnancy_safety: ['Breastfeeding safety', 'Alternatives', 'Dosage'],
    storage_query: ['Usage instructions', 'Price', 'Side effects'],
    missed_dose: ['Usage instructions', 'Overdose emergency', 'Dosage'],
    overdose_emergency: ['Side effects', 'Dosage', 'Usage instructions'],
    alternatives_query: ['Price comparison', 'Side effects', 'Dosage'],
    mechanism: ['Side effects', 'Usage instructions', 'Alternatives'],
    rating: ['Side effects', 'Alternatives', 'Usage instructions'],
    alcohol_safety: ['Interactions', 'Side effects', 'Driving safety'],
    kidney_safety: ['Liver safety', 'Side effects', 'Dosage'],
    liver_safety: ['Kidney safety', 'Side effects', 'Dosage'],
    driving_safety: ['Side effects', 'Alcohol safety', 'Usage instructions'],
    quick_tips: ['Usage instructions', 'Side effects', 'Storage'],
    pediatric_query: ['Side effects in children', 'Dosage', 'Usage instructions'],
    geriatric_query: ['Side effects in elderly', 'Interactions', 'Dosage'],
    medicine_lookup: ['Side effects', 'Dosage', 'Price', 'How to use'],
    composition_query: ['Mechanism', 'Alternatives', 'Side effects'],
    contraindications_query: ['Side effects', 'Alternatives', 'Interactions'],
    lifestyle_diet: ['Usage instructions', 'Interactions', 'Side effects'],
    impairment_query: ['Kidney safety', 'Liver safety', 'Side effects'],
    allergy_query: ['Side effects', 'Alternatives', 'Usage instructions'],
    discontinuation_query: ['Side effects', 'Alternatives', 'Usage instructions'],
    efficacy_query: ['Side effects', 'Alternatives', 'Dosage'],
    long_term_use: ['Side effects', 'Alternatives', 'Liver safety'],
    breastfeeding_safety: ['Pregnancy safety', 'Alternatives', 'Side effects'],
  };

  let candidates = contextualMap[intent] || contextualMap['medicine_lookup'];
  
  if (m) {
    const form = extractForm(m);
    if (form === 'powder') candidates.push('Application tips', 'Storage for powders');
    if (form === 'tablet') candidates.push('Can I split this?', 'Take with food?');
    if (form === 'drop') candidates.push('How to apply drops', 'Storage');
    if (form === 'syrup') candidates.push('Storage for syrup', 'Measuring dose');
  }

  // Very basic history filtering (prevent exact string match from last 6 messages metadata types)
  candidates = candidates.filter(c => {
    const norm = c.toLowerCase().replace(/ /g, '_');
    return !history.some(h => norm.includes(h) || h.includes(norm));
  });
  
  const finalSuggestions = Array.from(new Set(candidates)).slice(0, 4);
  finalSuggestions.push('Ask about a different medicine');
  
  return finalSuggestions.slice(0, 5);
}

/* ── Welcome ─────────────────────────────────────────────────────── */
function welcome(): string {
  return [
    "Hi! I'm your MedScanAI medicine assistant. 👋",
    '',
    'I can help you:',
    '💊 Find detailed information about any medicine by name, generic, or composition',
    '⚠️ Answer questions about dosage, side effects, interactions, and safety',
    '🤰 Provide guidance for special situations (pregnancy, children, elderly)',
    '🔍 Suggest medicines commonly used for symptoms like fever or headache',
    '',
    'What would you like to know today? You can ask me things like:',
    '• "Side effects of Paracetamol"',
    '• "Is Ibuprofen safe during pregnancy?"',
    '• "Medicine for headache in children"',
    '• "Compare Dolo and Crocin"',
  ].join('\n');
}

/* ── Off-topic ───────────────────────────────────────────────────── */
function offTopicResponse(entities: string[]): string {
  const topic = entities.slice(0, 3).join(' ');
  return [
    'I specialize in medicine and healthcare information. 🩺',
    '',
    topic ? `I noticed you asked about "${topic}". While I cannot help with that, here is what I can do:` : 'Here is what I can help you with:',
    '',
    '• Medicine details and composition',
    '• Dosage, side effects, interactions',
    '• Symptom-based medicine suggestions',
    '• Pregnancy and safety information',
    '',
    'Try: "What is Paracetamol?", "Medicines for fever", or "Dosage of Amoxicillin".',
  ].join('\n');
}

/* ── Need medicine prompt ────────────────────────────────────────── */
function ensureMedicine(intent: IntentType, context: MedScanDatabaseState): ChatResponse {
  const active = context.activeMedicineId ? context.medicines.get(context.activeMedicineId) : undefined;
  const topicMap: Partial<Record<IntentType, string>> = {
    side_effects: 'side effects', dosage: 'dosage', interactions: 'interactions',
    pregnancy_safety: 'pregnancy safety', usage_instructions: 'usage instructions',
    storage_query: 'storage info', missed_dose: 'missed dose guidance',
    overdose_emergency: 'overdose information', composition_query: 'composition',
    contraindications_query: 'contraindications', alternatives_query: 'alternatives',
    driving_safety: 'driving safety', alcohol_safety: 'alcohol safety',
    kidney_safety: 'kidney safety', liver_safety: 'liver safety',
    pediatric_query: 'pediatric dosage', geriatric_query: 'geriatric dosage',
    allergy_query: 'allergy information', discontinuation_query: 'discontinuation guidance',
    long_term_use: 'long-term use information',
  };
  const topic = topicMap[intent] ?? 'information';
  if (active) {
    return {
      content: `Do you mean ${topic} for **${active.name}**? Ask again or tap a suggestion below.`,
      suggestions: ['Side effects', 'Dosage', 'Interactions', 'Pregnancy safety'],
      metadata: { type: 'clarification', activeMedicineId: active.id },
    };
  }
  return {
    content: `Which medicine should I check ${topic} for? Type the medicine name (e.g. Paracetamol).`,
    suggestions: ['Paracetamol', 'Ibuprofen', 'Cetirizine', 'Omeprazole'],
    metadata: { type: 'need_medicine' },
  };
}

/* ── Format functions (Following the 5-part structure) ──────────── */

function formatOverview(m: Medicine): string {
  const form = extractForm(m);
  const tip = getFormSpecificTip(form);
  
  return [
    `Great question! Here is an overview of **${m.name}** (generic: ${value(m.genericName) || 'Not specified'}). 💊`,
    '',
    `**Key Information:**`,
    `• **Class:** ${value(m.class) || 'Various'}`,
    `• **Commonly used for:** ${shortList(m.uses, 4).join(', ') || 'Not specified'}`,
    `• **Standard adult dose:** ${value(m.dosage.adult) || 'Consult your doctor'}`,
    '',
    `💡 **Quick Tip:** ${value(m.quickTips) || tip}`,
    '',
    `⚠️ **Important:** Always read the product label and follow your healthcare provider's exact instructions.`,
    '',
    `❓ **You might also wonder:**`,
    `• What are the common side effects?`,
    `• How should I use this ${form}?`,
    '',
    `Is there anything specific about ${m.name} you'd like to explore? 😊`,
  ].join('\n');
}

function formatSideEffects(m: Medicine): string {
  const common = m.sideEffects.common.length ? m.sideEffects.common : [];
  const rare   = m.sideEffects.rare.length   ? m.sideEffects.rare   : [];
  
  if (common.length === 0 && rare.length === 0) {
    return handleMissingData(
      m, 
      'side effects', 
      'have minimal severe side effects when used correctly, though individual reactions vary', 
      ['What specific side effects should I watch out for?', 'Does this medicine interact with my other conditions?']
    ) + '\n\nWould you like me to explain proper usage or alternative medicines?';
  }

  return [
    `It's completely normal to want to know about side effects. Here is what to expect with **${m.name}**: 🩺`,
    '',
    common.length > 0 ? '**Common (usually mild and may go away as your body adjusts):**\n' + bullet(common) + '\n' : '',
    rare.length > 0 ? '**Rare but serious:**\n' + bullet(rare) + '\n' : '',
    `⚠️ **Contact your doctor if:**`,
    `• You experience signs of an allergic reaction (swelling, hives, difficulty breathing)`,
    `• Any side effect persists or worsens significantly`,
    '',
    `❓ **Related topics you might find helpful:**`,
    `• Are there any drug interactions?`,
    `• What is the correct dosage?`,
    '',
    `Always monitor how you feel when starting a new medication. Does this help clarify things? 😊`,
  ].join('\n').replace(/\n\n\n/g, '\n\n');
}

function formatDosage(m: Medicine, demographic?: IntentResult['demographic']): string {
  const form = extractForm(m);
  let demographicNote = '';
  
  if (demographic === 'child') {
    if (isMissing(m.dosage.pediatric)) {
      return handleMissingData(
        m,
        'pediatric dosage',
        'require precise weight-based dosing for children rather than age-based approximations',
        ["What is the exact dose for my child's weight?", "Is there a pediatric-specific formulation available?"]
      ) + '\n\nNever self-adjust adult medicines for children. How else can I help you today?';
    }
    demographicNote = `**👶 Pediatric Dosage:**\n${m.dosage.pediatric}`;
  } else if (demographic === 'elderly') {
    demographicNote = `**👴 Geriatric Dosage:**\n${value(m.dosage.elderly) || 'Elderly patients may need reduced doses due to kidney or liver function changes. Consult your doctor.'}`;
  } else {
    demographicNote = `**🧑 Adult Dosage:**\n${value(m.dosage.adult) || 'Consult your prescribing doctor.'}`;
  }

  return [
    `I can help you with the dosage information for **${m.name}**. 💊`,
    '',
    demographicNote,
    '',
    `💡 **Application/Usage Tip:** ${getFormSpecificTip(form)}`,
    '',
    `⚠️ **Important:** Dosage heavily depends on the severity of your condition and your medical history. Never exceed the prescribed amount.`,
    '',
    `❓ **You might also wonder:**`,
    `• What if I miss a dose?`,
    `• Should I take this with food?`,
    '',
    `Always follow your healthcare provider's specific instructions. Is there anything else about using this ${form} you'd like to know? 😊`,
  ].join('\n');
}

function formatInteractions(m: Medicine): string {
  if (isMissing(m.interactions)) {
    return handleMissingData(
      m,
      'drug interactions',
      'may interact with other drugs in ways that affect how they work or increase the risk of side effects',
      ['Does this interact with my daily supplements?', 'Can I take this alongside my blood pressure/diabetes medication?']
    ) + '\n\nAlways share your full medication list with your doctor. Can I help you with anything else?';
  }

  return [
    `It's very smart to check for interactions! Here is what you need to know about **${m.name}**: ⚠️`,
    '',
    '**Be cautious when combining this with:**',
    bullet(shortList(m.interactions, 6)),
    '',
    `⚠️ **Important Safety Note:**`,
    `This is not a complete list of interactions. Mixing medicines can change how they work or increase side effects.`,
    '',
    `❓ **Related topics you might find helpful:**`,
    `• Is it safe to consume alcohol with this?`,
    `• What are the contraindications?`,
    '',
    `Please share all medications and supplements with your doctor before starting this. Does that help? 😊`,
  ].join('\n');
}

function formatPregnancySafety(m: Medicine): string {
  const isSafe = labelBadge(m.pregnancySafetyLabel);
  
  if (isMissing(m.pregnancySafety)) {
    return handleMissingData(
      m,
      'pregnancy safety',
      'must be carefully evaluated during pregnancy as the risks to the fetus must be weighed against the benefits to the mother',
      ['Are there any known safer alternatives in this class?', 'Is the risk higher in the first trimester?']
    ) + '\n\nDo you want me to look up breastfeeding safety or alternatives?';
  }

  return [
    `I understand this is an important concern. Here is the pregnancy safety information for **${m.name}**: 🤰`,
    '',
    `**Safety Level:** ${isSafe}`,
    '',
    `**Details:**`,
    `• ${value(m.pregnancySafety)}`,
    m.contraindications.length ? `• **Contraindications:** ${shortList(m.contraindications, 3).join(', ')}` : '',
    '',
    `⚠️ **Important Disclaimer:**`,
    `Never start or stop medication during pregnancy without consulting your obstetrician or healthcare provider.`,
    '',
    `❓ **You might also wonder:**`,
    `• Is this safe during breastfeeding?`,
    `• Are there any safer alternative medicines?`,
    '',
    `Your doctor's advice based on your specific health profile is most important. How else can I assist you? 😊`,
  ].join('\n').replace(/\n{3,}/g, '\n\n');
}

function formatUsageInstructions(m: Medicine): string {
  const form = extractForm(m);
  
  if (isMissing(m.howToUse) && isMissing(m.dosage.adult)) {
    return handleMissingData(
      m,
      'usage instructions',
      'should be used consistently and exactly as prescribed to ensure effectiveness',
      ['Should I take this with or without food?', 'What is the exact frequency of use?']
    ) + `\n\n💡 **General Tip for ${form}s:** ${getFormSpecificTip(form)}\n\nWould you like to know about possible side effects?`;
  }

  return [
    `Great question! Here's how to use **${m.name}** effectively: 💊`,
    '',
    `**Usage Instructions:**`,
    `• ${value(m.howToUse || m.dosage.adult)}`,
    '',
    `💡 **Quick Tips:**`,
    `• ${value(m.quickTips) || getFormSpecificTip(form)}`,
    '',
    `⚠️ **Important:**`,
    `• Complete the full prescribed course even if symptoms improve earlier.`,
    `• Do not change your dose without medical advice.`,
    '',
    `❓ **Related questions you might have:**`,
    `• What if I miss an application/dose?`,
    `• How should I store this?`,
    '',
    `Always follow your healthcare provider's specific instructions. Is there anything else you'd like to know? 😊`,
  ].join('\n');
}

function formatStorage(m: Medicine): string {
  const form = extractForm(m);
  let specificStorage = '';
  if (form === 'syrup') specificStorage = 'Keep the bottle tightly closed and check if refrigeration is required after opening.';
  if (form === 'drop') specificStorage = 'Ensure the cap is tightly closed to prevent contamination.';
  if (form === 'injection') specificStorage = 'Store exactly as labeled; many injections require refrigeration (do not freeze).';

  return [
    `Proper storage is essential for keeping **${m.name}** effective. 📦`,
    '',
    `**Standard Storage Guidelines:**`,
    `• Store in a cool, dry place away from direct sunlight.`,
    `• Keep safely out of reach of children and pets.`,
    `• Do not refrigerate unless the packaging specifically says to.`,
    specificStorage ? `• ${specificStorage}` : '',
    '',
    `⚠️ **Important:** Do not use this medicine after the expiry date printed on the pack or if it changes color/smell.`,
    '',
    `❓ **You might also wonder:**`,
    `• What is the correct dosage?`,
    `• How should I use this medicine?`,
    '',
    `When in doubt, ask your pharmacist about specific storage requirements. Can I help with anything else? 😊`,
  ].join('\n').replace(/\n{3,}/g, '\n\n');
}

function formatMissedDose(m: Medicine): string {
  return [
    `Don't worry, here is what you should do if you missed a dose of **${m.name}**: ⏰`,
    '',
    `**Action Steps:**`,
    `• Take the missed dose as soon as you remember.`,
    `• However, if it is almost time for your next scheduled dose, skip the missed dose completely.`,
    `• **Never** take a double dose to make up for a forgotten one.`,
    '',
    `⚠️ **Note:** If you frequently forget doses, consider setting a daily alarm or using a pill organizer.`,
    '',
    `❓ **Related topics:**`,
    `• What is the correct dosage schedule?`,
    `• What should I do in case of an overdose?`,
    '',
    `Contact your doctor if you have missed multiple days of treatment. Is there anything else I can clarify? 😊`,
  ].join('\n');
}

function formatOverdose(m: Medicine): string {
  return [
    `⚠️ **EMERGENCY: Overdose Warning for ${m.name}** ⚠️`,
    '',
    `If you or someone else has taken too much of this medicine, **seek medical help immediately.**`,
    '',
    `**Immediate Steps to Take:**`,
    `• Call your local emergency number or poison control center right away.`,
    `• Do not induce vomiting unless specifically instructed by a medical professional.`,
    `• Take the medicine packaging or bottle with you to the hospital.`,
    '',
    `⚠️ **Critical:** This is a medical emergency — do not wait for symptoms to appear before seeking help.`,
    '',
    `Please prioritize getting medical assistance right now.`,
  ].join('\n');
}

function formatComposition(m: Medicine): string {
  return [
    `Here is the detailed composition and information for **${m.name}**: 🔬`,
    '',
    `**Key Details:**`,
    `• **Generic Name / Active Ingredient:** ${value(m.genericName) || 'Not specified'}`,
    `• **Drug Class:** ${value(m.class) || 'Not specified'}`,
    m.manufacturer ? `• **Manufacturer:** ${m.manufacturer}` : '',
    m.packSize ? `• **Standard Pack Size:** ${m.packSize}` : '',
    '',
    `💡 **Why this matters:** The generic name is the actual active compound doing the work. You can often find cheaper generic alternatives using this name.`,
    '',
    `❓ **You might also wonder:**`,
    `• Are there cheaper generic alternatives available?`,
    `• What is the exact mechanism of action?`,
    '',
    `Always read the product label for complete ingredient information. Does this answer your question? 😊`,
  ].join('\n').replace(/\n{3,}/g, '\n\n');
}

function formatContraindications(m: Medicine): string {
  if (isMissing(m.contraindications)) {
    return handleMissingData(
      m,
      'contraindications',
      'should be avoided if you have known allergies to similar compounds or certain severe pre-existing conditions',
      ['Are my current health conditions safe with this medication?', 'Should I avoid this if I have kidney/liver issues?']
    ) + '\n\nAlways share your full medical history with your doctor. Can I help with anything else?';
  }

  return [
    `It's important to be aware of contraindications for **${m.name}**. ⛔`,
    '',
    `**Do NOT use this medicine if you have:**`,
    bullet(m.contraindications),
    '',
    m.warnings.length ? `⚠️ **Additional Warnings:**\n${bullet(shortList(m.warnings, 3))}` : '',
    '',
    `⚠️ **Important:** Inform your doctor of all your medical conditions and allergies before starting this medicine.`,
    '',
    `❓ **Related topics you might find helpful:**`,
    `• What are the known drug interactions?`,
    `• Is this safe during pregnancy?`,
    '',
    `Safety always comes first. Is there any specific condition you are concerned about? 😊`,
  ].join('\n').replace(/\n{3,}/g, '\n\n');
}

function formatAlternatives(m: Medicine): string {
  return [
    `Looking for alternatives to **${m.name}**? I can guide you. 🔄`,
    '',
    `Since it belongs to the class **${value(m.class) || 'of similar drugs'}**, alternatives usually contain the same active ingredient or work in a similar way.`,
    '',
    `**To find the best alternative:**`,
    `• **Generic Substitution:** Ask your pharmacist for a generic version of **${value(m.genericName)}** (often much cheaper).`,
    `• **Similar Treatments:** Discuss other medicines used for **${shortList(m.uses, 2).join(', ') || 'this condition'}** with your doctor.`,
    '',
    `⚠️ **Important:** Only switch prescription medicines under medical supervision. Different brands may have different inactive ingredients.`,
    '',
    `❓ **You might also wonder:**`,
    `• How much does this medicine cost?`,
    `• What is the composition of this drug?`,
    '',
    `Would you like me to check the pricing details for you? 😊`,
  ].join('\n');
}

function formatPrice(m: Medicine): string {
  if (m.price == null) {
    return handleMissingData(
      m,
      'pricing',
      'vary in price depending on the pharmacy, location, and whether you buy the brand name or generic version',
      ['Is there a generic version available that is cheaper?', 'Is this covered by my health insurance or patient assistance programs?']
    ) + '\n\nWould you like to know about the composition to help find generic alternatives?';
  }

  return [
    `Here is the pricing information for **${m.name}**: 💰`,
    '',
    `**Cost Details:**`,
    `• **Price:** ${m.currency || '₹'}${m.price}`,
    `• **Pack Size:** ${value(m.packSize)}`,
    `• **Manufacturer:** ${value(m.manufacturer)}`,
    '',
    `💡 **Additional cost considerations:**`,
    `• Generic alternatives with the same active ingredient (${value(m.genericName)}) may be available at a lower cost.`,
    `• Some pharmacies offer loyalty discounts or bulk pricing.`,
    '',
    `❓ **Related questions:**`,
    `• What are the alternatives to this medicine?`,
    `• What is the correct dosage?`,
    '',
    `Prices can vary slightly by pharmacy. Anything else about pricing or affordability I can help with? 😊`,
  ].join('\n');
}

function formatAlcohol(m: Medicine): string {
  if (isMissing(m.alcoholSafetyText) && isMissing(m.alcoholSafetyLabel)) {
    return handleMissingData(
      m,
      'alcohol safety',
      'may interact with alcohol, potentially increasing side effects like drowsiness, dizziness, or liver strain',
      ['Is it safe to have one drink while on this medication?', 'How long after stopping the medication can I consume alcohol?']
    ) + '\n\nIt is generally safest to avoid alcohol when taking new medications. How else can I assist you?';
  }

  return [
    `That's a very smart question to ask. Here is the alcohol safety guidance for **${m.name}**: 🍷`,
    '',
    `**Safety Level:** ${labelBadge(m.alcoholSafetyLabel)}`,
    '',
    `**Details:**`,
    `• ${value(m.alcoholSafetyText)}`,
    '',
    `⚠️ **Important:** Mixing alcohol with certain medications can severely increase side effects like drowsiness, dizziness, or liver strain.`,
    '',
    `❓ **You might also wonder:**`,
    `• Is it safe to drive after taking this?`,
    `• Does this affect the liver?`,
    '',
    `When in doubt, it is best to avoid alcohol entirely while on medication. Does this answer your question? 😊`,
  ].join('\n');
}

function formatDrivingSafety(m: Medicine): string {
  return [
    `Here is the driving safety guidance for **${m.name}**: 🚗`,
    '',
    `**Safety Level:** ${labelBadge(m.drivingSafetyLabel)}`,
    '',
    `**Details:**`,
    `• ${value(m.drivingSafetyText) || `${m.name} may affect alertness in some patients.`}`,
    '',
    `⚠️ **General Advice:**`,
    `• Avoid driving or operating heavy machinery until you know exactly how this medicine affects you.`,
    `• Do not drive if you feel dizzy, drowsy, or if your vision is blurred.`,
    '',
    `❓ **Related topics:**`,
    `• Is it safe to consume alcohol with this?`,
    `• What are the common side effects?`,
    '',
    `When in doubt, prioritize your safety and do not drive. Can I clarify anything else for you? 😊`,
  ].join('\n');
}

function formatKidneySafety(m: Medicine): string {
  if (isMissing(m.kidneySafetyText)) {
    return handleMissingData(
      m,
      'kidney safety',
      'require cautious use in patients with renal impairment, as the kidneys are primarily responsible for clearing drugs from the body',
      ['Do I need a dose adjustment based on my kidney function?', 'Should I have regular blood tests while taking this?']
    ) + '\n\nAlways consult your nephrologist before use. Do you want to check liver safety as well?';
  }

  return [
    `I understand this is a critical concern. Here is the kidney safety profile for **${m.name}**: 🫘`,
    '',
    `**Safety Level:** ${labelBadge(m.kidneySafetyLabel)}`,
    '',
    `**Details:**`,
    `• ${value(m.kidneySafetyText)}`,
    '',
    `⚠️ **For Kidney Patients:**`,
    `• Dose adjustment may be required based on your GFR/creatinine levels.`,
    `• Regular monitoring of kidney function is highly recommended.`,
    '',
    `❓ **Related topics:**`,
    `• Is this safe for the liver?`,
    `• What are the contraindications?`,
    '',
    `Always consult your nephrologist before starting or stopping this medicine. Does this help? 😊`,
  ].join('\n');
}

function formatLiverSafety(m: Medicine): string {
  if (isMissing(m.liverSafetyText)) {
    return handleMissingData(
      m,
      'liver safety',
      'require cautious use in patients with hepatic impairment, as the liver is responsible for metabolizing most drugs',
      ['Do I need a dose reduction based on my liver enzymes?', 'What signs of liver stress should I watch out for?']
    ) + '\n\nAlways consult your hepatologist before use. Do you want to check kidney safety as well?';
  }

  return [
    `Here is the liver safety information for **${m.name}**: 🫀`,
    '',
    `**Safety Level:** ${labelBadge(m.liverSafetyLabel)}`,
    '',
    `**Details:**`,
    `• ${value(m.liverSafetyText)}`,
    '',
    `⚠️ **For Liver Patients:**`,
    `• Dose reduction may be needed based on liver function tests.`,
    `• Monitor liver enzymes regularly as advised by your doctor.`,
    '',
    `❓ **Related topics:**`,
    `• Is it safe to consume alcohol?`,
    `• Is this safe for the kidneys?`,
    '',
    `Always consult your hepatologist or primary doctor before use. Can I help you with anything else? 😊`,
  ].join('\n');
}

function formatAllergy(m: Medicine): string {
  return [
    `It's great that you are checking for allergies. Here is what to watch out for with **${m.name}**: ⚠️`,
    '',
    m.contraindications.length
      ? `**Known contraindications include:**\n${bullet(m.contraindications)}`
      : 'No specific allergy contraindications listed in this dataset.',
    '',
    `⚠️ **Signs of an Allergic Reaction (Anaphylaxis):**`,
    `• Rash, severe itching, or hives`,
    `• Swelling of the face, lips, tongue, or throat`,
    `• Difficulty breathing or sudden wheezing`,
    `• Severe dizziness or fainting`,
    '',
    `⚠️ **Critical:** Stop the medicine immediately and seek emergency care if you experience any of these signs.`,
    '',
    `❓ **You might also wonder:**`,
    `• What are the normal side effects?`,
    `• What are the contraindications?`,
    '',
    `If you have a known allergy to ${value(m.genericName) || 'this medicine'}, do not take it. Is there anything else you need to know? 😊`,
  ].join('\n');
}

function formatMechanism(m: Medicine): string {
  if (isMissing(m.mechanismOfAction)) {
    return handleMissingData(
      m,
      'mechanism of action',
      'work by targeting specific pathways or enzymes in the body to relieve symptoms or treat the underlying cause',
      ['How exactly does this drug class work?', 'How long does it typically take to start working?']
    ) + '\n\nWould you like to know about the common uses or side effects instead?';
  }

  return [
    `Here is how **${m.name}** works in your body: ⚙️`,
    '',
    `**Mechanism of Action:**`,
    `• ${value(m.mechanismOfAction)}`,
    '',
    `💡 **What this means for you:** By understanding how it works, you can better understand why you might experience certain side effects or why it takes time to feel the benefits.`,
    '',
    `❓ **Related questions you might have:**`,
    `• What are the active ingredients?`,
    `• What are the common side effects?`,
    '',
    `Does that explanation make sense? Let me know if you'd like me to clarify anything! 😊`,
  ].join('\n');
}

function formatQuickTips(m: Medicine): string {
  const form = extractForm(m);
  
  if (isMissing(m.quickTips)) {
    return [
      `I don't have specific quick tips for **${m.name}** in the database, but here are some general best practices for this type of medicine: 💡`,
      '',
      `• **Usage:** ${getFormSpecificTip(form)}`,
      `• **Consistency:** Try to take it at the same time every day to maintain even levels in your body.`,
      `• **Storage:** Keep it in a cool, dry place away from direct sunlight.`,
      '',
      `⚠️ **Important:** Always read the full label provided with your medication.`,
      '',
      `Would you like to know the exact dosage instructions or side effects? 😊`,
    ].join('\n');
  }

  return [
    `Here are some helpful quick tips for using **${m.name}** safely and effectively: 💡`,
    '',
    `**Key Advice:**`,
    `• ${value(m.quickTips)}`,
    `• ${getFormSpecificTip(form)}`,
    '',
    `⚠️ **Important:** These tips do not replace the advice of your healthcare provider.`,
    '',
    `❓ **You might also wonder:**`,
    `• How should I store this?`,
    `• What if I miss a dose?`,
    '',
    `Is there any specific tip you'd like more details on? 😊`,
  ].join('\n');
}

function formatSymptomResults(symptom: string, meds: Medicine[]): string {
  const top = meds.slice(0, 6);
  if (!top.length) {
    return [
      `I understand you're looking for medicines for **${symptom}**. 🩺`,
      '',
      'While I did not find direct database matches for that specific term, here are common options for general symptoms:',
      '• **Paracetamol** — fever, headache, mild pain',
      '• **Ibuprofen** — fever, inflammation, pain',
      '• **Cetirizine** — allergy, runny nose',
      '• **Omeprazole** — acidity, heartburn',
      '',
      `⚠️ **Important:** Always consult a doctor for a proper diagnosis before starting a new medication.`,
      '',
      `Could you try describing your symptom slightly differently, or ask about a specific medicine? 😊`,
    ].join('\n');
  }
  
  const list = top.map(m => `**${m.name}:** ${shortList(m.uses, 2).join(', ') || 'General use'}`);
  return [
    `I'd be happy to help. Here are medicines commonly used for **${symptom}**: 💊`,
    '',
    bullet(list),
    '',
    `💡 **Tip:** Tell me your age and any conditions (like pregnancy, kidney issues, or allergies) and I will help narrow down the safest options for you.`,
    '',
    `⚠️ **Important:** These are suggestions based on data. Always confirm with your doctor before taking any of them.`,
    '',
    `Which of these medicines would you like detailed information about? 😊`,
  ].join('\n');
}

function formatComparison(a: Medicine, b: Medicine): string {
  return [
    `Here is a comparison between **${a.name}** and **${b.name}** to help you understand the differences: ⚖️`,
    '',
    `**1. Common Uses:**`,
    `• **${a.name}:** ${shortList(a.uses, 3).join(', ') || 'Various'}`,
    `• **${b.name}:** ${shortList(b.uses, 3).join(', ') || 'Various'}`,
    '',
    `**2. Drug Class:**`,
    `• **${a.name}:** ${value(a.class) || 'Not specified'}`,
    `• **${b.name}:** ${value(b.class) || 'Not specified'}`,
    '',
    `**3. Typical Adult Dosing:**`,
    `• **${a.name}:** ${value(a.dosage.adult) || 'Consult doctor'}`,
    `• **${b.name}:** ${value(b.dosage.adult) || 'Consult doctor'}`,
    '',
    `**4. Pregnancy Safety:**`,
    `• **${a.name}:** ${labelBadge(a.pregnancySafetyLabel)}`,
    `• **${b.name}:** ${labelBadge(b.pregnancySafetyLabel)}`,
    '',
    `⚠️ **Note:** The "better" choice depends entirely on your specific symptoms, medical history, and doctor's advice.`,
    '',
    `Tell me your specific condition or constraints, and I can help you evaluate them further! 😊`,
  ].join('\n');
}

function findByNameLoose(name: string, context: MedScanDatabaseState) {
  const q = name.toLowerCase().trim();
  if (!q) return undefined;
  for (const m of context.medicines.values()) {
    if (`${m.name} ${m.genericName}`.toLowerCase().includes(q)) return m;
  }
  return undefined;
}

/* ── Main response generator ─────────────────────────────────────── */
export function generateResponse(
  intent: IntentResult,
  context: MedScanDatabaseState,
  currentSession: ChatSession
): ChatResponse & { nextActiveMedicineId?: string | null; nextSessionType?: ChatSession['type'] } {

  const resolveMed = () => {
    const id = intent.medicineId ?? context.activeMedicineId ?? currentSession.activeMedicineId ?? null;
    return id ? context.medicines.get(id) : undefined;
  };

  switch (intent.type) {
    case 'greeting':
      return { content: welcome(), suggestions: ['Paracetamol', 'Ibuprofen', 'Allergy medicine', 'Heartburn'] };

    case 'off_topic':
      return { content: offTopicResponse(intent.entities), suggestions: ['Paracetamol dosage', 'Medicines for fever', 'Side effects of Ibuprofen', 'Is Cetirizine safe?'], metadata: { type: 'off_topic' } };

    case 'medicine_lookup': {
      const med = intent.medicineId ? context.medicines.get(intent.medicineId) : undefined;
      if (!med) return { content: 'I could not find that medicine. Please check the spelling or try a shorter name. 🔍', suggestions: ['Paracetamol', 'Ibuprofen', 'Cetirizine', 'Omeprazole'], metadata: { type: 'not_found' } };
      return { content: formatOverview(med), suggestions: nextSuggestions('medicine_lookup', med, currentSession), metadata: { type: 'medicine_overview', medicineId: med.id }, nextActiveMedicineId: med.id, nextSessionType: 'medicine' };
    }

    case 'symptom_query': {
      const meds = (intent.entities || []).map(id => context.medicines.get(id)).filter((m): m is Medicine => !!m);
      const symptom = intent.symptom || 'that symptom';
      return { content: formatSymptomResults(symptom, meds), suggestions: meds.slice(0, 4).map(m => m.name).concat(['Ask about a medicine']).slice(0, 5), metadata: { type: 'symptom_results', symptom }, nextActiveMedicineId: null, nextSessionType: 'symptom' };
    }

    case 'comparison': {
      const meds = intent.entities.map(name => findByNameLoose(name, context)).filter((m): m is Medicine => !!m);
      if (meds.length < 2) return { content: 'To compare, please tell me two medicine names. Example: "Paracetamol vs Ibuprofen". ⚖️', suggestions: ['Paracetamol vs Ibuprofen', 'Cetirizine vs Loratadine', 'Omeprazole vs Famotidine'], metadata: { type: 'need_two_medicines' } };
      return { content: formatComparison(meds[0], meds[1]), suggestions: [`Side effects of ${meds[0].name}`, `Side effects of ${meds[1].name}`, `Dosage of ${meds[0].name}`, `Price of ${meds[0].name}`], metadata: { type: 'comparison', medicineIds: [meds[0].id, meds[1].id] }, nextActiveMedicineId: null, nextSessionType: 'general' };
    }

    case 'clarification': {
      const active = context.activeMedicineId ? context.medicines.get(context.activeMedicineId) : undefined;
      if (active) return { content: `What specific information would you like to know about **${active.name}**? 🤔`, suggestions: ['Side effects', 'Dosage', 'Interactions', 'Pregnancy safety'], metadata: { type: 'clarification', medicineId: active.id } };
      return { content: 'Please type a medicine name or describe a symptom, and I will do my best to help you. 🩺', suggestions: ['Search a medicine', 'Fever medicine', 'Allergy medicine', 'Heartburn medicine'], metadata: { type: 'clarification' } };
    }

    // All medicine-specific intents
    case 'side_effects':
    case 'dosage':
    case 'price':
    case 'rating':
    case 'alcohol_safety':
    case 'interactions':
    case 'pregnancy_safety':
    case 'mechanism':
    case 'quick_tips':
    case 'usage_instructions':
    case 'storage_query':
    case 'missed_dose':
    case 'overdose_emergency':
    case 'composition_query':
    case 'contraindications_query':
    case 'alternatives_query':
    case 'driving_safety':
    case 'lifestyle_diet':
    case 'pediatric_query':
    case 'geriatric_query':
    case 'impairment_query':
    case 'allergy_query':
    case 'discontinuation_query':
    case 'efficacy_query':
    case 'long_term_use':
    case 'breastfeeding_safety':
    case 'kidney_safety':
    case 'liver_safety': {
      const med = resolveMed();
      if (!med) return ensureMedicine(intent.type, context);

      const contentMap: Partial<Record<IntentType, () => string>> = {
        side_effects:           () => formatSideEffects(med),
        dosage:                 () => formatDosage(med, intent.demographic),
        price:                  () => formatPrice(med),
        rating:                 () => `Here are the patient ratings for **${med.name}**: ⭐\n\n• **Excellent:** ${value(med.review_excellent) || 0}%\n• **Average:** ${value(med.review_average) || 0}%\n• **Poor:** ${value(med.review_poor) || 0}%\n\n⚠️ *Individual experiences vary significantly.*`,
        alcohol_safety:         () => formatAlcohol(med),
        interactions:           () => formatInteractions(med),
        pregnancy_safety:       () => formatPregnancySafety(med),
        breastfeeding_safety:   () => formatPregnancySafety(med), // using pregnancy safety template for breastfeeding for now
        mechanism:              () => formatMechanism(med),
        quick_tips:             () => formatQuickTips(med),
        usage_instructions:     () => formatUsageInstructions(med),
        storage_query:          () => formatStorage(med),
        missed_dose:            () => formatMissedDose(med),
        overdose_emergency:     () => formatOverdose(med),
        composition_query:      () => formatComposition(med),
        contraindications_query:() => formatContraindications(med),
        alternatives_query:     () => formatAlternatives(med),
        driving_safety:         () => formatDrivingSafety(med),
        lifestyle_diet:         () => formatAlcohol(med), // using alcohol template for lifestyle/diet for now
        pediatric_query:        () => formatDosage(med, 'child'),
        geriatric_query:        () => formatDosage(med, 'elderly'),
        impairment_query:       () => `${formatKidneySafety(med)}\n\n---\n\n${formatLiverSafety(med)}`,
        allergy_query:          () => formatAllergy(med),
        discontinuation_query:  () => `**How to stop ${med.name}:** 🛑\n\n• Do not stop this medicine suddenly without consulting your doctor.\n• Some medicines require gradual tapering to avoid withdrawal effects.\n\n⚠️ Always complete the prescribed course unless advised otherwise by your doctor.`,
        efficacy_query:         () => `**Effectiveness of ${med.name}:** 📈\n\nIt is primarily used for: **${shortList(med.uses, 3).join(', ') || 'various conditions'}**.\n\n⚠️ *Individual responses vary. Efficacy depends on condition severity, dosage, and adherence.*`,
        long_term_use:          () => `**Long-term use of ${med.name}:** ⏳\n\n• Regular medical review is recommended for chronic use.\n• Monitor for cumulative side effects over time.\n\n⚠️ *Discuss the risks and benefits of long-term use with your doctor.*`,
        kidney_safety:          () => formatKidneySafety(med),
        liver_safety:           () => formatLiverSafety(med),
      };

      const fn = contentMap[intent.type];
      const content = fn ? fn() : `Here is information about **${med.name}**. 😊`;
      const suggestions = nextSuggestions(intent.type, med, currentSession);

      return { content, suggestions, metadata: { type: intent.type, medicineId: med.id }, nextActiveMedicineId: med.id, nextSessionType: 'medicine' };
    }

    default:
      return {
        content: [
          'Please tell me the medicine name or a symptom, and I will gladly guide you. 🩺',
          '',
          'Examples:',
          '• "Paracetamol"',
          '• "Side effects of Ibuprofen"',
          '• "Medicine for fever"',
          '• "Paracetamol vs Ibuprofen"',
          '• "Is Amoxicillin safe during pregnancy?"',
        ].join('\n'),
        suggestions: ['Paracetamol', 'Ibuprofen', 'Cetirizine', 'Omeprazole'],
        metadata: { type: 'help' },
      };
  }
}
