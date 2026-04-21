/**
 * MedScan+ V4 — Medical Data Enrichment Engine
 *
 * Problem: The CSV only has 8 columns, leaving 20+ Medicine fields blank.
 * Solution: Parse the composition string + infer from drug class to generate
 *           medically accurate, safe clinical content for every section.
 *
 * Pipeline:
 *   1. parseComposition()  — "Paracetamol (500mg)" → { generic, strength }
 *   2. getDrugClassData()  — category → structured clinical knowledge
 *   3. enrichMedicine()    — returns a fully-populated, display-ready object
 *
 * All generated content is medically conservative and includes disclaimers.
 */
import { Medicine } from '../types/medicine';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface ParsedComposition {
  generic: string;
  strength: string;
  isCombo: boolean;
  components: { name: string; strength: string }[];
}

export interface EnrichedMedicine {
  /** Core fields (from CSV, always accurate) */
  brandName: string;
  generic: string;
  strength: string;
  form: string;
  category: string;

  /** Enriched / inferred fields */
  mechanism: string;
  indications: string;
  dosageAdult: string;
  dosageChild: string;
  timing: string;
  administrationTips: string;
  storage: string;
  pregnancy: string;
  pediatric: string;
  driving: string;
  sideEffectsCommon: string;
  sideEffectsSerious: string;
  interactions: string;
  contraindications: string;
  substitutes: string[];

  /** Source tracking */
  isEnriched: boolean; // true = content was inferred
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Parse composition string
// ─────────────────────────────────────────────────────────────────────────────
export function parseComposition(raw: string): ParsedComposition {
  if (!raw) return { generic: '', strength: '', isCombo: false, components: [] };

  const clean = raw.trim();
  // Split on '+' for combo drugs
  const parts = clean.split(/\s*\+\s*/);
  const components: { name: string; strength: string }[] = [];

  for (const part of parts) {
    // Match "DrugName (strength)" or "DrugName (NA)" or just "DrugName"
    const match = part.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (match) {
      const name     = match[1].trim();
      const strVal   = match[2].trim();
      // Ignore "(NA)", "(N/A)", "(—)" as missing strength
      const strength = /^(na|n\/a|—|-|nil|unknown)$/i.test(strVal) ? '' : strVal;
      components.push({ name, strength });
    } else {
      components.push({ name: part.trim(), strength: '' });
    }
  }

  const generic   = components.map(c => c.name).join(' + ');
  const strength  = components.map(c => c.strength).filter(Boolean).join(' + ') || '';
  const isCombo   = components.length > 1;

  return { generic, strength, isCombo, components };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Drug-class knowledge base
// ─────────────────────────────────────────────────────────────────────────────
interface DrugClassData {
  mechanism: string;
  dosageAdult: string;
  dosageChild: string;
  timing: string;
  administrationTips: string;
  storage: string;
  pregnancy: string;
  pediatric: string;
  driving: string;
  sideEffectsCommon: string;
  sideEffectsSerious: string;
  interactions: string;
  contraindications: string;
}

// Normalise category strings for matching
function matchCategory(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('aminophenol') || c.includes('paracetamol') || c.includes('acetaminophen')) return 'paracetamol';
  if (c.includes('nsaid') || c.includes('non-steroidal') || c.includes('aceclofenac') || c.includes('ibuprofen') || c.includes('diclofenac') || c.includes('naproxen')) return 'nsaid';
  if (c.includes('antibiotic') || c.includes('penicillin') || c.includes('amoxicillin') || c.includes('cephalosporin') || c.includes('macrolide') || c.includes('azithromycin') || c.includes('quinolone') || c.includes('ciprofloxacin')) return 'antibiotic';
  if (c.includes('antihypertensive') || c.includes('amlodipine') || c.includes('calcium channel') || c.includes('ace inhibitor') || c.includes('angiotensin')) return 'antihypertensive';
  if (c.includes('antihistamine') || c.includes('cetirizine') || c.includes('levocetirizine') || c.includes('loratadine') || c.includes('allergic')) return 'antihistamine';
  if (c.includes('proton pump') || c.includes('omeprazole') || c.includes('pantoprazole') || c.includes('ppi') || c.includes('antacid') || c.includes('anti-ulcer') || c.includes('gastrointestinal')) return 'ppi';
  if (c.includes('statin') || c.includes('atorvastatin') || c.includes('rosuvastatin') || c.includes('cholesterol')) return 'statin';
  if (c.includes('antidiabetic') || c.includes('metformin') || c.includes('diabetes') || c.includes('insulin') || c.includes('hypoglycaemic')) return 'antidiabetic';
  if (c.includes('antifungal') || c.includes('clotrimazole') || c.includes('fluconazole') || c.includes('ketoconazole')) return 'antifungal';
  if (c.includes('antiviral') || c.includes('acyclovir') || c.includes('oseltamivir')) return 'antiviral';
  if (c.includes('corticosteroid') || c.includes('steroid') || c.includes('prednisolone') || c.includes('dexamethasone') || c.includes('betamethasone')) return 'corticosteroid';
  if (c.includes('antidepressant') || c.includes('ssri') || c.includes('sertraline') || c.includes('fluoxetine')) return 'antidepressant';
  if (c.includes('bronchodilator') || c.includes('salbutamol') || c.includes('inhaler') || c.includes('respiratory') || c.includes('asthma')) return 'bronchodilator';
  if (c.includes('vitamin') || c.includes('mineral') || c.includes('supplement') || c.includes('calcium') || c.includes('iron') || c.includes('folic')) return 'supplement';
  if (c.includes('ophthalmic') || c.includes('eye') || c.includes('ocular')) return 'ophthalmic';
  if (c.includes('antispasmodic') || c.includes('buscopan') || c.includes('dicyclomine')) return 'antispasmodic';
  if (c.includes('antiemetic') || c.includes('ondansetron') || c.includes('domperidone') || c.includes('metoclopramide')) return 'antiemetic';
  if (c.includes('monoclonal') || c.includes('biologic') || c.includes('mab')) return 'biologic';
  if (c.includes('butyrophenone') || c.includes('antipsychotic') || c.includes('haloperidol') || c.includes('phenothiazine')) return 'antipsychotic';
  return 'general';
}

const DRUG_CLASS_DB: Record<string, DrugClassData> = {
  paracetamol: {
    mechanism: 'Inhibits prostaglandin synthesis in the central nervous system (CNS). Acts on the hypothalamic heat-regulating centre to lower elevated body temperature. It does not have significant anti-inflammatory activity at standard doses.',
    dosageAdult: '500–1000 mg every 4–6 hours as needed. Maximum dose: 4000 mg per day.',
    dosageChild: '10–15 mg/kg bodyweight every 4–6 hours as needed. Maximum 5 doses in 24 hours.',
    timing: 'Can be taken with or without food. Best taken at the first sign of pain or fever.',
    administrationTips: 'Swallow tablets whole with a full glass of water. Oral suspensions should be shaken well before use. Do not exceed the recommended dose - overdose causes serious liver damage.',
    storage: 'Store below 25°C in a cool, dry place. Protect from light and moisture. Keep out of reach of children.',
    pregnancy: 'Generally considered safe at recommended doses during all trimesters. Use the lowest effective dose for the shortest duration. Always consult your doctor before use during pregnancy.',
    pediatric: 'Safe for use in children and infants at appropriate weight-based doses. Use paediatric formulations (suspension/drops). Do not exceed 5 doses in 24 hours.',
    driving: 'No significant effect on driving ability at recommended doses.',
    sideEffectsCommon: 'Generally very well tolerated. Occasionally: nausea, stomach upset, skin rash (rare).',
    sideEffectsSerious: 'Hepatotoxicity (liver damage) with overdose - seek immediate emergency care. Severe allergic reactions including skin blistering (Stevens-Johnson syndrome) - extremely rare.',
    interactions: 'Warfarin: prolonged use may increase anticoagulant effect. Alcohol: concurrent use significantly increases the risk of liver damage. Other paracetamol-containing products: avoid combining (risk of overdose). Enzyme inducers (rifampicin, carbamazepine): may reduce efficacy.',
    contraindications: 'Severe hepatic (liver) impairment. Known hypersensitivity or allergy to paracetamol. Use with caution in chronic alcohol users, patients with malnutrition, or those with glucose-6-phosphate dehydrogenase (G6PD) deficiency.',
  },
  nsaid: {
    mechanism: 'Non-steroidal anti-inflammatory drug (NSAID). Inhibits cyclooxygenase (COX-1 and COX-2) enzymes, reducing the synthesis of prostaglandins — the chemical mediators responsible for pain, inflammation, and fever.',
    dosageAdult: 'Dose varies by specific NSAID and indication. Typically taken 2–3 times daily. Always use the lowest effective dose for the shortest duration.',
    dosageChild: 'Use only under medical supervision with weight-appropriate dosing. Some NSAIDs are not recommended for children under 12.',
    timing: 'Take with food, milk, or an antacid to reduce risk of stomach irritation and ulcers.',
    administrationTips: 'Always take with food or milk. Drink plenty of water. Do not lie down for 15–30 minutes after taking. Avoid in dehydrated or elderly patients without medical supervision.',
    storage: 'Store at room temperature (below 25°C), away from heat, moisture, and direct sunlight.',
    pregnancy: 'Generally avoid during the third trimester — associated with premature closure of the ductus arteriosus. Use in first and second trimesters only if clearly necessary and under medical supervision.',
    pediatric: 'Use with caution. Aspirin should never be given to children under 16 due to the risk of Reye\'s syndrome.',
    driving: 'May cause dizziness or drowsiness in some patients. Exercise caution while driving.',
    sideEffectsCommon: 'Nausea, indigestion, stomach pain, diarrhoea, headache, dizziness. Long-term use may cause gastric erosion or ulceration.',
    sideEffectsSerious: 'Gastrointestinal bleeding and perforation. Cardiovascular events (increased risk of heart attack/stroke with long-term use). Kidney damage. Severe allergic reactions.',
    interactions: 'Anticoagulants (warfarin): increased bleeding risk. Other NSAIDs: avoid combining. ACE inhibitors/ARBs: may reduce antihypertensive effect and increase kidney risk. Lithium: increases lithium levels. Methotrexate: increases toxicity.',
    contraindications: 'Active peptic ulcer disease. Severe heart failure, kidney failure, or liver failure. History of NSAID-induced bronchospasm. Third trimester of pregnancy. History of gastrointestinal bleeding caused by NSAIDs.',
  },
  antibiotic: {
    mechanism: 'Inhibits bacterial cell wall synthesis or protein synthesis (depending on the specific antibiotic class), preventing bacterial growth and replication. Active against a broad spectrum of gram-positive and gram-negative bacteria.',
    dosageAdult: 'Dose, frequency, and duration depends on the specific antibiotic and type of infection. Complete the full prescribed course — do not stop early even if feeling better.',
    dosageChild: 'Weight-based dosing — always refer to your doctor\'s prescription. Paediatric formulations (suspensions) are available.',
    timing: 'Some antibiotics should be taken on an empty stomach; others with food. Refer to your specific medicine\'s instructions.',
    administrationTips: 'Always complete the full course of antibiotics. Do not share antibiotics or use leftover courses. Space doses evenly throughout the day. Probiotics may help reduce antibiotic-associated diarrhoea.',
    storage: 'Store in a cool, dry place. Oral suspensions once prepared must be stored in the refrigerator and discarded after 7–14 days as per label directions.',
    pregnancy: 'Some antibiotics are safe in pregnancy (e.g., penicillins, cephalosporins); others should be avoided (e.g., tetracyclines, fluoroquinolones). Always consult your doctor.',
    pediatric: 'Many antibiotics are safe for children with appropriate dosing. Avoid tetracyclines in children under 8 years.',
    driving: 'Generally no significant effect. Some combinations may cause dizziness — use caution.',
    sideEffectsCommon: 'Nausea, vomiting, diarrhoea, stomach cramps, yeast infections, skin rash.',
    sideEffectsSerious: 'Severe allergic reactions (anaphylaxis) — seek emergency help immediately. Clostridioides difficile-associated diarrhoea with prolonged use. Tendon rupture (fluoroquinolones).',
    interactions: 'Warfarin: many antibiotics can increase anticoagulant effect. Oral contraceptives: some antibiotics may reduce efficacy. Antacids: may reduce absorption of some antibiotics — take 2 hours apart.',
    contraindications: 'Known allergy or hypersensitivity to the specific antibiotic or drug class (cross-reactivity may occur within classes, e.g., penicillin allergy and some cephalosporins). Severe liver or kidney impairment (dose adjustment needed).',
  },
  antihypertensive: {
    mechanism: 'Reduces elevated blood pressure through specific pharmacological mechanisms (e.g., calcium channel blockers relax blood vessel walls; ACE inhibitors reduce angiotensin II production; ARBs block angiotensin II receptors). This decreases the workload on the heart.',
    dosageAdult: 'Once or twice daily, as prescribed. Blood pressure medicines are typically taken long-term. Do not adjust dose or stop without consulting your doctor.',
    dosageChild: 'Not routinely used in children — under specialist supervision only.',
    timing: 'Often best taken at the same time each day. Some are taken in the evening (e.g., certain calcium channel blockers). Follow your doctor\'s instructions.',
    administrationTips: 'Take even if you feel well — high blood pressure often has no symptoms. Do not stop suddenly without medical advice (can cause rebound hypertension). Monitor blood pressure regularly.',
    storage: 'Store at room temperature (below 25°C), away from moisture and direct sunlight.',
    pregnancy: 'Use only if clearly necessary. Some antihypertensives (e.g., ACE inhibitors, ARBs) are CONTRAINDICATED in pregnancy — they can cause fetal harm. Consult your doctor immediately.',
    pediatric: 'Generally under specialist supervision only. Dosing is age and weight specific.',
    driving: 'May cause dizziness, especially when starting treatment. Avoid driving until you know how the medicine affects you.',
    sideEffectsCommon: 'Headache, flushing, ankle swelling (calcium channel blockers). Dry cough (ACE inhibitors). Dizziness when standing up (postural hypotension).',
    sideEffectsSerious: 'Severe hypotension (very low blood pressure). Heart failure exacerbation. Kidney function changes (ACE inhibitors/ARBs). Elevated potassium (hyperkalaemia).',
    interactions: 'Other antihypertensives: additive effect (blood pressure may fall too low). NSAIDs: reduce antihypertensive effect. Potassium supplements/potassium-sparing diuretics: risk of hyperkalaemia with ACE inhibitors.',
    contraindications: 'ACE inhibitors and ARBs: contraindicated in bilateral renal artery stenosis, pregnancy. Calcium channel blockers: certain types contraindicated in heart block.',
  },
  antihistamine: {
    mechanism: 'Competitively blocks H1 histamine receptors, preventing histamine from causing allergic symptoms such as itching, sneezing, runny nose, watery eyes, and hives. Newer-generation antihistamines (e.g., cetirizine, loratadine) are non-sedating.',
    dosageAdult: 'Typically 5–10 mg once daily (e.g., cetirizine) or 10 mg once daily (loratadine). Some older antihistamines are taken 3–4 times daily.',
    dosageChild: 'Children 2–6 years: 2.5 mg/day. Children 6–12 years: 5 mg/day. Over 12 years: adult dose. Use paediatric formulations as appropriate.',
    timing: 'Can be taken at any time of day. Those with mild sedating effect are better taken at bedtime.',
    administrationTips: 'Can be taken with or without food. Tablets should be swallowed whole. Syrups should be measured accurately.',
    storage: 'Store at room temperature below 30°C. Protect from moisture and sunlight.',
    pregnancy: 'Consult your doctor. Chlorphenamine (older antihistamine) is generally preferred when treatment is necessary. Cetirizine is considered relatively safe but consult your doctor.',
    pediatric: 'Generally safe with age-appropriate dosing. Avoid sedating antihistamines in young children due to CNS effects.',
    driving: 'Non-sedating types: generally safe for driving. Sedating types: do NOT drive or operate machinery.',
    sideEffectsCommon: 'Non-sedating: headache, dry mouth, nausea (mild). Sedating: drowsiness, dizziness, dry mouth, blurred vision, urinary retention.',
    sideEffectsSerious: 'Prolonged QT interval (rare, with some antihistamines). Severe allergic reaction — rare.',
    interactions: 'CNS depressants (alcohol, sedatives, sleeping pills): increased sedation with older antihistamines. MAO inhibitors: avoid with antihistamines.',
    contraindications: 'Known hypersensitivity to antihistamines. Caution in glaucoma, enlarged prostate, severe liver disease. Sedating antihistamines: avoid in patients who need to drive.',
  },
  ppi: {
    mechanism: 'Proton pump inhibitor (PPI). Irreversibly inhibits the hydrogen-potassium ATPase enzyme (the "proton pump") in gastric parietal cells, blocking the final step in gastric acid secretion. This dramatically reduces stomach acid production.',
    dosageAdult: '20–40 mg once daily, typically before breakfast. For severe conditions (e.g., GERD, Zollinger-Ellison syndrome), doses may be higher. Use for the minimum necessary duration.',
    dosageChild: 'Weight-based dosing under specialist supervision.',
    timing: 'Take 30–60 minutes before the first meal of the day for best effectiveness. The proton pump is most active when stimulated by food.',
    administrationTips: 'Swallow whole — do not crush or chew enteric-coated tablets. If unable to swallow, some capsules can be opened and mixed with a small amount of applesauce.',
    storage: 'Store at room temperature below 30°C. Protect from moisture. Keep capsules in original container.',
    pregnancy: 'Consult your doctor. Some PPIs (e.g., omeprazole) may be used cautiously during pregnancy if benefits outweigh risks.',
    pediatric: 'Used in infants with GERD under specialist guidance. Weight-adjusted dosing essential.',
    driving: 'May cause dizziness or visual disturbances rarely. Exercise caution until you know how this medicine affects you.',
    sideEffectsCommon: 'Headache, diarrhoea, nausea, abdominal pain, flatulence, constipation. Generally well tolerated.',
    sideEffectsSerious: 'Long-term use: reduced magnesium levels (hypomagnesaemia), vitamin B12 deficiency, increased risk of C. difficile infection, possible increased fracture risk. Rare: severe skin reactions.',
    interactions: 'Clopidogrel: PPIs (especially omeprazole) may reduce antiplatelet effect. Methotrexate: PPIs may increase methotrexate toxicity. Drugs requiring acidic environment (e.g., ketoconazole, atazanavir): reduced absorption.',
    contraindications: 'Known hypersensitivity to the drug or other PPIs (cross-sensitivity). Not for long-term use without medical supervision and regular review.',
  },
  statin: {
    mechanism: 'HMG-CoA reductase inhibitor. Blocks the enzyme HMG-CoA reductase, which is responsible for producing cholesterol in the liver. This reduces LDL ("bad") cholesterol, total cholesterol, and triglycerides while modestly increasing HDL ("good") cholesterol.',
    dosageAdult: '10–80 mg once daily depending on required lipid reduction and tolerability. Usually started at a low dose and adjusted based on response.',
    dosageChild: 'Only for familial hypercholesterolaemia under specialist care from age 8–10 years.',
    timing: 'Most statins are taken in the evening (cholesterol synthesis peaks at night). However, some newer statins (e.g., rosuvastatin, atorvastatin) can be taken at any time.',
    administrationTips: 'Can be taken with or without food. Avoid large quantities of grapefruit juice — it can significantly increase the blood level of some statins (e.g., simvastatin, atorvastatin), increasing the risk of side effects.',
    storage: 'Store at room temperature below 30°C, away from moisture and direct sunlight.',
    pregnancy: 'CONTRAINDICATED in pregnancy and breastfeeding. Use highly effective contraception during treatment. Discontinue if pregnancy is confirmed.',
    pediatric: 'Use under specialist supervision in familial hypercholesterolaemia only.',
    driving: 'No significant effect on driving. Dizziness rarely reported.',
    sideEffectsCommon: 'Muscle aches and pains (myalgia) — most common reason for stopping. Headache, nausea, abdominal pain, elevated liver enzymes.',
    sideEffectsSerious: 'Myopathy or rhabdomyolysis (severe muscle breakdown — rare but serious). Liver toxicity. New-onset diabetes. Cognitive effects (memory issues — rare and reversible).',
    interactions: 'Fibrates (especially gemfibrozil): increased risk of muscle damage. CYP3A4 inhibitors (e.g., azole antifungals, some antibiotics, grapefruit): increase statin levels and side effect risk. Warfarin: statins can enhance anticoagulant effect.',
    contraindications: 'Active liver disease or unexplained persistent elevated liver enzymes. Pregnancy or breastfeeding. Known hypersensitivity to statins. Personal or family history of myopathy.',
  },
  antidiabetic: {
    mechanism: 'Reduces blood glucose levels through various mechanisms depending on the drug class. Metformin reduces hepatic glucose production and improves insulin sensitivity. Sulfonylureas stimulate pancreatic insulin secretion. Insulin directly replaces or supplements endogenous insulin.',
    dosageAdult: 'Dose is individualised based on blood glucose levels, HbA1c targets, kidney function, and tolerability. Adjustments are made gradually under medical supervision.',
    dosageChild: 'Metformin approved for children ≥10 years with type 2 diabetes. Insulin used in type 1 diabetes at any age.',
    timing: 'Metformin: take with or immediately after meals to reduce GI side effects. Sulfonylureas: usually before meals. Insulin: timing depends on type (fast-acting before meals, long-acting once/twice daily).',
    administrationTips: 'Monitor blood glucose regularly. Carry glucose tablets or sugar in case of hypoglycaemia. Never skip meals when taking insulin or sulfonylureas. Inform all healthcare providers you are diabetic.',
    storage: 'Tablets: room temperature below 25°C. Insulin: unopened vials/pens in refrigerator (2–8°C). Open insulin: room temperature for up to 28 days (check label). Do not freeze insulin.',
    pregnancy: 'Insulin is the preferred treatment in diabetes during pregnancy. Metformin may be used under specialist guidance. Many oral antidiabetics should be avoided. Close monitoring is essential.',
    pediatric: 'Metformin and insulin are used in paediatric type 2 and type 1 diabetes respectively — under specialist care.',
    driving: 'May drive if blood glucose levels are well controlled. Be aware of hypoglycaemia symptoms. Do not drive if blood glucose is low — eat before driving.',
    sideEffectsCommon: 'Metformin: nausea, diarrhoea, stomach upset (usually transient). Sulfonylureas: hypoglycaemia (low blood sugar), weight gain. Insulin: hypoglycaemia, injection site reactions.',
    sideEffectsSerious: 'Severe hypoglycaemia. Lactic acidosis with metformin (rare — mainly in kidney failure). Diabetic ketoacidosis if insulin is omitted in type 1 diabetes.',
    interactions: 'Beta-blockers: may mask hypoglycaemia symptoms. NSAIDs: may mask hypoglycaemia. Alcohol: increases hypoglycaemia risk. Many medicines affect blood glucose — always inform your doctor about all medicines.',
    contraindications: 'Metformin: eGFR <30 ml/min (severe kidney impairment), acute/decompensated heart failure, liver failure, or conditions causing lactic acidosis risk. Sulfonylureas: avoid in severe kidney/liver disease.',
  },
  bronchodilator: {
    mechanism: 'Relaxes bronchial smooth muscle via beta-2 adrenergic receptor stimulation (e.g., salbutamol) or anticholinergic mechanisms (e.g., ipratropium), resulting in bronchodilation and relief of airflow obstruction. Used in asthma and COPD.',
    dosageAdult: 'SABA (e.g., salbutamol): 1–2 puffs (100–200 mcg) when needed. Maximum 8 puffs per day. If needed >3 times per week, consult your doctor — step-up therapy may be required.',
    dosageChild: 'Children 4–11 years: typically 100 mcg per dose. Always use a spacer device in young children for better drug delivery.',
    timing: 'Short-acting bronchodilators when needed (rescue use). Long-acting bronchodilators at fixed times daily. Take controller medicines as prescribed even when not symptomatic.',
    administrationTips: 'Use correct inhaler technique — shake well, exhale fully, inhale slowly and deeply, hold breath for 10 seconds. Use a spacer if possible. Gargle after using steroid inhalers. Clean inhaler device regularly.',
    storage: 'Store below 25°C. Do not expose to extreme heat or cold. Do not puncture or incinerate even when empty. Keep cap on when not in use.',
    pregnancy: 'Short-acting beta-agonists (e.g., salbutamol) are generally considered safe for use during pregnancy. Uncontrolled asthma poses a greater risk to the baby than the medicine. Consult your doctor.',
    pediatric: 'Salbutamol inhalers are commonly used in children with asthma. Always use a spacer device for children under 5. Ensure correct inhaler technique.',
    driving: 'Generally no effect on driving at recommended doses. Avoid if experiencing severe breathlessness.',
    sideEffectsCommon: 'Tremor (shaking), fast heartbeat, headache, dizziness, throat irritation, muscle cramps.',
    sideEffectsSerious: 'Paradoxical bronchospasm (worsening of breathing — stop medication). Severe hypokalaemia (low potassium) with high doses. Cardiac arrhythmias at very high doses.',
    interactions: 'Beta-blockers (including eye drops): counteract the effect of beta-agonists — avoid combination. Theophylline: increased risk of arrhythmias. Diuretics: may worsen hypokalaemia.',
    contraindications: 'Hypersensitivity to the drug. Tachyarrhythmias. Use with extreme caution in severe ischaemic heart disease.',
  },
  antifungal: {
    mechanism: 'Inhibits the synthesis of ergosterol — a vital component of the fungal cell membrane — leading to cell membrane disruption and fungal death (azoles: fluconazole, clotrimazole). Topical antifungals disrupt fungal membrane integrity.',
    dosageAdult: 'Varies by infection type and severity. Oral: typically 50–400 mg daily depending on indication. Topical: apply thin layer to affected area once or twice daily.',
    dosageChild: 'Weight-based dosing for systemic antifungals — specialist supervision required.',
    timing: 'Oral antifungals: can be taken with or without food. Topical: apply to clean, dry skin.',
    administrationTips: 'Continue topical treatment for 1–2 weeks after symptoms resolve to prevent recurrence. Wash hands before and after applying topical preparations. Avoid covering treated area with tight dressings.',
    storage: 'Tablets: below 25°C, away from moisture. Creams/gels: below 25°C. Do not freeze topical preparations.',
    pregnancy: 'Oral azoles (e.g., fluconazole) should generally be avoided in pregnancy — especially single high doses (risk of fetal harm). Topical antifungals are considered low risk. Consult your doctor.',
    pediatric: 'Topical antifungals generally safe. Systemic antifungals under specialist guidance only.',
    driving: 'Oral antifungals may rarely cause dizziness — exercise caution.',
    sideEffectsCommon: 'Oral: nausea, abdominal pain, headache, liver enzyme elevation. Topical: local irritation, burning (usually mild and transient).',
    sideEffectsSerious: 'Severe liver toxicity (oral agents, rare). Stevens-Johnson syndrome (rare). Anaphylaxis (rare).',
    interactions: 'Many clinically significant interactions due to CYP enzyme inhibition. Warfarin: significantly increased anticoagulant effect. Statins: increased risk of muscle toxicity. Many other drugs affected — always check with your pharmacist.',
    contraindications: 'Known hypersensitivity. Significant liver disease (systemic agents). Concurrent administration of certain drugs that prolong QT interval.',
  },
  antipsychotic: {
    mechanism: 'Blocks dopamine D2 receptors in the mesolimbic pathway, reducing psychotic symptoms such as hallucinations, delusions, and thought disorder. Some also block serotonin, histamine, and muscarinic receptors, contributing to both therapeutic effects and side effects.',
    dosageAdult: 'Highly individualised. Started at low doses and titrated based on response and tolerability. Always under psychiatric supervision. Never adjust dose without consulting your doctor.',
    dosageChild: 'Under specialist psychiatric care only.',
    timing: 'Often taken once or twice daily. Some formulations (depot injections) given every 2–4 weeks. Consistent timing improves efficacy.',
    administrationTips: 'Do not stop suddenly — abrupt discontinuation can cause rebound psychosis or withdrawal symptoms. Report any unusual muscle movements to your doctor immediately.',
    storage: 'Store at room temperature below 25°C. Protect from light and moisture. Liquid formulations: check label for specific storage requirements.',
    pregnancy: 'Must be discussed with psychiatrist. Risk of untreated psychosis during pregnancy often outweighs medicine risks. Some antipsychotics associated with neonatal withdrawal symptoms.',
    pediatric: 'Only under specialist psychiatric supervision. Use lowest effective dose. Monitor for metabolic and movement side effects.',
    driving: 'These medicines cause sedation and impair reaction time — avoid driving especially when starting treatment.',
    sideEffectsCommon: 'Sedation/drowsiness, weight gain, dry mouth, constipation, orthostatic hypotension, increased appetite.',
    sideEffectsSerious: 'Extrapyramidal side effects (tremor, rigidity, akathisia, dystonia). Tardive dyskinesia with long-term use. Metabolic syndrome (weight gain, diabetes, dyslipidaemia). Neuroleptic malignant syndrome (rare, potentially fatal).',
    interactions: 'CNS depressants (alcohol, opioids, benzodiazepines): enhanced sedation. Lithium: increased neurotoxicity risk. Drugs that prolong QT interval: risk of dangerous arrhythmias.',
    contraindications: 'CNS depression, coma, known bone marrow suppression, Parkinson\'s disease (typical antipsychotics), known hypersensitivity.',
  },
  corticosteroid: {
    mechanism: 'Synthetic glucocorticoid that mimics the action of natural cortisol. Exerts potent anti-inflammatory and immunosuppressive effects by inhibiting phospholipase A2 (reducing prostaglandin and leukotriene synthesis) and suppressing the activity of immune cells.',
    dosageAdult: 'Highly variable by condition and route (oral, inhaled, topical, injected). Oral: typically 5–60 mg prednisolone equivalent daily. Doses are tapered gradually after prolonged use.',
    dosageChild: 'Weight-based dosing — specialist supervision required. Use the lowest effective dose for the shortest duration.',
    timing: 'Oral: typically taken in the morning with breakfast (to mimic natural cortisol rhythm and reduce insomnia). Inhaled: twice daily at regular intervals.',
    administrationTips: 'Always take with food to reduce gastric irritation. Never stop abruptly after prolonged use — dose must be tapered gradually under medical supervision. Carry a steroid card if on long-term treatment.',
    storage: 'Store at room temperature below 25°C. Protect from moisture and light.',
    pregnancy: 'Consult doctor — some corticosteroids used in pregnancy (e.g., betamethasone for fetal lung maturation). Long-term oral steroids require careful maternal and fetal monitoring.',
    pediatric: 'Use minimum effective dose for shortest duration — prolonged use impairs growth. Inhaled corticosteroids for asthma are preferred over systemic.',
    driving: 'May cause vision changes (cataracts with long-term use), psychiatric effects. Report any mood or vision changes to your doctor.',
    sideEffectsCommon: 'Weight gain, increased appetite, fluid retention, mood changes, elevated blood sugar, acne, poor wound healing.',
    sideEffectsSerious: 'Cushing\'s syndrome with long-term high-dose use. Adrenal suppression. Osteop orosis and fractures. Immune suppression (increased infection risk). Hypokalaemia. Hypertension.',
    interactions: 'NSAIDs: increased GI bleeding risk. Antidiabetics: corticosteroids raise blood glucose — dose adjustments needed. Vaccines: avoid live vaccines during immunosuppressive doses.',
    contraindications: 'Systemic infections. Live vaccines during high-dose treatment. Peptic ulceration (relative). Osteoporosis (relative). Psychotic disorders (relative).',
  },
  antiemetic: {
    mechanism: 'Blocks dopamine D2 receptors in the chemoreceptor trigger zone (CTZ) and/or acts on peripheral 5-HT3 receptors (ondansetron) to suppress nausea and vomiting signals.',
    dosageAdult: 'Ondansetron: 4–8 mg 1–3 times daily. Domperidone: 10 mg 3 times daily before meals. Metoclopramide: 10 mg 3 times daily.',
    dosageChild: 'Weight-based dosing under medical guidance. Some antiemetics (e.g., metoclopramide) have age restrictions.',
    timing: 'Take 30 minutes before meals or as directed.',
    administrationTips: 'Use for the shortest duration needed. Metoclopramide should not be used for more than 5 days.',
    storage: 'Store below 25°C. Protect from light.',
    pregnancy: 'Consult your doctor. Ondansetron and metoclopramide may be used for severe nausea and vomiting (hyperemesis gravidarum) under medical supervision.',
    pediatric: 'Use under medical supervision. Metoclopramide: risk of extrapyramidal effects — use cautiously.',
    driving: 'May cause sedation and dizziness — exercise caution while driving.',
    sideEffectsCommon: 'Headache, constipation, diarrhoea, dry mouth, sedation.',
    sideEffectsSerious: 'Extrapyramidal reactions (metoclopramide, especially in children and young adults). QT prolongation (ondansetron at high doses). Tardive dyskinesia with prolonged use.',
    interactions: 'CNS depressants: enhanced sedation. QT-prolonging drugs (domperidone, ondansetron). Levodopa: domperidone preferred over other antiemetics in Parkinson\'s.',
    contraindications: 'GI obstruction or perforation. Pheochromocytoma (metoclopramide). Known hypersensitivity.',
  },
  antispasmodic: {
    mechanism: 'Relaxes smooth muscle in the gastrointestinal tract and urinary tract by blocking muscarinic acetylcholine receptors (anticholinergic effect) or by directly relaxing smooth muscle, reducing spasm and associated pain.',
    dosageAdult: 'Typically 10–20 mg 3–4 times daily or as needed.',
    dosageChild: 'Lower doses adjusted by weight — consult your doctor.',
    timing: 'Take 15–30 minutes before meals and at bedtime.',
    administrationTips: 'Can be taken with or without food. Take with a full glass of water.',
    storage: 'Store at room temperature below 30°C.',
    pregnancy: 'Use only if clearly necessary — consult your doctor.',
    pediatric: 'Use under medical supervision with appropriate dosing.',
    driving: 'May cause blurred vision and drowsiness — do not drive until you know how the medicine affects you.',
    sideEffectsCommon: 'Dry mouth, constipation, blurred vision, urinary retention (especially in elderly men), tachycardia.',
    sideEffectsSerious: 'Severe urinary retention. Paralytic ileus. Acute angle-closure glaucoma.',
    interactions: 'Other anticholinergic drugs: additive effects (dry mouth, constipation, confusion). Antacids: reduce absorption — take 1 hour apart.',
    contraindications: 'Glaucoma, urinary retention, myasthenia gravis, GI obstruction, paralytic ileus.',
  },
  supplement: {
    mechanism: 'Provides essential vitamins, minerals, or micronutrients that may be deficient in the diet or increased requirements exist (pregnancy, illness, malabsorption). Supports normal physiological processes.',
    dosageAdult: 'As directed by your doctor or per label instructions. Do not exceed recommended daily allowances unless medically advised.',
    dosageChild: 'Children-specific formulations available — refer to product labelling or doctor\'s advice.',
    timing: 'Most supplements best taken with food to improve absorption and reduce stomach upset. Iron and vitamin D are better absorbed with meals.',
    administrationTips: 'Vitamin C enhances iron absorption — take together. Calcium supplements should not be taken with iron (competitive absorption). Give at least 2 hours apart from dairy products if warranted.',
    storage: 'Store at room temperature below 25°C. Protect from moisture and direct sunlight. Keep out of children\'s reach (especially iron supplements — iron overdose in children is serious).',
    pregnancy: 'Folic acid (400 mcg daily) is essential pre-conception and in the first trimester. Iron and calcium supplementation commonly needed. Vitamin A megadoses should be avoided.',
    pediatric: 'Many supplements are safe for children — use paediatric formulations with age-specific doses. Iron and vitamin A toxicity possible in overdose — keep away from children.',
    driving: 'No significant effect on driving.',
    sideEffectsCommon: 'Iron: constipation, dark/black stools, stomach upset. Vitamin D: nausea at high doses. Calcium: constipation. Most supplements well tolerated at recommended doses.',
    sideEffectsSerious: 'Iron overdose in children: potentially fatal — keep safely out of reach. Vitamin D toxicity with excessive doses. Vitamin A toxicity with megadoses.',
    interactions: 'Iron: reduced absorption with antacids, tetracyclines, fluoroquinolones — take 2 hours apart. Calcium supplements: reduce absorption of iron, bisphosphonates, thyroid hormones.',
    contraindications: 'Iron: haemochromatosis, haemolytic anaemia. Calcium: hypercalcaemia, hypophosphataemia. Vitamin A: megadoses in pregnancy (teratogenic at high doses).',
  },
  ophthalmic: {
    mechanism: 'Delivers active medication directly to the eye. Depending on the active ingredient: antibiotic drops kill bacteria, anti-inflammatory drops suppress ocular inflammation, lubricating drops relieve dryness, glaucoma drops reduce intraocular pressure.',
    dosageAdult: 'Typically 1–2 drops into the affected eye(s), 2–4 times daily as prescribed.',
    dosageChild: 'Same dose as adults (1–2 drops). Ensure correct technique to avoid contamination.',
    timing: 'Follow your doctor\'s prescribed schedule. Space multiple eye drop medications by at least 5–10 minutes.',
    administrationTips: 'Wash hands before use. Tilt head back, gently pull down lower eyelid to form a pocket. Do not touch the dropper to your eye or any surface to prevent contamination. Press on the inner corner of the eye (nasolacrimal occlusion) for 1–2 minutes after instillation to reduce systemic absorption. Remove contact lenses before instillation — wait at least 15 minutes before reinserting.',
    storage: 'Store in a cool place (2–25°C) — some require refrigeration. Discard within 4 weeks of opening. Do not share with others.',
    pregnancy: 'Many ophthalmic preparations have minimal systemic absorption and are considered safe. Always inform your doctor.',
    pediatric: 'Can be used in children with appropriate dose adjustment. Use the smallest effective dose.',
    driving: 'May temporarily blur vision immediately after instillation — wait for vision to clear before driving.',
    sideEffectsCommon: 'Temporary stinging, burning, or blurred vision immediately after instillation. Sensitivity to light.',
    sideEffectsSerious: 'Allergic reactions. Systemic side effects (rare, more common with glaucoma drops — e.g., beta-blocker drops causing bradycardia or bronchospasm). Corneal toxicity with prolonged use of some preservatives.',
    interactions: 'Glaucoma drops (especially beta-blockers): can interact with systemic medications — inform your doctor about all medicines.',
    contraindications: 'Use of eye drops containing steroids: avoid in undiagnosed red eye, herpes simplex keratitis. Avoid antibiotic eye drops in those with known allergy to the drug class.',
  },
  biologic: {
    mechanism: 'Large-molecule biological agent (typically a monoclonal antibody or fusion protein) that targets specific molecular pathways involved in disease (e.g., VEGF in tumour angiogenesis, TNF-α in autoimmune disease, PD-1/PD-L1 in cancer immunotherapy).',
    dosageAdult: 'Administered by intravenous infusion or subcutaneous injection — schedule and dose strictly as prescribed by specialist oncologist or rheumatologist.',
    dosageChild: 'Paediatric use under specialist supervision only.',
    timing: 'As per infusion/injection schedule prescribed by your specialist (typically every 1–4 weeks).',
    administrationTips: 'Administered in a clinical setting by trained healthcare professionals. Report any infusion reactions immediately. Ensure vaccinations are up to date before starting biologic therapy.',
    storage: 'Refrigerate at 2–8°C. Do not freeze. Allow to reach room temperature before administration.',
    pregnancy: 'Discuss with your specialist — many biologics cross the placenta. Contraception required during and for a period after treatment.',
    pediatric: 'Under oncology or paediatric rheumatology specialist supervision only.',
    driving: 'Fatigue and dizziness may occur — avoid driving on infusion days.',
    sideEffectsCommon: 'Infusion reactions (flushing, chills, fever, nausea), fatigue, headache, nausea.',
    sideEffectsSerious: 'Serious infections (risk of reactivation of TB, hepatitis B). Gastrointestinal perforation (bevacizumab). Cardiac toxicity. Secondary malignancies. Severe infusion reactions (anaphylaxis).',
    interactions: 'Live vaccines: avoid during treatment. Major pharmacokinetic interactions less common than small molecules but specific interactions exist — review with specialist.',
    contraindications: 'Active serious infection. Prior hypersensitivity to the biologic. Active autoimmune conditions (for immunomodulatory biologics).',
  },
  antidepressant: {
    mechanism: 'SSRIs block the reuptake of serotonin from the synaptic cleft, increasing its availability. This enhances serotonergic neurotransmission, improving mood, anxiety, and other depressive symptoms. Effect takes 2–4 weeks to manifest.',
    dosageAdult: 'Sertraline: 50–200 mg daily. Fluoxetine: 20–60 mg daily. Individual dosing titrated gradually under psychiatric supervision.',
    dosageChild: 'Fluoxetine approved for children ≥8 years with depression. Use under specialist supervision.',
    timing: 'Take at the same time each day. Morning dosing preferred (can cause insomnia). Food doesn\'t affect absorption significantly.',
    administrationTips: 'Do not stop abruptly after several weeks of treatment — taper gradually to avoid discontinuation syndrome (dizziness, nausea, electric shock sensations). Full therapeutic benefit takes 4–6 weeks.',
    storage: 'Store at room temperature below 25°C. Protect from moisture.',
    pregnancy: 'Consult psychiatrist. Untreated severe depression in pregnancy carries significant risks. SSRIs may be used cautiously — neonatal withdrawal syndrome possible if used near delivery.',
    pediatric: 'Fluoxetine approved for children ≥8 years. Close monitoring for suicidal ideation required in adolescents starting antidepressants.',
    driving: 'Impairs reaction time in early treatment — use caution until you know how the medicine affects you.',
    sideEffectsCommon: 'Nausea, diarrhoea, insomnia, dry mouth, headache, sexual dysfunction, sweating.',
    sideEffectsSerious: 'Serotonin syndrome (when combined with other serotonergic agents — medical emergency). Increased suicidal ideation in young adults starting treatment (monitor closely). Hyponatraemia (especially in elderly).',
    interactions: 'MAO inhibitors: NEVER combine — risk of fatal serotonin syndrome. Triptans, tramadol, other SSRIs/SNRIs: serotonin syndrome risk. Warfarin: increased bleeding risk. Many significant interactions — always check with pharmacist.',
    contraindications: 'Concurrent use of MAO inhibitors. Known hypersensitivity. Uncontrolled epilepsy.',
  },
  antiviral: {
    mechanism: 'Interferes with viral replication. Nucleoside/nucleotide analogues (e.g., acyclovir) are incorporated into viral DNA, inhibiting viral polymerase. Neuraminidase inhibitors (oseltamivir) prevent influenza virus from spreading between cells.',
    dosageAdult: 'Acyclovir for herpes: 200–800 mg 5 times daily for 5–10 days. Oseltamivir for influenza: 75 mg twice daily for 5 days.',
    dosageChild: 'Weight-based dosing — consult your doctor.',
    timing: 'Must be taken at evenly spaced intervals to maintain consistent antiviral drug levels.',
    administrationTips: 'Antiviral efficacy is best when treatment is started early. Maintain adequate hydration when taking acyclovir (reduces risk of crystalluria in vulnerable patients). Complete the full prescribed course.',
    storage: 'Store at room temperature below 25°C, away from moisture and heat.',
    pregnancy: 'Acyclovir: commonly used for herpes simplex and varicella in pregnancy under medical supervision. Consult your doctor.',
    pediatric: 'Both acyclovir and oseltamivir are used in children with weight-appropriate dosing.',
    driving: 'May cause dizziness — exercise caution.',
    sideEffectsCommon: 'Nausea, vomiting, headache, stomach discomfort. Topical acyclovir: mild local burning or itching.',
    sideEffectsSerious: 'Acute kidney injury with IV acyclovir (rare with oral). Neurological effects at high doses. Oseltamivir: rare psychiatric effects in children and adolescents.',
    interactions: 'Probenecid: reduces acyclovir renal excretion. Nephrotoxic drugs: avoid combining with high-dose acyclovir.',
    contraindications: 'Known hypersensitivity. Renal impairment: dose adjustment required.',
  },
  general: {
    mechanism: 'This medicine exerts its therapeutic effect through pharmacological pathways relevant to its drug class and indicated condition.',
    dosageAdult: 'Take as directed by your doctor or pharmacist. Follow the prescribed dose, frequency, and duration exactly.',
    dosageChild: 'Only use in children under medical advice with age and weight-appropriate dosing.',
    timing: 'Take at the same time each day for best results. Some medicines are best taken with food.',
    administrationTips: 'Swallow tablets whole with a full glass of water unless prescribed otherwise. Do not crush or chew unless your doctor or pharmacist advises it is safe to do so.',
    storage: 'Store in a cool, dry place below 25°C. Protect from direct sunlight and moisture. Keep all medicines out of reach of children.',
    pregnancy: 'Always consult your doctor before taking any medicine during pregnancy or while breastfeeding.',
    pediatric: 'Only use in children under medical supervision with appropriate dosing. Never use adult formulations in children without specific guidance.',
    driving: 'Check with your doctor or pharmacist about whether this medicine affects your ability to drive or operate machinery.',
    sideEffectsCommon: 'Side effects vary by medicine. If you experience any unusual symptoms, consult your doctor or pharmacist.',
    sideEffectsSerious: 'Seek immediate medical attention for any severe or unexpected reactions.',
    interactions: 'Always inform your doctor and pharmacist about ALL medicines, supplements, and herbal products you take to check for interactions.',
    contraindications: 'Do not take this medicine if you have had an allergic reaction to it or similar medicines. Consult your doctor if you have any chronic medical conditions.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Main enrichment function
// ─────────────────────────────────────────────────────────────────────────────
export function enrichMedicine(medicine: Medicine): EnrichedMedicine {
  // Parse composition to extract generic name and strength
  const parsed = parseComposition(medicine.active_substance || medicine.international_name || '');

  // Determine drug class
  const classKey = matchCategory(medicine.category || '');
  const classData = DRUG_CLASS_DB[classKey] || DRUG_CLASS_DB.general;

  const brandName = medicine.brand_name;
  const generic   = parsed.generic || medicine.brand_name;
  const strength  = parsed.strength || '';
  const form      = medicine.pharmaceutical_form || 'Tablet';
  const category  = medicine.category || '';

  // Use CSV data where available; fall back to class-level knowledge
  const has = (v?: string) => !!(v?.trim()) && !/^(na|n\/a|—|-|nil|unknown)?$/i.test(v.trim());

  return {
    brandName,
    generic,
    strength,
    form,
    category,

    mechanism:          has(medicine.mechanism_of_action)  ? medicine.mechanism_of_action!  : classData.mechanism,
    indications:        has(medicine.therapeutic_indications) ? medicine.therapeutic_indications! : `Used in the treatment and management of conditions appropriate for ${generic || category} therapy.`,
    dosageAdult:        has(medicine.typical_dosing) ? medicine.typical_dosing! : classData.dosageAdult,
    dosageChild:        classData.dosageChild,
    timing:             has(medicine.timing_info) ? medicine.timing_info! : classData.timing,
    administrationTips: has(medicine.administration_tips) ? medicine.administration_tips! : classData.administrationTips,
    storage:            has(medicine.storage_info) ? medicine.storage_info! : classData.storage,
    pregnancy:          has(medicine.pregnancy_warning) ? medicine.pregnancy_warning! : classData.pregnancy,
    pediatric:          has(medicine.pediatric_warning) ? medicine.pediatric_warning! : classData.pediatric,
    driving:            has(medicine.driving_warning) ? medicine.driving_warning! : classData.driving,
    sideEffectsCommon:  has(medicine.common_side_effects) ? medicine.common_side_effects! : classData.sideEffectsCommon,
    sideEffectsSerious: has(medicine.serious_side_effects) ? medicine.serious_side_effects! : classData.sideEffectsSerious,
    interactions:       has(medicine.drug_interactions) ? medicine.drug_interactions! : classData.interactions,
    contraindications:  has(medicine.hypersensitivity_info) ? medicine.hypersensitivity_info! : classData.contraindications,
    substitutes:        medicine.substitutes ? medicine.substitutes.split('|').map(s=>s.trim()).filter(Boolean) : [],

    isEnriched: classKey !== 'general',
  };
}
