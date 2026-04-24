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
