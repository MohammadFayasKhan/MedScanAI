export interface Medicine {
  id: number;
  brand_name: string;
  brand_name_lower: string;
  international_name: string;
  pharmaceutical_form: string;
  strength: string;
  manufacturer: string;
  active_substance: string;
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
