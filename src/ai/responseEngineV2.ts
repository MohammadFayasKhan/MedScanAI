/**
 * MedScanAI : Response Engine V2
 * All em-dashes removed. Clean colon-based separators. Improved spacing.
 * Added off_topic handler with polite redirect.
 */
import type { IntentResult } from './intentEngineV2';
import type { ChatSession, IntentType, MedScanDatabaseState, Medicine } from '../store/useAppStore';
import { buildMedicineIntentResponse } from './responseBuilder';

export interface ChatResponse {
  content: string;
  suggestions: string[];
  metadata?: Record<string, unknown>;
}

function bullet(items: string[]) {
  return items.map(x => `- ${x}`).join('\n');
}

function shortList(items: string[], max = 4) {
  return items.slice(0, max);
}

/* ── Welcome ──────────────────────────────────────────────────────── */
function welcome(): string {
  return [
    "Hi! I'm your MedScan medicine assistant.",
    '',
    'I can help you with:',
    '',
    '- Find information about a medicine',
    '- Answer questions about dosage, side effects, interactions, and safety',
    '- Suggest medicines commonly used for symptoms like fever or headache',
    '',
    'What would you like to know?',
  ].join('\n');
}

/* ── Off-topic polite redirect ────────────────────────────────────── */
function offTopicResponse(entities: string[]): string {
  const topic = entities.slice(0, 3).join(' ');
  return [
    "I specialize in medicine and healthcare information.",
    '',
    topic ? `I noticed you asked about "${topic}". While I cannot help with that, here is what I can do:` : 'Here is what I can help you with:',
    '',
    '- Medicine details and composition',
    '- Dosage and administration guidance',
    '- Side effects and warnings',
    '- Drug interactions',
    '- Symptom-based medicine suggestions',
    '- Pregnancy and pediatric safety',
    '',
    'Try asking:',
    '',
    '- "What is Paracetamol used for?"',
    '- "Dosage of Amoxicillin"',
    '- "Medicines for fever"',
    '- "Is Ibuprofen safe in pregnancy?"',
  ].join('\n');
}

/* ── Need medicine prompt ─────────────────────────────────────────── */
function ensureMedicine(intent: IntentType, context: MedScanDatabaseState): ChatResponse {
  const active = context.activeMedicineId ? context.medicines.get(context.activeMedicineId) : undefined;
  const topic =
    intent === 'side_effects'    ? 'side effects'
    : intent === 'dosage'        ? 'dosage'
    : intent === 'interactions'  ? 'interactions'
    : 'safety';

  if (active) {
    return {
      content: `Do you mean ${topic} for ${active.name}? If yes, ask again or tap a suggestion below.`,
      suggestions: ['Side effects', 'Dosage', 'Interactions', 'Pregnancy safety'],
      metadata: { type: 'clarification', activeMedicineId: active.id },
    };
  }

  return {
    content: `Which medicine should I check ${topic} for? Type the name (for example: Paracetamol) or search from recent.`,
    suggestions: ['Paracetamol', 'Ibuprofen', 'Cetirizine', 'Omeprazole'],
    metadata: { type: 'need_medicine' },
  };
}

/* ── Format functions (no em-dashes, clean spacing) ──────────────── */
function formatOverview(m: Medicine): string {
  const uses = shortList(m.uses, 4);
  return [
    `Here is an overview of **${m.name}** (generic name: ${m.genericName}).`,
    '',
    `It belongs to a class of medicines known as **${m.class}**, and it is most commonly used to treat:`,
    bullet(uses),
    '',
    `The typical dose is generally **${m.dosage.adult}**, but this can vary depending on your specific condition.`,
    '',
    'Let me know if you would like to dive deeper into its side effects, dosage instructions, or safety warnings!'
  ].join('\n');
}

function formatSideEffects(m: Medicine): string {
  const common = m.sideEffects.common.length
    ? m.sideEffects.common
    : ['No common side effects are widely reported for this medicine.'];
  const rare = m.sideEffects.rare.length
    ? m.sideEffects.rare
    : ['No severe rare effects are listed.'];

  return [
    `Like most medicines, **${m.name}** can cause some side effects, though not everyone gets them.`,
    '',
    '**Common side effects (usually mild and go away as your body adjusts):**',
    bullet(common),
    '',
    '**Rare but serious side effects (seek medical attention if you experience these):**',
    bullet(rare),
    '',
    '*Note: This is not a complete list. Always consult your doctor if a side effect bothers you or does not go away.*'
  ].join('\n');
}

function formatDosage(m: Medicine): string {
  const isPediatric = m.name.toLowerCase().includes('oral suspension') || m.name.toLowerCase().includes('syrup') || m.name.toLowerCase().includes('drops');
  
  const adultText = isPediatric && m.dosage.adult.toLowerCase().includes('child') 
    ? m.dosage.adult.replace(/Adults:/i, '').trim() 
    : m.dosage.adult;

  return [
    `Here is the general dosage guidance for **${m.name}**:`,
    '',
    isPediatric ? '**General Dosing:**' : '**Adults:**',
    adultText || 'Consult a doctor for appropriate dosage.',
    '',
    '**Children:**',
    m.dosage.pediatric || 'Please consult a pediatrician for exact child dosing.',
    '',
    '**Older adults:**',
    m.dosage.elderly || 'Use cautiously and follow medical advice.',
    '',
    '*Disclaimer: Always follow your doctor\\'s prescription. The exact dose and duration depend on what you are being treated for.*'
  ].join('\n');
}

function formatInteractions(m: Medicine): string {
  const interactions = m.interactions.length
    ? m.interactions
    : ['There are no major common interactions listed for this medicine.'];

  return [
    `When taking **${m.name}**, it is important to be careful about what you mix it with.`,
    '',
    '**You should be cautious with the following:**',
    bullet(shortList(interactions, 6)),
    '',
    '*Tip: If you share what other medications or supplements you are currently taking, I can help check for specific interactions!*'
  ].join('\n');
}

function formatPregnancySafety(m: Medicine): string {
  const cautions = [
    m.pregnancySafety,
    ...(m.contraindications.length ? [`**Contraindications:** ${m.contraindications.join(', ')}`] : []),
  ].filter(Boolean);

  return [
    `Here is what you need to know about taking **${m.name}** during pregnancy and breastfeeding:`,
    '',
    bullet(cautions),
    '',
    '*Please remember: You should always consult your doctor or gynecologist before taking any new medication during pregnancy.*'
  ].join('\n');
}

function formatPrice(m: Medicine): string {
  return buildMedicineIntentResponse('PRICE', m);
}

function formatRating(m: Medicine): string {
  return [
    `Here is how patients typically rate **${m.name}**:`,
    '',
    `- **Excellent:** ${m.review_excellent || '0'}%`,
    `- **Average:** ${m.review_average || '0'}%`,
    `- **Poor:** ${m.review_poor || '0'}%`,
    '',
    '*Keep in mind that individual experiences can vary significantly based on the condition being treated.*'
  ].join('\n');
}

function formatAlcoholSafety(m: Medicine): string {
  return buildMedicineIntentResponse('ALCOHOL_SAFETY', m);
}

function formatMechanism(m: Medicine): string {
  return buildMedicineIntentResponse('MECHANISM', m);
}

function formatQuickTips(m: Medicine): string {
  return buildMedicineIntentResponse('QUICK_TIPS', m);
}

function formatSymptomResults(symptom: string, meds: Medicine[]): string {
  const top = meds.slice(0, 5);
  if (!top.length) {
    return [
      `**Medicines commonly used for ${symptom}**`,
      '',
      'I did not find direct matches for that symptom. Try searching a medicine name instead.',
      '',
      'Common options for general symptoms:',
      '• Paracetamol - fever, headache, mild pain',
      '• Ibuprofen - fever, inflammation, pain',
      '• Cetirizine - allergy, runny nose',
      '• Omeprazole - acidity, heartburn',
    ].join('\n');
  }

  const list = top.map(m => `**${m.name}:** ${shortList(m.uses, 2).join(', ') || 'Common use varies'}`);
  return [
    `**Options commonly used for ${symptom}**`,
    '',
    bullet(list),
    '',
    'Tell me your age and any key conditions (pregnancy, ulcers, kidney disease) and I will help narrow it down.',
  ].join('\n');
}

function formatComparison(a: Medicine, b: Medicine): string {
  return [
    `**${a.name} vs ${b.name}**`,
    '',
    '**Common uses:**',
    `• ${a.name}: ${shortList(a.uses, 3).join(', ')}`,
    `• ${b.name}: ${shortList(b.uses, 3).join(', ')}`,
    '',
    '**Quick differences:**',
    `• Class: ${a.class} vs ${b.class}`,
    '• Typical adult dosing:',
    `  - ${a.name}: ${a.dosage.adult}`,
    `  - ${b.name}: ${b.dosage.adult}`,
    '',
    'If you share what you are treating and your constraints (pregnancy, ulcers, kidney disease, blood thinners), I can help choose between them.',
  ].join('\n');
}

function findByNameLoose(name: string, context: MedScanDatabaseState) {
  const q = name.toLowerCase().trim();
  if (!q) return undefined;
  for (const m of context.medicines.values()) {
    const hay = `${m.name} ${m.genericName}`.toLowerCase();
    if (hay.includes(q)) return m;
  }
  return undefined;
}

/* ── Main response generator ──────────────────────────────────────── */
export function generateResponse(
  intent: IntentResult,
  context: MedScanDatabaseState,
  currentSession: ChatSession
): ChatResponse & { nextActiveMedicineId?: string | null; nextSessionType?: ChatSession['type'] } {

  switch (intent.type) {
    case 'greeting': {
      return { content: welcome(), suggestions: ['Paracetamol', 'Ibuprofen', 'Allergy medicine', 'Heartburn'] };
    }

    case 'off_topic': {
      return {
        content: offTopicResponse(intent.entities),
        suggestions: ['Paracetamol dosage', 'Medicines for fever', 'Side effects of Ibuprofen', 'Is Cetirizine safe?'],
        metadata: { type: 'off_topic' },
      };
    }

    case 'medicine_lookup': {
      const med = intent.medicineId ? context.medicines.get(intent.medicineId) : undefined;
      if (!med) {
        return {
          content: 'I could not match that medicine in the offline database. Check the spelling, or try a shorter name.',
          suggestions: ['Paracetamol', 'Ibuprofen', 'Cetirizine', 'Omeprazole'],
          metadata: { type: 'not_found' },
        };
      }

      return {
        content: formatOverview(med),
        suggestions: ['Side effects', 'Dosage', 'Interactions', 'Pregnancy safety'],
        metadata: { type: 'medicine_overview', medicineId: med.id },
        nextActiveMedicineId: med.id,
        nextSessionType: 'medicine',
      };
    }

    case 'symptom_query': {
      const meds = (intent.entities || [])
        .map(id => context.medicines.get(id))
        .filter((m): m is Medicine => !!m);

      const symptom = intent.symptom || 'that symptom';
      return {
        content: formatSymptomResults(symptom, meds),
        suggestions: meds.slice(0, 4).map(m => m.name).concat(['Ask about a specific medicine']).slice(0, 6),
        metadata: { type: 'symptom_results', symptom },
        nextActiveMedicineId: null,
        nextSessionType: 'symptom',
      };
    }

    case 'side_effects':
    case 'dosage':
    case 'price':
    case 'rating':
    case 'alcohol_safety':
    case 'interactions':
    case 'pregnancy_safety':
    case 'mechanism':
    case 'quick_tips': {
      const medicineId = intent.medicineId ?? context.activeMedicineId ?? currentSession.activeMedicineId ?? null;
      if (!medicineId) return ensureMedicine(intent.type, context);

      const med = context.medicines.get(medicineId);
      if (!med) return ensureMedicine(intent.type, context);

      const content =
        intent.type === 'side_effects'    ? formatSideEffects(med)
        : intent.type === 'dosage'        ? formatDosage(med)
        : intent.type === 'price'         ? formatPrice(med)
        : intent.type === 'rating'        ? formatRating(med)
        : intent.type === 'alcohol_safety'? formatAlcoholSafety(med)
        : intent.type === 'interactions'  ? formatInteractions(med)
        : intent.type === 'mechanism'     ? formatMechanism(med)
        : intent.type === 'quick_tips'    ? formatQuickTips(med)
        : formatPregnancySafety(med);

      const allSuggestions = ['Side effects', 'Dosage', 'Interactions', 'Pregnancy safety', 'Price', 'Reviews', 'Quick tips', 'Alcohol safety', 'Mechanism'];
      
      const suggestions = allSuggestions
          .filter(s => {
            if (intent.type === 'side_effects'    && s === 'Side effects')    return false;
            if (intent.type === 'dosage'          && s === 'Dosage')          return false;
            if (intent.type === 'price'           && s === 'Price')           return false;
            if (intent.type === 'rating'          && s === 'Reviews')         return false;
            if (intent.type === 'alcohol_safety'  && s === 'Alcohol safety')  return false;
            if (intent.type === 'interactions'    && s === 'Interactions')    return false;
            if (intent.type === 'pregnancy_safety'&& s === 'Pregnancy safety')return false;
            if (intent.type === 'mechanism'       && s === 'Mechanism')       return false;
            if (intent.type === 'quick_tips'      && s === 'Quick tips')      return false;
            return true;
          })
          .sort(() => 0.5 - Math.random())
          .slice(0, 4);

      return {
        content,
        suggestions,
        metadata: { type: intent.type, medicineId: med.id },
        nextActiveMedicineId: med.id,
        nextSessionType: 'medicine',
      };
    }

    case 'comparison': {
      const entities = intent.entities || [];
      const meds = entities
        .map(name => findByNameLoose(name, context))
        .filter((m): m is Medicine => !!m);

      if (meds.length < 2) {
        return {
          content: 'To compare, tell me two medicine names. Example: "Paracetamol vs Ibuprofen". You can also pick from recent.',
          suggestions: ['Paracetamol vs Ibuprofen', 'Cetirizine vs Loratadine', 'Omeprazole vs Famotidine'],
          metadata: { type: 'need_two_medicines' },
        };
      }

      return {
        content: formatComparison(meds[0], meds[1]),
        suggestions: ['Side effects comparison', 'Dosage comparison', meds[0].name, meds[1].name].slice(0, 4),
        metadata: { type: 'comparison', medicineIds: [meds[0].id, meds[1].id] },
        nextActiveMedicineId: null,
        nextSessionType: 'general',
      };
    }

    case 'clarification': {
      const active = context.activeMedicineId ? context.medicines.get(context.activeMedicineId) : undefined;
      if (active) {
        return {
          content: `What would you like to know about **${active.name}**?`,
          suggestions: ['Side effects', 'Dosage', 'Interactions', 'Pregnancy safety'],
          metadata: { type: 'clarification', medicineId: active.id },
        };
      }

      return {
        content: 'Do you want a medicine overview, or are you asking about a symptom?',
        suggestions: ['Search a medicine name', 'Fever medicine', 'Allergy medicine', 'Heartburn medicine'],
        metadata: { type: 'clarification' },
      };
    }

    default: {
      return {
        content: [
          'Tell me the medicine name or symptom, and I will guide you.',
          '',
          'Examples:',
          '• "Paracetamol"',
          '• "side effects" (after selecting a medicine)',
          '• "heartburn medicine"',
          '• "Paracetamol vs Ibuprofen"',
        ].join('\n'),
        suggestions: ['Paracetamol', 'Ibuprofen', 'Cetirizine', 'Omeprazole'],
        metadata: { type: 'help' },
      };
    }
  }
}
