/**
 * @file responseBuilder.ts
 * @description responseBuilder.ts module implementation used by the MedScanAI application.
 * @module AI
 */
import type { Medicine } from '../store/useAppStore';
import type { MedicineIntent } from './intentEngine';

function value(text: unknown, fallback = 'Not specified in the offline database for this medicine.') {
  const str = typeof text === 'string' ? text.trim() : text === null || text === undefined ? '' : String(text);
  return str || fallback;
}

function labelBadge(label?: string) {
  const normalized = value(label, 'CONSULT_DOCTOR').replace(/_/g, ' ');
  if (/safe/i.test(normalized)) return `✅ ${normalized}`;
  if (/avoid|unsafe/i.test(normalized)) return `⛔ ${normalized}`;
  return `⚠️ ${normalized}`;
}

export function buildMedicineIntentResponse(intent: MedicineIntent, medicine: Medicine): string {
  switch (intent) {
    case 'PRICE':
      return [
        `**Price for ${medicine.name}**`,
        '',
        `**Price:** ${medicine.price != null ? `${medicine.currency || '₹'}${medicine.price}` : value(null)}`,
        `**Pack size:** ${value(medicine.packSize)}`,
        `**Manufacturer:** ${value(medicine.manufacturer)}`,
      ].join('\n');

    case 'DOSAGE':
      return [
        `**Dosage and Use for ${medicine.name}**`,
        '',
        `**How to use:** ${value(medicine.howToUse || medicine.dosage.adult)}`,
        '',
        `**Quick dosing note:** ${value(medicine.quickTips || medicine.dosage.adult)}`,
        '',
        'Follow the dose and duration prescribed by your clinician.',
      ].join('\n');

    case 'SIDE_EFFECTS':
      return [
        `**Side Effects of ${medicine.name}**`,
        '',
        value([...medicine.sideEffects.common, ...medicine.sideEffects.rare].join('\n')),
      ].join('\n');

    case 'ALCOHOL_SAFETY':
      return [
        `**Alcohol Safety: ${labelBadge(medicine.alcoholSafetyLabel)}**`,
        '',
        `**Details:** ${value(medicine.alcoholSafetyText)}`,
      ].join('\n');

    case 'PREGNANCY_SAFETY':
      return [
        `**Pregnancy Safety: ${labelBadge(medicine.pregnancySafetyLabel)}**`,
        '',
        `**Details:** ${value(medicine.pregnancySafety)}`,
      ].join('\n');

    case 'BREASTFEEDING_SAFETY':
      return [
        `**Breastfeeding Safety: ${labelBadge(medicine.breastfeedingSafetyLabel)}**`,
        '',
        `**Details:** ${value(medicine.breastfeedingSafetyText)}`,
      ].join('\n');

    case 'DRIVING_SAFETY':
      return [
        `**Driving Safety: ${labelBadge(medicine.drivingSafetyLabel)}**`,
        '',
        `**Details:** ${value(medicine.drivingSafetyText)}`,
      ].join('\n');

    case 'MECHANISM':
      return [
        `**How ${medicine.name} Works**`,
        '',
        value(medicine.mechanismOfAction),
      ].join('\n');

    case 'QUICK_TIPS':
      return [
        `**Quick Tips for ${medicine.name}**`,
        '',
        value(medicine.quickTips),
      ].join('\n');

    case 'OVERVIEW':
    default:
      return [
        `**${medicine.name}**`,
        '',
        `**Composition:** ${value(medicine.genericName)}`,
        `**Class:** ${value(medicine.class)}`,
        `**Manufacturer:** ${value(medicine.manufacturer)}`,
        '',
        '**Uses:**',
        value(medicine.uses.join('\n')),
      ].join('\n');
  }
}
