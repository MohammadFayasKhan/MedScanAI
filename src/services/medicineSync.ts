/**
 * @file medicineSync.ts
 * @description medicineSync.ts module implementation used by the MedScanAI application.
 * @module Services
 */
import { getMedicineById, searchMedicines } from '../db/database';
import type { Medicine as DbMedicine } from '../types/medicine';
import { useAppStore, type Medicine as StoreMedicine } from '../store/useAppStore';

function splitList(value: string): string[] {
  if (!value) return [];
  return value
    .split(/[;,\n]| {2,}/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

function splitSideEffects(value: string): { common: string[]; rare: string[] } {
  const all = splitList(value);
  if (!all.length) {
    return {
      common: ['Not specified in source dataset'],
      rare: ['Consult a healthcare professional for complete safety profile'],
    };
  }
  return {
    common: all.slice(0, 5),
    rare: all.slice(5),
  };
}

function makeDosage(db: DbMedicine): StoreMedicine['dosage'] {
  const base =
    db.typical_dosing ||
    db.administration_tips ||
    'Use only as directed by your physician/pharmacist.';

  return {
    adult: base,
    pediatric: db.pediatric_warning || 'Consult a pediatrician for child dosing.',
    elderly: db.clinical_considerations || 'Use cautiously and follow medical advice.',
  };
}

export function mapDbMedicineToStore(db: DbMedicine): StoreMedicine {
  const id = String(db.id);
  return {
    id,
    name: db.brand_name || db.international_name || `Medicine ${id}`,
    genericName: db.international_name || db.active_substance || '',
    class: db.pharmaceutical_form || 'General',
    category: db.category || 'General',
    uses: splitList(db.therapeutic_indications || db.clinical_applications),
    dosage: makeDosage(db),
    sideEffects: splitSideEffects(db.common_side_effects || db.serious_side_effects),
    pregnancySafety: db.pregnancy_warning || 'Consult doctor during pregnancy/breastfeeding.',
    interactions: splitList(db.drug_interactions),
    warnings: splitList(
      [db.driving_warning, db.when_to_stop, db.emergency_situations, db.storage_info]
        .filter(Boolean)
        .join(';')
    ),
    contraindications: splitList(db.hypersensitivity_info),
    price: db.price,
    currency: db.currency || '₹',
    packSize: db.pack_size_label || db.pack_size || db.pack_sizes,
    manufacturer: db.manufacturer,
    mechanismOfAction: db.mechanism_of_action,
    howToUse: db.how_to_use,
    quickTips: db.quick_tips,
    alcoholSafetyText: db.safety_alcohol_text,
    alcoholSafetyLabel: db.safety_alcohol_label,
    pregnancySafetyLabel: db.safety_pregnancy_label,
    breastfeedingSafetyText: db.safety_breastfeeding_text,
    breastfeedingSafetyLabel: db.safety_breastfeeding_label,
    drivingSafetyText: db.safety_driving_text,
    drivingSafetyLabel: db.safety_driving_label,
    kidneySafetyText: db.safety_kidney_text,
    kidneySafetyLabel: db.safety_kidney_label,
    liverSafetyText: db.safety_liver_text,
    liverSafetyLabel: db.safety_liver_label,
  };
}

export function ensureMedicineInStoreFromDb(db: DbMedicine, activate = false): StoreMedicine {
  const store = useAppStore.getState();
  const mapped = mapDbMedicineToStore(db);
  const existing = store.medicines.get(mapped.id);

  if (!existing) {
    store.addMedicine(mapped);
  }

  if (activate) {
    store.addToRecent(mapped.id);
    store.setActiveMedicine(mapped.id, { clearChat: false });
  }

  return existing ?? mapped;
}

export async function ensureMedicineInStoreById(id: number, activate = false): Promise<StoreMedicine | null> {
  const dbMed = await getMedicineById(id);
  if (!dbMed) return null;
  return ensureMedicineInStoreFromDb(dbMed, activate);
}

export async function ensureMedicineInStoreByQuery(
  query: string,
  activate = false
): Promise<StoreMedicine | null> {
  const results = await searchMedicines(query);
  if (!results.length) return null;
  return ensureMedicineInStoreFromDb(results[0], activate);
}
