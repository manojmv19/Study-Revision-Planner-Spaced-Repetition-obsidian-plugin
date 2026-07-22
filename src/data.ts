export interface Topic {
  id: string; // unique identifier
  name: string; // e.g., "[[Quantum Physics]]"
  state: 'planned' | 'studied' | 'completed';
  targetDate: string; // YYYY-MM-DD format (planned study date OR next review date)
  
  // SM-2 Spaced Repetition fields
  interval: number; // in days
  easeFactor: number; // default 2.5
  lastReviewDate?: string; // YYYY-MM-DD
}

export interface PluginSettings {
  algorithmType: 'SM-2' | 'STATIC';
  staticIntervals: number[]; // e.g., [1, 7, 15, 30]
}

export interface PluginData {
  settings: PluginSettings;
  topics: Topic[];
}

export const DEFAULT_DATA: PluginData = {
  settings: {
    algorithmType: 'SM-2',
    staticIntervals: [1, 7, 15, 30]
  },
  topics: []
};

// Helper to get today's date in YYYY-MM-DD
export function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Helper to add days to a YYYY-MM-DD date string
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z"); // Use noon UTC to avoid timezone shifts
  d.setDate(d.getDate() + days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function isOverdue(targetDate: string, today: string): boolean {
  return targetDate < today;
}
