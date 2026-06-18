export interface DailyScheduleConfig {
  sessions: 1 | 2 | 0; // 0 = rest, 1 = single session, 2 = two-a-days
  s1: string;          // Session 1 selection
  s2: string;          // Session 2 selection
}

export interface UserProfile {
  uid: string;
  name: string;
  age: number;
  height: number; // in cm
  currentWeight: number; // in lbs
  goalWeight: number; // in lbs
  fitnessGoal: "lose" | "tone" | "maintain" | "gain" | "lose_tone";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  workoutExperience: "beginner" | "intermediate" | "advanced";
  dietaryPreference: string; // e.g. "None", "Keto", "Vegan", "High-Protein"
  isPrivate: boolean;
  workoutStreak: number;
  workoutSessionsPerDay?: 1 | 2;
  twoADaySplitPreference?: string;
  dailySchedules?: Record<string, DailyScheduleConfig>;
  workoutDaysPerWeek?: number;
  workoutTypesPref?: string[];
  primaryWorkoutStyle1?: string;
  morningWorkoutStyle2?: string;
  eveningWorkoutStyle2?: string;
  lastActiveDate?: string; // YYYY-MM-DD
  weightHistoryVisible?: boolean; // toggle to show actual weight to community
  createdAt: string;
}

export interface WeightLog {
  id?: string;
  userId: string;
  weight: number;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

export interface FoodLogItem {
  id?: string;
  userId: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  calories: number;
  protein: number; // in grams
  carbs: number; // in grams
  fat: number; // in grams
  servingSize: string;
  timeLogged: string; // e.g. "08:30" or "13:00"
  date: string; // YYYY-MM-DD
  timestamp: number;
}

export interface WaterLog {
  id?: string;
  userId: string;
  cups: number; // 1 cup = 250ml
  date: string; // YYYY-MM-DD
  timestamp: number;
}

export interface CalorieCalculations {
  maintenanceCalories: number;
  targetCalories: number;
  deficitOrSurplus: number;
  timelineWeeks: number;
  proteinGoal: number; // in grams
  waterGoalCups: number; // standard cups
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string; // or text like "10-12" or "To Failure"
  restTime: string; // e.g. "60s"
  formNote?: string;
}

export interface WorkoutDay {
  dayName: string;
  focus: string;
  morningCardio?: {
    duration: string; // e.g. "45-60 mins"
    activity: string; // e.g. "Incline Walking, Cycling, Running"
    notes?: string;
    title?: string;
  };
  eveningWeightTraining?: {
    lengthMinutes: number;
    exercises: Exercise[];
    warmup: string;
    recoveryNote: string;
    title?: string;
  };
  isRestDay: boolean;
}

export interface WorkoutPlan {
  experienceLevel: "beginner" | "intermediate" | "advanced";
  goalType: string;
  days: WorkoutDay[];
}

export interface CalorieBurnLog {
  id?: string;
  userId: string;
  activityName: string;
  caloriesBurned: number;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

