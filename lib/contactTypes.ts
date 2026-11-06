export interface MasterContact {
  id: number;
  name: string;
  phone: string;
  district: string;
  state: string;
  area?: string;
  business: string;
  birthday: string;
  category: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export const CONTACT_CATEGORIES = [
  "Dentists & Dental Clinics",
  "Doctors – Endocrinology & Diabetes",
  "Doctors – Cardiology & Other Specialists",
  "Doctors – Physicians, Pediatrics & General",
  "Hospitals, Labs & Diagnostics",
  "Pharmacies, Medical Stores & Distributors",
  "Medical Reps, Business Services & Tradespeople",
  "Medtronic Network (Patients, Staff & Customers)",
  "CGM Customers & Leads",
  "Family & Relatives",
  "Local Community – Dugri (Phase 1, Phase 2, Pind)",
  "Local Community – Neel Kanth & Vishal Nagar",
  "Local Community – Himatsingh Nagar, Mankwal & Basant",
  "Religious, Kirtan Mandli & RSS",
  "Others (Friends, Personal & Unsorted)"
] as const;

export type ContactCategory = typeof CONTACT_CATEGORIES[number];

