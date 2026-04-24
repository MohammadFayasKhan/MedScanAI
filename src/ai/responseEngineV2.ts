/**
 * MedScan+ : Response Engine V2
 * All em-dashes removed. Clean colon-based separators. Improved spacing.
 * Added off_topic handler with polite redirect.
 */
import type { IntentResult } from './intentEngineV2';
import type { ChatSession, IntentType, MedScanDatabaseState, Medicine } from '../store/useAppStore';

export interface ChatResponse {
  content: string;
  suggestions: string[];
  metadata?: Record<string, unknown>;
}

function bullet(items: string[]) {
  return items.map(x => `• ${x}`).join('\n');
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
    '• A medicine name (example: Paracetamol)',
    '• A symptom (example: fever, allergy, heartburn)',
    '• Dosage, side effects, interactions, or safety',
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
    '• Medicine details and composition',
    '• Dosage and administration guidance',
    '• Side effects and warnings',
    '• Drug interactions',
    '• Symptom-based medicine suggestions',
    '• Pregnancy and pediatric safety',
    '',
    'Try asking:',
    '• "What is Paracetamol used for?"',
    '• "Dosage of Amoxicillin"',
    '• "Medicines for fever"',
    '• "Is Ibuprofen safe in pregnancy?"',
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
  const uses = shortList(m.uses, 6);
  return [
    `**${m.name}**`,
    '',
    `**Class:** ${m.class} (generic: ${m.genericName})`,
    '',
    '**What it is commonly used for:**',
    bullet(uses),
    '',
    `**Common adult dose:** ${m.dosage.adult}`,
    '',
    'Ask me about dosage, side effects, interactions, or safety.',
  ].join('\n');
}

function formatSideEffects(m: Medicine): string {
  const common = m.sideEffects.common.length
    ? m.sideEffects.common
    : ['No common side effects listed for this entry'];
  const rare = m.sideEffects.rare.length
    ? m.sideEffects.rare
    : ['No rare effects listed for this entry'];
  const notes = shortList(m.warnings, 2);

  return [
    `**Side Effects of ${m.name}**`,
    '',
    '**Common (often mild):**',
    bullet(common),
    '',
    '**Rare or serious (seek medical help if severe):**',
    bullet(rare),
    '',
    notes.length ? '**Key notes:**\n' + bullet(notes) : '',
    '',
    'Note: Most side effects ease as your body adjusts. Consult a doctor if severe symptoms persist.',
  ].filter(Boolean).join('\n');
}

function formatDosage(m: Medicine): string {
  return [
    `**Dosage Guide for ${m.name}**`,
    '',
    '**Adults:**',
    m.dosage.adult,
    '',
    '**Children:**',
    m.dosage.pediatric,
    '',
    '**Older adults:**',
    m.dosage.elderly,
    '',
    'Note: Always follow your doctor\'s prescription. Do not exceed the recommended dose.',
    '',
    'If you share the age and condition being treated, I can help you find the most relevant dosage.',
  ].join('\n');
}

function formatInteractions(m: Medicine): string {
  const interactions = m.interactions.length
    ? m.interactions
    : ['No common interactions listed for this entry'];

  return [
    `**Interactions for ${m.name}**`,
    '',
    '**Medicines or substances to be cautious with:**',
    bullet(shortList(interactions, 8)),
    '',
    '**Practical tip:**',
    'List your current medicines and I can highlight the most relevant interaction risks.',
    '',
    'Note: Always inform your doctor about all medicines you are taking.',
  ].join('\n');
}

function formatPregnancySafety(m: Medicine): string {
  const cautions = shortList(
    [
      m.pregnancySafety,
      ...(m.contraindications.length ? [`Contraindications: ${m.contraindications.join(', ')}`] : []),
    ].filter(Boolean),
    4
  );

  return [
    `**Pregnancy and Breastfeeding Safety for ${m.name}**`,
    '',
    bullet(cautions),
    '',
    'Note: Always consult your doctor before taking any medicine during pregnancy or breastfeeding.',
    '',
    'Share your trimester and whether you are breastfeeding, and I can tailor the guidance.',
  ].join('\n');
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
    case 'interactions':
    case 'pregnancy_safety': {
      const medicineId = intent.medicineId ?? context.activeMedicineId ?? currentSession.activeMedicineId ?? null;
      if (!medicineId) return ensureMedicine(intent.type, context);

      const med = context.medicines.get(medicineId);
      if (!med) return ensureMedicine(intent.type, context);

      const content =
        intent.type === 'side_effects'    ? formatSideEffects(med)
        : intent.type === 'dosage'        ? formatDosage(med)
        : intent.type === 'interactions'  ? formatInteractions(med)
        : formatPregnancySafety(med);

      return {
        content,
        suggestions: ['Back to overview', 'Side effects', 'Dosage', 'Interactions', 'Pregnancy safety']
          .filter(s => {
            if (intent.type === 'side_effects'    && s === 'Side effects')    return false;
            if (intent.type === 'dosage'          && s === 'Dosage')          return false;
            if (intent.type === 'interactions'    && s === 'Interactions')    return false;
            if (intent.type === 'pregnancy_safety'&& s === 'Pregnancy safety')return false;
            return true;
          })
          .slice(0, 4),
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
