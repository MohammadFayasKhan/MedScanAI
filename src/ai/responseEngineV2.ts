/**
 * MedScanAI : Response Engine V2 — Enhanced
 * Handles 30+ intent types with conversational, context-aware responses.
 */
import type { IntentResult } from './intentEngineV2';
import type { ChatSession, IntentType, MedScanDatabaseState, Medicine } from '../store/useAppStore';
import { buildMedicineIntentResponse } from './responseBuilder';

export interface ChatResponse {
  content: string;
  suggestions: string[];
  metadata?: Record<string, unknown>;
}

function bullet(items: string[]) { return items.map(x => `- ${x}`).join('\n'); }
function shortList(items: string[], max = 4) { return items.slice(0, max); }

/* ── Suggestion sets ─────────────────────────────────────────────── */
const ALL_ACTIONS = ['Side effects', 'Dosage', 'Interactions', 'Pregnancy safety', 'Price', 'Reviews', 'How to use', 'Storage', 'Alternatives', 'Mechanism', 'Quick tips', 'Alcohol safety', 'Kidney safety', 'Liver safety', 'Driving safety', 'Missed dose'];

function nextSuggestions(exclude: IntentType, medicine?: string): string[] {
  const medLabel = medicine ? ` of ${medicine}` : '';
  const all = [
    { label: 'Side effects',     skip: 'side_effects' },
    { label: 'Dosage',           skip: 'dosage' },
    { label: 'Interactions',     skip: 'interactions' },
    { label: 'Pregnancy safety', skip: 'pregnancy_safety' },
    { label: 'Price',            skip: 'price' },
    { label: 'How to use',       skip: 'usage_instructions' },
    { label: 'Storage',          skip: 'storage_query' },
    { label: 'Alternatives',     skip: 'alternatives_query' },
    { label: 'Mechanism',        skip: 'mechanism' },
    { label: 'Alcohol safety',   skip: 'alcohol_safety' },
    { label: 'Missed dose',      skip: 'missed_dose' },
    { label: 'Driving safety',   skip: 'driving_safety' },
  ] as { label: string; skip: IntentType }[];
  void medLabel; void ALL_ACTIONS;
  return all.filter(a => a.skip !== exclude).map(a => a.label).slice(0, 5);
}

/* ── Welcome ─────────────────────────────────────────────────────── */
function welcome(): string {
  return [
    "Hi! I'm your MedScanAI medicine assistant.",
    '',
    'I can help you with:',
    '- Medicine details, dosage, side effects, interactions, and safety',
    '- Symptom-based medicine suggestions',
    '- Pregnancy, alcohol, driving, and kidney/liver safety',
    '- Medicine comparisons',
    '',
    'What would you like to know?',
  ].join('\n');
}

/* ── Off-topic ───────────────────────────────────────────────────── */
function offTopicResponse(entities: string[]): string {
  const topic = entities.slice(0, 3).join(' ');
  return [
    'I specialise in medicine and healthcare information.',
    '',
    topic ? `I noticed you asked about "${topic}". While I cannot help with that, here is what I can do:` : 'Here is what I can help you with:',
    '',
    '- Medicine details and composition',
    '- Dosage, side effects, interactions',
    '- Symptom-based medicine suggestions',
    '- Pregnancy and safety information',
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

/* ── Format functions ────────────────────────────────────────────── */
function formatOverview(m: Medicine): string {
  return [
    `Here is an overview of **${m.name}** (generic: ${m.genericName}).`,
    '',
    `It belongs to **${m.class}**, commonly used for:`,
    bullet(shortList(m.uses, 4)),
    '',
    `Typical adult dose: **${m.dosage.adult}**`,
    '',
    'What would you like to explore next?',
  ].join('\n');
}

function formatSideEffects(m: Medicine): string {
  const common = m.sideEffects.common.length ? m.sideEffects.common : ['No common side effects widely reported.'];
  const rare   = m.sideEffects.rare.length   ? m.sideEffects.rare   : ['No severe rare effects listed.'];
  return [
    `**Side effects of ${m.name}:**`,
    '',
    '**Common (usually mild):**',
    bullet(common),
    '',
    '**Rare but serious:**',
    bullet(rare),
    '',
    '*Consult your doctor if any side effect persists or worsens.*',
  ].join('\n');
}

function formatDosage(m: Medicine, demographic?: IntentResult['demographic']): string {
  if (demographic === 'child') {
    return [
      `**Pediatric dosage for ${m.name}:**`,
      '',
      m.dosage.pediatric || 'Exact pediatric dosing varies by weight and age. Always consult a pediatrician.',
      '',
      '*Never self-adjust dosing for children. Follow your doctor\'s prescription.*',
    ].join('\n');
  }
  if (demographic === 'elderly') {
    return [
      `**Geriatric dosage for ${m.name}:**`,
      '',
      m.dosage.elderly || 'Elderly patients may need reduced doses. Consult your doctor.',
      '',
      `Standard adult dose: ${m.dosage.adult}`,
      '',
      '*Older adults may be more sensitive. Always follow medical advice.*',
    ].join('\n');
  }
  return [
    `**Dosage guidance for ${m.name}:**`,
    '',
    `**Adults:** ${m.dosage.adult || 'Consult your doctor.'}`,
    '',
    `**Children:** ${m.dosage.pediatric || 'Consult a pediatrician.'}`,
    '',
    `**Elderly:** ${m.dosage.elderly || 'Use cautiously; follow medical advice.'}`,
    '',
    "*Always follow your doctor's prescription. Exact dose depends on your condition.*",
  ].join('\n');
}

function formatInteractions(m: Medicine): string {
  const items = m.interactions.length ? m.interactions : ['No major common interactions listed.'];
  return [
    `**Drug interactions for ${m.name}:**`,
    '',
    '**Be cautious with:**',
    bullet(shortList(items, 6)),
    '',
    '*Share all medications and supplements with your doctor before starting this medicine.*',
  ].join('\n');
}

function formatPregnancySafety(m: Medicine): string {
  return [
    `**Pregnancy safety of ${m.name}:**`,
    '',
    `- ${m.pregnancySafety || 'Safety during pregnancy not well established — consult your doctor.'}`,
    m.contraindications.length ? `\n**Contraindications:** ${m.contraindications.join(', ')}` : '',
    '',
    '*Always consult your doctor or gynaecologist before any medication during pregnancy.*',
  ].filter(Boolean).join('\n');
}

function formatUsageInstructions(m: Medicine): string {
  return [
    `**How to use ${m.name}:**`,
    '',
    m.howToUse || m.dosage.adult || 'Follow the instructions on your prescription label.',
    '',
    m.quickTips ? `**Tips:**\n${m.quickTips}` : '',
    '',
    '*Do not crush, chew, or break tablets unless your doctor says it is safe to do so.*',
  ].filter(Boolean).join('\n');
}

function formatStorage(m: Medicine): string {
  return [
    `**Storage instructions for ${m.name}:**`,
    '',
    '- Store in a cool, dry place away from direct sunlight.',
    '- Keep out of reach of children.',
    '- Do not refrigerate unless the label says to.',
    '- Do not use after the expiry date printed on the pack.',
    '',
    '*When in doubt, ask your pharmacist about specific storage requirements.*',
  ].join('\n');
}

function formatMissedDose(m: Medicine): string {
  return [
    `**Missed dose — ${m.name}:**`,
    '',
    '- Take the missed dose as soon as you remember.',
    '- If it is almost time for your next dose, skip the missed dose.',
    '- **Never** take a double dose to make up for a missed one.',
    '',
    '*Contact your doctor if you frequently miss doses.*',
  ].join('\n');
}

function formatOverdose(m: Medicine): string {
  return [
    `⚠️ **Overdose warning — ${m.name}:**`,
    '',
    'If you or someone else has taken too much, seek medical help **immediately**.',
    '',
    '**Steps to take:**',
    '- Call your local emergency number or poison control centre.',
    '- Do not induce vomiting unless instructed by a doctor.',
    '- Take the medicine packaging to the hospital.',
    '',
    '*This is a medical emergency — do not wait for symptoms.*',
  ].join('\n');
}

function formatComposition(m: Medicine): string {
  return [
    `**Composition of ${m.name}:**`,
    '',
    `- **Generic name:** ${m.genericName || 'Not specified'}`,
    `- **Class:** ${m.class || 'Not specified'}`,
    m.manufacturer ? `- **Manufacturer:** ${m.manufacturer}` : '',
    m.packSize ? `- **Pack size:** ${m.packSize}` : '',
    '',
    '*Always read the product label for complete ingredient information.*',
  ].filter(Boolean).join('\n');
}

function formatContraindications(m: Medicine): string {
  const items = m.contraindications.length ? m.contraindications : ['No specific contraindications listed in this dataset.'];
  return [
    `**Contraindications for ${m.name}:**`,
    '',
    '**Do not use if you have:**',
    bullet(items),
    '',
    m.warnings.length ? `**Warnings:**\n${bullet(shortList(m.warnings, 3))}` : '',
    '',
    '*Inform your doctor of all your medical conditions before starting this medicine.*',
  ].filter(Boolean).join('\n');
}

function formatAlternatives(m: Medicine): string {
  return [
    `**Alternatives to ${m.name}:**`,
    '',
    `Since ${m.name} belongs to **${m.class}**, common alternatives in the same class include medicines with similar uses.`,
    '',
    `**Common uses of ${m.name}:** ${shortList(m.uses, 3).join(', ')}`,
    '',
    '**To find the best alternative:**',
    '- Ask your doctor for a substitute with the same active ingredient.',
    '- Search for the generic name in our medicine database.',
    '- Consider generic versions for cost savings.',
    '',
    '*Only switch medicines under medical supervision.*',
  ].join('\n');
}

function formatDrivingSafety(m: Medicine): string {
  return [
    `**Driving safety — ${m.name}:**`,
    '',
    m.drivingSafetyText || `${m.name} may affect alertness in some patients.`,
    '',
    '**General advice:**',
    '- Avoid driving until you know how this medicine affects you.',
    '- Do not drive if you feel dizzy, drowsy, or your vision is affected.',
    '',
    '*When in doubt, do not drive. Ask your doctor.*',
  ].join('\n');
}

function formatAlcohol(m: Medicine): string {
  return buildMedicineIntentResponse('ALCOHOL_SAFETY', m);
}

function formatKidneySafety(m: Medicine): string {
  return [
    `**Kidney safety — ${m.name}:**`,
    '',
    m.kidneySafetyText || `Use of ${m.name} in patients with kidney disease should be done with caution.`,
    '',
    '**For kidney patients:**',
    '- Dose adjustment may be required based on kidney function (GFR/creatinine).',
    '- Regular monitoring of kidney function is recommended.',
    '- Consult your nephrologist before starting or stopping this medicine.',
  ].join('\n');
}

function formatLiverSafety(m: Medicine): string {
  return [
    `**Liver safety — ${m.name}:**`,
    '',
    m.liverSafetyText || `Use of ${m.name} in patients with liver disease requires caution.`,
    '',
    '**For liver patients:**',
    '- Dose reduction may be needed based on liver function tests (ALT, AST, bilirubin).',
    '- Monitor liver enzymes regularly.',
    '- Consult your hepatologist before use.',
  ].join('\n');
}

function formatPediatric(m: Medicine): string {
  return [
    `**Pediatric use of ${m.name}:**`,
    '',
    m.dosage.pediatric || 'Specific pediatric dosing is not available in this dataset.',
    '',
    '**Important:**',
    '- Always dose by body weight (mg/kg) for children.',
    '- Use age-appropriate formulations (syrup, suspension, or dispersible tablets).',
    '- Never give adult tablets to young children without medical advice.',
    '',
    '*Consult a paediatrician for exact dosing.*',
  ].join('\n');
}

function formatGeriatric(m: Medicine): string {
  return [
    `**Geriatric use of ${m.name}:**`,
    '',
    m.dosage.elderly || 'Specific geriatric dosing guidance is not available in this dataset.',
    '',
    '**For elderly patients:**',
    '- Start with the lowest effective dose.',
    '- Kidney and liver function may reduce drug clearance.',
    '- Watch for increased sensitivity to side effects.',
    '- Avoid combinations that increase fall risk.',
    '',
    '*Always consult your doctor for appropriate dosing in older adults.*',
  ].join('\n');
}

function formatAllergy(m: Medicine): string {
  return [
    `**Allergy information — ${m.name}:**`,
    '',
    m.contraindications.length
      ? `Known contraindications include: ${m.contraindications.join(', ')}`
      : 'No specific allergy contraindications listed in this dataset.',
    '',
    '**Signs of allergic reaction:**',
    '- Rash, itching, or hives',
    '- Swelling of face, lips, tongue, or throat',
    '- Difficulty breathing or wheezing',
    '- Severe dizziness',
    '',
    '*Stop the medicine immediately and seek emergency care if you experience any of the above.*',
  ].join('\n');
}

function formatDiscontinuation(m: Medicine): string {
  return [
    `**How to stop ${m.name}:**`,
    '',
    '- Do not stop this medicine suddenly without consulting your doctor.',
    '- Some medicines require gradual tapering to avoid withdrawal effects.',
    '- Follow your doctor\'s instructions on how to taper or discontinue.',
    '',
    '**Common withdrawal considerations:**',
    '- Mood or sleep changes',
    '- Rebound symptoms of the original condition',
    '',
    '*Always complete the prescribed course unless advised otherwise by your doctor.*',
  ].join('\n');
}

function formatEfficacy(m: Medicine): string {
  const uses = shortList(m.uses, 3).join(', ');
  return [
    `**Effectiveness of ${m.name}:**`,
    '',
    `${m.name} is primarily used for: **${uses || 'various conditions'}**.`,
    '',
    m.review_excellent
      ? `**Patient satisfaction ratings:**\n- Excellent: ${m.review_excellent}%\n- Average: ${m.review_average}%\n- Poor: ${m.review_poor}%`
      : 'Patient ratings are not available for this medicine.',
    '',
    '*Individual responses vary. Efficacy depends on condition severity, dosage, and adherence.*',
  ].filter(Boolean).join('\n');
}

function formatLongTermUse(m: Medicine): string {
  return [
    `**Long-term use of ${m.name}:**`,
    '',
    '- Regular medical review is recommended for chronic use.',
    '- Monitor for cumulative side effects over time.',
    m.alcoholSafetyLabel ? `- Alcohol safety: **${m.alcoholSafetyLabel.replace(/_/g, ' ')}**` : '',
    '',
    '**Potential concerns with prolonged use:**',
    '- Tolerance or reduced effectiveness',
    '- Organ function changes (kidney, liver)',
    '- Dependency risk (for certain drug classes)',
    '',
    '*Discuss the risks and benefits of long-term use with your doctor.*',
  ].filter(Boolean).join('\n');
}

function formatSymptomResults(symptom: string, meds: Medicine[]): string {
  const top = meds.slice(0, 6);
  if (!top.length) {
    return [
      `**Medicines for ${symptom}**`,
      '',
      'I did not find direct database matches. Common options for general symptoms:',
      '- Paracetamol — fever, headache, mild pain',
      '- Ibuprofen — fever, inflammation, pain',
      '- Cetirizine — allergy, runny nose',
      '- Omeprazole — acidity, heartburn',
    ].join('\n');
  }
  const list = top.map(m => `**${m.name}:** ${shortList(m.uses, 2).join(', ') || 'General use'}`);
  return [
    `**Medicines commonly used for ${symptom}:**`,
    '',
    bullet(list),
    '',
    'Tell me your age and any conditions (pregnancy, kidney disease, ulcers) and I will help narrow it down.',
  ].join('\n');
}

function formatComparison(a: Medicine, b: Medicine): string {
  return [
    `**${a.name} vs ${b.name}**`,
    '',
    '**Common uses:**',
    `- ${a.name}: ${shortList(a.uses, 3).join(', ')}`,
    `- ${b.name}: ${shortList(b.uses, 3).join(', ')}`,
    '',
    '**Drug class:**',
    `- ${a.name}: ${a.class}`,
    `- ${b.name}: ${b.class}`,
    '',
    '**Typical adult dosing:**',
    `- ${a.name}: ${a.dosage.adult}`,
    `- ${b.name}: ${b.dosage.adult}`,
    '',
    '**Pregnancy safety:**',
    `- ${a.name}: ${a.pregnancySafety}`,
    `- ${b.name}: ${b.pregnancySafety}`,
    '',
    'Tell me your specific condition or constraints and I can help you choose.',
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
      if (!med) return { content: 'I could not find that medicine. Check the spelling or try a shorter name.', suggestions: ['Paracetamol', 'Ibuprofen', 'Cetirizine', 'Omeprazole'], metadata: { type: 'not_found' } };
      return { content: formatOverview(med), suggestions: nextSuggestions('medicine_lookup'), metadata: { type: 'medicine_overview', medicineId: med.id }, nextActiveMedicineId: med.id, nextSessionType: 'medicine' };
    }

    case 'symptom_query': {
      const meds = (intent.entities || []).map(id => context.medicines.get(id)).filter((m): m is Medicine => !!m);
      const symptom = intent.symptom || 'that symptom';
      return { content: formatSymptomResults(symptom, meds), suggestions: meds.slice(0, 4).map(m => m.name).concat(['Ask about a medicine']).slice(0, 5), metadata: { type: 'symptom_results', symptom }, nextActiveMedicineId: null, nextSessionType: 'symptom' };
    }

    case 'comparison': {
      const meds = intent.entities.map(name => findByNameLoose(name, context)).filter((m): m is Medicine => !!m);
      if (meds.length < 2) return { content: 'To compare, tell me two medicine names. Example: "Paracetamol vs Ibuprofen".', suggestions: ['Paracetamol vs Ibuprofen', 'Cetirizine vs Loratadine', 'Omeprazole vs Famotidine'], metadata: { type: 'need_two_medicines' } };
      return { content: formatComparison(meds[0], meds[1]), suggestions: [`Side effects of ${meds[0].name}`, `Side effects of ${meds[1].name}`, `Dosage of ${meds[0].name}`, `Price of ${meds[0].name}`], metadata: { type: 'comparison', medicineIds: [meds[0].id, meds[1].id] }, nextActiveMedicineId: null, nextSessionType: 'general' };
    }

    case 'clarification': {
      const active = context.activeMedicineId ? context.medicines.get(context.activeMedicineId) : undefined;
      if (active) return { content: `What would you like to know about **${active.name}**?`, suggestions: ['Side effects', 'Dosage', 'Interactions', 'Pregnancy safety'], metadata: { type: 'clarification', medicineId: active.id } };
      return { content: 'Type a medicine name or describe a symptom and I will help.', suggestions: ['Search a medicine', 'Fever medicine', 'Allergy medicine', 'Heartburn medicine'], metadata: { type: 'clarification' } };
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
        price:                  () => buildMedicineIntentResponse('PRICE', med),
        rating:                 () => `**Patient ratings for ${med.name}:**\n\n- Excellent: ${med.review_excellent || 0}%\n- Average: ${med.review_average || 0}%\n- Poor: ${med.review_poor || 0}%\n\n*Individual experiences vary significantly.*`,
        alcohol_safety:         () => formatAlcohol(med),
        interactions:           () => formatInteractions(med),
        pregnancy_safety:       () => formatPregnancySafety(med),
        breastfeeding_safety:   () => buildMedicineIntentResponse('PREGNANCY_SAFETY', med),
        mechanism:              () => buildMedicineIntentResponse('MECHANISM', med),
        quick_tips:             () => buildMedicineIntentResponse('QUICK_TIPS', med),
        usage_instructions:     () => formatUsageInstructions(med),
        storage_query:          () => formatStorage(med),
        missed_dose:            () => formatMissedDose(med),
        overdose_emergency:     () => formatOverdose(med),
        composition_query:      () => formatComposition(med),
        contraindications_query:() => formatContraindications(med),
        alternatives_query:     () => formatAlternatives(med),
        driving_safety:         () => formatDrivingSafety(med),
        lifestyle_diet:         () => formatAlcohol(med),
        pediatric_query:        () => formatPediatric(med),
        geriatric_query:        () => formatGeriatric(med),
        impairment_query:       () => `${formatKidneySafety(med)}\n\n---\n\n${formatLiverSafety(med)}`,
        allergy_query:          () => formatAllergy(med),
        discontinuation_query:  () => formatDiscontinuation(med),
        efficacy_query:         () => formatEfficacy(med),
        long_term_use:          () => formatLongTermUse(med),
        kidney_safety:          () => formatKidneySafety(med),
        liver_safety:           () => formatLiverSafety(med),
      };

      const fn = contentMap[intent.type];
      const content = fn ? fn() : `Here is information about **${med.name}**.`;
      const suggestions = nextSuggestions(intent.type);

      return { content, suggestions, metadata: { type: intent.type, medicineId: med.id }, nextActiveMedicineId: med.id, nextSessionType: 'medicine' };
    }

    default:
      return {
        content: [
          'Tell me the medicine name or symptom and I will guide you.',
          '',
          'Examples:',
          '- "Paracetamol"',
          '- "Side effects of Ibuprofen"',
          '- "Medicine for fever"',
          '- "Paracetamol vs Ibuprofen"',
          '- "Is Amoxicillin safe during pregnancy?"',
        ].join('\n'),
        suggestions: ['Paracetamol', 'Ibuprofen', 'Cetirizine', 'Omeprazole'],
        metadata: { type: 'help' },
      };
  }
}
