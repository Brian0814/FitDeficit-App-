import { WorkoutPlan, WorkoutDay, Exercise, DailyScheduleConfig } from "../types";

export function generateWorkoutPlan(
  age: number,
  experience: "beginner" | "intermediate" | "advanced",
  goal: "lose" | "tone" | "maintain" | "gain" | "lose_tone",
  sessionsPerDay: 1 | 2 = 2,
  twoADaySplit: string = "cardio-lifting",
  dailySchedules?: Record<string, DailyScheduleConfig>
): WorkoutPlan {
  // Set reps and sets scaling based on experience
  let setsMultiplier = 3;
  let repRange = "10-12";
  let restTime = "60s";

  if (experience === "beginner") {
    setsMultiplier = 3;
    repRange = "12-15 (Lighter weight)";
    restTime = "90s (More recovery)";
  } else if (experience === "intermediate") {
    setsMultiplier = 4;
    repRange = "10-12 (Moderate weight)";
    restTime = "60s";
  } else if (experience === "advanced") {
    setsMultiplier = 4;
    repRange = "8-10 (Heavy weight, final drop set)";
    restTime = "45-60s";
  }

  // Adjust routine focusing on age (recovery is key for >=40)
  const isOlderUser = age >= 40;
  const ageRecoveryNote = isOlderUser
    ? "Aged 40+ Focus: Prioritize joint-longevity. Perform slow negatives (3-count descent) and support active recovery with daily mobility. Never lift through joint pain."
    : "Focus on progressive overload: increment weights or adjust reps weekly while retaining clean concentric control.";

  const upperExercises: Exercise[] = [
    {
      name: "Incline Dumbbell Bench Press",
      sets: setsMultiplier,
      reps: repRange,
      restTime,
      formNote: "Keep shoulders packed down. Focus on upper chest stretch."
    },
    {
      name: "Lat Pulldowns (Wide Grip)",
      sets: setsMultiplier,
      reps: repRange,
      restTime,
      formNote: "Pull with your elbows, squeeze shoulder blades at the bottom."
    },
    {
      name: "Dumbbell Shoulder Press (Seated)",
      sets: setsMultiplier,
      reps: repRange,
      restTime,
      formNote: "Control the weight on the descent; avoid locking out elbows."
    },
    {
      name: "Chest-Supported Dumbbell Row",
      sets: setsMultiplier,
      reps: repRange,
      restTime,
      formNote: "Keeps lower back supported. Raise chest slightly off pad."
    },
    {
      name: "Superset: Cable Bicep Curls & Tricep Pushdowns",
      sets: setsMultiplier - 1,
      reps: "12-15 each",
      restTime: "45s",
      formNote: "Strict posture, keep elbows pinned to your sides."
    }
  ];

  const lowerExercises: Exercise[] = [
    {
      name: "Goblet Squats or Barbell Back Squats",
      sets: setsMultiplier,
      reps: repRange,
      restTime: experience === "beginner" ? "90s" : "75s",
      formNote: "Brace core. Keep weight distributed evenly on heels and mid-foot."
    },
    {
      name: "Romanian Deadlifts (Dumbbell or Barbell)",
      sets: setsMultiplier,
      reps: "10-12",
      restTime,
      formNote: "Hinge at the hips. Keep back flat, bar close to shins. Feel hamstrings stretch."
    },
    {
      name: "Leg Press or Walking Lunges",
      sets: setsMultiplier,
      reps: "12 steps total",
      restTime,
      formNote: "Control descent. Ensure front knee does not collapse inward."
    },
    {
      name: "Seated Leg Curl",
      sets: setsMultiplier,
      reps: "12-15",
      restTime: "60s",
      formNote: "Squeeze tight at full contraction, 2-sec eccentric release."
    },
    {
      name: "Calf Raises (Standing or Seated)",
      sets: setsMultiplier + 1,
      reps: "15-20",
      restTime: "45s",
      formNote: "Pause at bottom for full stretch, explode up, pause at top."
    }
  ];

  const cardioActivity = goal === "gain"
    ? "Incline Walk or Low-Intensity Cycling (preserve calories for growth)"
    : "Stair Climber, Running intervals, or HIIT Cycling";

  // Standard Weekday defaults
  const DEFAULT_SCHEDULES: Record<string, DailyScheduleConfig> = {
    Monday: { sessions: sessionsPerDay, s1: "cardio", s2: "lifting" },
    Tuesday: { sessions: sessionsPerDay, s1: "cardio", s2: "lower" },
    Wednesday: { sessions: sessionsPerDay, s1: "cardio", s2: "lifting" },
    Thursday: { sessions: sessionsPerDay, s1: "cardio", s2: "lower" },
    Friday: { sessions: sessionsPerDay, s1: "cardio", s2: "lifting" },
    Saturday: { sessions: sessionsPerDay, s1: "cardio", s2: "lower" },
    Sunday: { sessions: 0, s1: "mobility", s2: "mobility" },
  };

  // Helper labels
  const getS1Label = (code: string) => {
    switch (code) {
      case "cardio": return "Cardio Burn & Aerobic Base";
      case "upper": return "Upper Body Strength Focus";
      case "heavy": return "Heavy Strength & Power Compounds";
      case "conditioning": return "Athletic Conditioning & Speed";
      case "mobility": return "Joint Lubrication & Active Mobility";
      default: return "Morning Conditioning";
    }
  };

  const getS2Label = (code: string) => {
    switch (code) {
      case "lifting": return "Hypertrophy & Density Sculpting";
      case "lower": return "Lower Body Target Split";
      case "upper-strength": return "Upper Body Sculpt & Finishers";
      case "core": return "Core Stabilization & Abdominal Shred";
      case "mobility": return "Deep Flex & Active Fascial Release";
      default: return "Resistance Training";
    }
  };

  // Build the list of days dynamically
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const days: WorkoutDay[] = daysOfWeek.map((dayName) => {
    // Resolve day specific schedule config (custom or default)
    let config = dailySchedules?.[dayName] || DEFAULT_SCHEDULES[dayName];
    
    // Safety check just in case config is structurally partial
    if (!config || config.sessions === undefined) {
      config = DEFAULT_SCHEDULES[dayName];
    }

    // REST DAY (0 Sessions)
    if (config.sessions === 0) {
      return {
        dayName,
        focus: "Rest, Caliper-Recovery & Muscle Repair",
        morningCardio: undefined,
        eveningWeightTraining: undefined,
        isRestDay: true
      };
    }

    const { s1, s2 } = config;
    const isUpperDay = ["Monday", "Wednesday", "Friday"].includes(dayName);

    // 1-SESSION PLAN
    if (config.sessions === 1) {
      // Pick a logical training format based on s1 / s2 preferences
      const activeFormat = s2 !== "lifting" ? s2 : (s1 !== "cardio" ? s1 : (isUpperDay ? "upper-strength" : "lower"));
      
      let exercises: Exercise[] = [];
      let focusText = "";
      let titleText = "Primary Workout Session";
      let warmupText = "5 mins light joint release and activation";
      let notesText = "Secure strict posture, progress weights when sets are fully locked.";

      if (activeFormat === "upper" || activeFormat === "upper-strength") {
        exercises = upperExercises;
        focusText = "Upper Body Sculpting & Power";
        titleText = "Primary Workout: Upper Power Split";
        warmupText = "5 mins arm circles, dynamic pushups, light facepulls";
      } else if (activeFormat === "lower") {
        exercises = lowerExercises;
        focusText = "Lower Body Target Split & Leg Power";
        titleText = "Primary Workout: Lower Body Compound Sculpt";
        warmupText = "5 mins dynamic glute bridges, squats, hamstring sweeps";
      } else if (activeFormat === "heavy") {
        exercises = isUpperDay ? upperExercises.slice(0, 4) : lowerExercises.slice(0, 4);
        focusText = "Heavy Mechanical Overload Strength";
        titleText = "Primary Workout: Power & Lifter Compounds";
        warmupText = "5 mins localized progressive lift warm-up sets";
        notesText = "Keep repetitions lower (6-8 reps), maximizing central drive. Rests at 90-120s.";
      } else if (activeFormat === "core") {
        exercises = [
          { name: "Decline Bench Weighted Situps", sets: 3, reps: "15-20", restTime: "45s", formNote: "Exhale fully at top." },
          { name: "Hanging Leg Raises", sets: 3, reps: "To Failure", restTime: "45s", formNote: "Keep hips tucked." },
          { name: "Plank with Shoulder Taps", sets: 3, reps: "60 seconds", restTime: "45s", formNote: "Avoid hip rocking." },
          { name: "Rotational Russian Twists", sets: 3, reps: "20 total", restTime: "45s", formNote: "Slow and controlled." }
        ];
        focusText = "Deep Core Stabilization & Abdominal Framing";
        titleText = "Primary Workout: Core Core alignment";
      } else if (activeFormat === "mobility") {
        exercises = [
          { name: "Pigeon Pose Hold", sets: 2, reps: "60s each", restTime: "15s", formNote: "Sink deep." },
          { name: "Couch Stretch", sets: 2, reps: "45s each", restTime: "15s", formNote: "Keep spine tall." },
          { name: "World's Greatest Stretch", sets: 3, reps: "6 reps each", restTime: "30s", formNote: "Rotate spine fully." }
        ];
        focusText = "Active Fascial Stretch & Joint Restoration";
        titleText = "Primary Workout: Decompression Mobility";
      } else { // default to Cardio
        focusText = "Steady-State Calorie Deficit Burn";
        titleText = "Primary Workout: High Incline Aerobic Engine";
        return {
          dayName,
          focus: focusText,
          morningCardio: {
            title: titleText,
            duration: "50-60 mins",
            activity: cardioActivity,
            notes: "Keep your heart rate locked in Zone 2 (60-70% max) to optimize metabolic fat oxidation while preserving raw muscle fibers."
          },
          isRestDay: false
        };
      }

      return {
        dayName,
        focus: focusText,
        eveningWeightTraining: {
          title: titleText,
          lengthMinutes: 45,
          warmup: warmupText,
          exercises,
          recoveryNote: `${ageRecoveryNote} ${notesText} Post-session: Replenish standard protein (30-40g).`
        },
        isRestDay: false
      };
    }

    // 2-SESSIONS PLAN (TWO-A-DAYS)
    // Morning Cardio Session
    let morningCardioObj: any = undefined;
    if (s1 === "cardio") {
      morningCardioObj = {
        title: `☀️ Session 1: ${getS1Label(s1)}`,
        duration: "40-50 mins",
        activity: isUpperDay ? cardioActivity : "Steady-State High Incline Walking, Elliptical or Zone 2 Cycling",
        notes: isUpperDay 
          ? "Keep cardiovascular rate locked in Zone 2 to preserve heavy glycogen pools for evening lifters." 
          : "Fabulous steady-state activity to encourage leg blood circulation post-weight days."
      };
    } else if (s1 === "upper") {
      morningCardioObj = {
        title: `☀️ Session 1: ${getS1Label(s1)}`,
        duration: "35 mins",
        activity: "Bodyweight pullups, chest dip transitions, handstand push prep, bar hang holds",
        notes: "Power-density focus. High energy activation to start the metabolic clock."
      };
    } else if (s1 === "heavy") {
      morningCardioObj = {
        title: `☀️ Session 1: ${getS1Label(s1)}`,
        duration: "30 mins",
        activity: isUpperDay 
          ? "Heavy Dumbbell Row, Barbell Bench Press & Clean Overheads"
          : "Barbell Squats, Deadlift pulls, Seated Calf Presses",
        notes: "Heavy mechanical load style (RPE 9). Keep sets low, rests long (120s)."
      };
    } else if (s1 === "conditioning") {
      morningCardioObj = {
        title: `☀️ Session 1: ${getS1Label(s1)}`,
        duration: "35 mins",
        activity: "Kettlebell swing structures, heavy rope slams, rower intervals, and walking lunges",
        notes: "Intended to promote elite lactate clearance, explosive capacity, and cardiovascular density."
      };
    } else { // mobility
      morningCardioObj = {
        title: `☀️ Session 1: ${getS1Label(s1)}`,
        duration: "25-30 mins",
        activity: "Dynamic foam rolling, pelvic rocking, cat-cow stretches, thoracic extension",
        notes: "Restores joint alignment, expands range of motion, and facilitates central neural recovery."
      };
    }

    // Evening Resistance Session
    let eveningWeightObj: any = undefined;
    let s2Exercises = isUpperDay ? upperExercises : lowerExercises;
    let s2Warmup = isUpperDay 
      ? "5 mins arm circles, dynamic light rotations, empty barbell reps"
      : "5 mins deep glute activations, bodyweight air squats, knee hub releases";
    let s2Recovery = isUpperDay 
      ? "Execute active foam rolling on tight lat fascia. Drink 30g essential isolate protein."
      : "Focus on re-hydrating. Take high levels of magnesium and roll calf nodes.";

    if (s2 === "lifting") {
      eveningWeightObj = {
        title: `🌙 Session 2: ${getS2Label(s2)}`,
        lengthMinutes: 45,
        warmup: s2Warmup,
        exercises: s2Exercises,
        recoveryNote: `${ageRecoveryNote} ${s2Recovery}`
      };
    } else if (s2 === "lower") {
      eveningWeightObj = {
        title: `🌙 Session 2: ${getS2Label(s2)}`,
        lengthMinutes: 50,
        warmup: "5 mins deep glute activations, quad rolls, hamstring stretches",
        exercises: lowerExercises,
        recoveryNote: `${ageRecoveryNote} Post-leg day: Target deep hamstring tissue. Active walk suggested.`
      };
    } else if (s2 === "upper-strength") {
      eveningWeightObj = {
        title: `🌙 Session 2: ${getS2Label(s2)}`,
        lengthMinutes: 45,
        warmup: "5 mins arm swings, light shoulder warmups, bands",
        exercises: upperExercises,
        recoveryNote: `${ageRecoveryNote} Focus on high level protein and active rest.`
      };
    } else if (s2 === "core") {
      eveningWeightObj = {
        title: `🌙 Session 2: ${getS2Label(s2)}`,
        lengthMinutes: 30,
        warmup: "5 mins deep spinal breathing, dead bugs, lower spine twists",
        exercises: [
          { name: "Decline Bench Weighted Situps", sets: 3, reps: "15-20", restTime: "45s", formNote: "Exhale fully at top." },
          { name: "Hanging Leg Raises", sets: 3, reps: "To Failure", restTime: "45s", formNote: "Keep hips tucked." },
          { name: "Plank with Shoulder Taps", sets: 3, reps: "60 seconds", restTime: "45s", formNote: "Avoid hip rocking." },
          { name: "Rotational Russian Twists", sets: 3, reps: "20 total", restTime: "45s", formNote: "Slow and controlled." }
        ],
        recoveryNote: "Practice 5-10 mins deep slow diaphragmatic breathing to release intra-abdominal pressure."
      };
    } else { // mobility
      eveningWeightObj = {
        title: `🌙 Session 2: ${getS2Label(s2)}`,
        lengthMinutes: 35,
        warmup: "Gentle child's pose breathing",
        exercises: [
          { name: "Pigeon Pose Hold", sets: 2, reps: "60s each side", restTime: "15s", formNote: "Sink hips deep into floor." },
          { name: "Couch Stretch (Hip Flexor)", sets: 2, reps: "45s each leg", restTime: "15s", formNote: "Keep torso upright." },
          { name: "World's Greatest Stretch", sets: 3, reps: "5 reps per side", restTime: "30s", formNote: "Follow hand with gaze." },
          { name: "Foam Roll (Upper Back & Quads)", sets: 1, reps: "3 minutes", restTime: "0s", formNote: "Breathe continuously." }
        ],
        recoveryNote: "Rest, optimize sleep, and remain perfectly hydrated to repair tissue bonds."
      };
    }

    return {
      dayName,
      focus: `${dayName} Split: ${getS1Label(s1).split(" & ")[0]} + ${getS2Label(s2).split(" & ")[0]}`,
      morningCardio: morningCardioObj,
      eveningWeightTraining: eveningWeightObj,
      isRestDay: false
    };
  });

  return {
    experienceLevel: experience,
    goalType: goal,
    days
  };
}
