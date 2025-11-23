export enum DayOfWeek {
  Monday = 'Lunes',
  Tuesday = 'Martes',
  Wednesday = 'Miércoles',
  Thursday = 'Jueves',
  Friday = 'Viernes',
  Saturday = 'Sábado',
  Sunday = 'Domingo'
}

export const DAYS_ORDER = [
  DayOfWeek.Monday,
  DayOfWeek.Tuesday,
  DayOfWeek.Wednesday,
  DayOfWeek.Thursday,
  DayOfWeek.Friday,
  DayOfWeek.Saturday,
  DayOfWeek.Sunday
];

export interface Task {
  id: string;
  title: string;
  description?: string;
  day: DayOfWeek;
  startTime?: string; // HH:MM format
  durationMinutes?: number;
  color: string; // Hex or Tailwind class mapping
  topicTitle?: string; // NEW: To store the name of the syllabus topic
  isCompleted: boolean;
  sticker?: string;
  weekId?: string; // NEW: YYYY-MM-DD of the Monday of the week
}

export interface AIPlanResponse {
  planName: string;
  tasks: Array<{
    title: string;
    description: string;
    day: string; // Should match enum values string
    startTime: string;
    durationMinutes: number;
    category: 'work' | 'personal' | 'study' | 'health';
  }>;
}