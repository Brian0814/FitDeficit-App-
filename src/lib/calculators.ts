import { UserProfile, CalorieCalculations } from "../types";

export function calculateMacros(profile: UserProfile): CalorieCalculations {
  const { age, height, currentWeight, goalWeight, fitnessGoal, activityLevel } = profile;

  // Convert weight from lbs to kg
  const weightKg = currentWeight / 2.20462;
  
  // Mifflin-St Jeor BMR Formula (using a balanced/neutral offset since gender is not explicitly requested)
  // BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) + s
  // s = -5 is a good average buffer
  const bmr = 10 * weightKg + 6.25 * height - 5 * age - 5;

  // Activity Level Multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const multiplier = activityMultipliers[activityLevel] || 1.375;
  const maintenanceCalories = Math.round(bmr * multiplier);

  // Target adjustments based on Goal
  let deficitOrSurplus = 0;
  let targetCalories = maintenanceCalories;

  if (fitnessGoal === "lose") {
    deficitOrSurplus = -500; // Safe 500 kcal deficit (appx 1 lb fat loss per week)
    targetCalories = maintenanceCalories - 500;
    // Set a safety floor
    if (targetCalories < 1200) {
      targetCalories = 1200;
      deficitOrSurplus = targetCalories - maintenanceCalories;
    }
  } else if (fitnessGoal === "lose_tone") {
    deficitOrSurplus = -375; // Hybrid recomposition deficit (sweet spot for burning fat & building muscle)
    targetCalories = maintenanceCalories - 375;
    if (targetCalories < 1200) targetCalories = 1200;
  } else if (fitnessGoal === "tone") {
    deficitOrSurplus = -250; // Modest deficit for lean recomposition
    targetCalories = maintenanceCalories - 250;
    if (targetCalories < 1200) targetCalories = 1200;
  } else if (fitnessGoal === "gain") {
    deficitOrSurplus = 300; // Modest surplus for lean muscle gain (+300 kcal)
    targetCalories = maintenanceCalories + 300;
  } else {
    deficitOrSurplus = 0;
    targetCalories = maintenanceCalories;
  }

  // Est timeline (1 lb weight change = ~3500 kcal deficit/surplus)
  const weightDelta = Math.abs(currentWeight - goalWeight);
  let timelineWeeks = 0;

  if (weightDelta > 0 && Math.abs(deficitOrSurplus) > 0) {
    const calorieWeeklyDelta = Math.abs(deficitOrSurplus) * 7;
    const lbsPerWeek = calorieWeeklyDelta / 3500;
    timelineWeeks = Math.ceil(weightDelta / lbsPerWeek);
  }

  // Protein targets: ~1.0g per lb of goal weight (or current weight for tone/loss)
  // Highly aligned with the slightly masculine athletic theme!
  let proteinGoal = Math.round(goalWeight * 1.0);
  if (fitnessGoal === "gain") {
    proteinGoal = Math.round(currentWeight * 1.1); // Higher protein for muscle gain
  } else if (fitnessGoal === "lose") {
    proteinGoal = Math.round(goalWeight * 0.95);
  }

  // Water target: 1 oz per 2 lbs body weight -> convert to 8oz cups
  // Example: 180 lbs -> 90 oz water -> 11.25 cups ~ 11 cups
  const waterGoalCups = Math.max(8, Math.round(currentWeight / 16));

  return {
    maintenanceCalories,
    targetCalories,
    deficitOrSurplus,
    timelineWeeks: timelineWeeks || 1,
    proteinGoal,
    waterGoalCups
  };
}
