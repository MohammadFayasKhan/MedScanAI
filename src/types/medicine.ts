/**
 * @file medicine.ts
 * @description Shared TypeScript interfaces for medicines, chat messages, scan history, and search results.
 * @module Types
 */
export interface Medicine {
  id: number;
  canonical_name?: string;
  brand_name: string;
  brand_name_lower: string;
  international_name: string;
  pharmaceutical_form: string;
  strength: string;
  manufacturer: string;
  active_substance: string;
  composition?: string;
  type?: string;
  chemical_class?: string;
  therapeutic_class?: string;
  action_class?: string;
  habit_forming?: number | null;
  price?: number | null;
  currency?: string;
  pack_size?: string;
  pack_size_label?: string;
  is_discontinued?: number | null;
  introduction?: string;
  uses?: string;
  benefits?: string;
  how_to_use?: string;
  quick_tips?: string;
  side_effects?: string;
  safety_alcohol_text?: string;
  safety_alcohol_label?: string;
  safety_pregnancy_text?: string;
  safety_pregnancy_label?: string;
  safety_breastfeeding_text?: string;
  safety_breastfeeding_label?: string;
  safety_driving_text?: string;
  safety_driving_label?: string;
  safety_kidney_text?: string;
  safety_kidney_label?: string;
  safety_liver_text?: string;
  safety_liver_label?: string;
  source_url?: string;
  characteristic_features: string;
  mechanism_of_action: string;
  therapeutic_indications: string;
  clinical_applications: string;
  typical_dosing: string;
  timing_info: string;
  administration_tips: string;
  spacing_medications: string;
  pregnancy_warning: string;
  pediatric_warning: string;
  driving_warning: string;
  storage_info: string;
  hypersensitivity_info: string;
  when_to_stop: string;
  emergency_situations: string;
  drug_interactions: string;
  administration_spacing: string;
  clinical_considerations: string;
  common_side_effects: string;
  serious_side_effects: string;
  availability_status: string;
  pack_sizes: string;
  substitutes: string;
  category: string;
  schedule: string;
  image_url: string;
  review_excellent: string;
  review_average: string;
  review_poor: string;
}

export interface ScanHistory {
  id: string;
  medicine_id: number | null;
  brand_name: string;
  scan_method: 'webcam' | 'manual' | 'image_upload';
  scanned_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  chips?: string[];
}

export interface SearchResult {
  medicine: Medicine;
  score: number;
}
