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

  // Resolve target rate of weekly change
  let rateOfChange = profile.weeklyRateOfChange !== undefined 
    ? profile.weeklyRateOfChange 
    : (fitnessGoal === "lose" ? 1.0 
       : fitnessGoal === "lose_tone" ? 0.75 
       : fitnessGoal === "tone" ? 0.5 
       : fitnessGoal === "gain" ? 0.5 
       : 0);

  if (fitnessGoal === "lose" || fitnessGoal === "lose_tone" || fitnessGoal === "tone") {
    const deficit = Math.round(rateOfChange * 500);
    deficitOrSurplus = -deficit;
    targetCalories = maintenanceCalories - deficit;
    // Set a safety floor (never drop below 1200 kcal for general physical safety)
    if (targetCalories < 1200) {
      targetCalories = 1200;
      deficitOrSurplus = targetCalories - maintenanceCalories;
    }
  } else if (fitnessGoal === "gain") {
    const surplus = Math.round(rateOfChange * 500);
    deficitOrSurplus = surplus;
    targetCalories = maintenanceCalories + surplus;
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
    timelineWeeks = Math.ceil(weightDelta / (lbsPerWeek || 0.1));
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
