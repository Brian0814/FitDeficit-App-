import { WorkoutPlan, WorkoutDay, Exercise, DailyScheduleConfig } from "../types";

// Dynamic Pools of Exercises grouped by category
const PUSH_POOL = [
  { name: "Incline Dumbbell Bench Press", formNote: "Keep shoulders packed down. Focus on upper chest stretch." },
  { name: "Flat Barbell Bench Press", formNote: "Drive feet into floor. Keep shoulder blades back and down." },
  { name: "Dumbbell Shoulder Press (Seated)", formNote: "Control the weight on the descent; avoid locking out elbows." },
  { name: "Standing Overhead Barbell Press", formNote: "Brace glutes and core to keep your lower back perfectly stable." },
  { name: "Decline Dumbbell Chest Press", formNote: "Focus on deep contraction in lower pectorals." },
  { name: "Cable Chest Flyes", formNote: "Squeeze palms together at front. Slow eccentric return." },
  { name: "Parallel Bar Tricep Dips", formNote: "Keep torso upright to isolate triceps. Avoid shoulder shrugging." },
  { name: "Rope Tricep Pushdowns", formNote: "Pin elbows to side. Flare rope outward at bottom." },
  { name: "Overhead Dumbbell Extension", formNote: "Keep elbows pointed forward. Deep stretch in long head." },
  { name: "Cable Lateral Raises", formNote: "Control the raise, lead with the elbow, keep wrist relaxed." }
];

const PULL_POOL = [
  { name: "Wide-Grip Lat Pulldowns", formNote: "Pull with your elbows, squeeze shoulder blades at the bottom." },
  { name: "Chest-Supported Dumbbell Row", formNote: "Keeps lower back supported. Raise chest slightly off pad." },
  { name: "Underhand Barbell Row", formNote: "Squeeze shoulder blades together. Pull toward lower belly button." },
  { name: "Single-Arm Dumbbell Row", formNote: "Drive elbow up and back. Keep hips square to floor." },
  { name: "Cable Face Pulls", formNote: "Pull rope to nose, external rotation of wrists at end range." },
  { name: "Incline Hammer Curls", formNote: "Stretch biceps fully at bottom. Don't swing elbows." },
  { name: "EZ-Bar Preacher Curls", formNote: "Isolate biceps. Maintain flat wrists throughout lift." },
  { name: "Close-Grip Pulldowns", formNote: "Focus on lower lats stretch and mid-back squeeze." }
];

const LEG_POOL_COMPOUND = [
  { name: "Goblet Squats", formNote: "Brace core. Keep weight distributed evenly on heels and mid-foot." },
  { name: "Barbell Back Squats", formNote: "Keep chest tall, drive knees outward on way up." },
  { name: "Romanian Deadlifts", formNote: "Hinge at the hips. Keep back flat, bar close to shins. Feel hamstrings stretch." },
  { name: "Leg Press (45-Degree)", formNote: "Don't lock knees at top. Keep lower back flat against seat." },
  { name: "Bulgarian Split Squats", formNote: "Keep weight load on front foot heel. Avoid forward knee slide." }
];

const LEG_POOL_ISOLATION = [
  { name: "Seated Leg Curl", formNote: "Squeeze tight at full contraction, 2-sec eccentric release." },
  { name: "Seated Leg Extension", formNote: "Hold peak contraction for 1 sec. Isolate quads." },
  { name: "Walking Lunges", formNote: "Control descent. Ensure front knee does not collapse inward." },
  { name: "Standing Calf Raises", formNote: "Pause at bottom for full stretch, explode up, pause at top." },
  { name: "Weighted Hip Thrusts", formNote: "Drive through heels, squeeze glutes hard at peak contraction." },
  { name: "Seated Calf Raises", formNote: "Stretching soleus muscle. Controlled dynamic tempo." }
];

const CORE_POOL = [
  { name: "Decline Bench Weighted Situps", formNote: "Exhale fully at top. Focus on deep contraction." },
  { name: "Hanging Leg Raises", formNote: "Keep hips tucked. Avoid using kinetic swing." },
  { name: "Plank with Shoulder Taps", formNote: "Avoid hip rocking. Keep abs braced tightly." },
  { name: "Rotational Russian Twists", formNote: "Slow and controlled. Twist shoulders fully." },
  { name: "Ab Wheel Rollouts", formNote: "Keep lower back rounded (cat-spine) to avoid lumbar pull." },
  { name: "Deadbugs (Slow Tempo)", formNote: "Keep lower back pressed flat into floor throughout." }
];

const CONDITIONING_POOL = [
  { name: "Kettlebell Swing Structures", formNote: "Hinge-power movement. Snap hips forward explosively." },
  { name: "Heavy Battle Rope Slams", formNote: "Engage core, utilize full body movement." },
  { name: "Rowing Machine Intervals", formNote: "Drive with legs, lean back slightly, pull bar to sternum." },
  { name: "Jump Rope Crossovers", formNote: "Relax shoulders, keep bounds light and springy." },
  { name: "Dumbbell Thrusters", formNote: "Single fluid line from squat to overhead push." },
  { name: "Burpees (Metabolic)", formNote: "Focus on continuous paced breathing." }
];

const MOBILITY_POOL = [
  { name: "Pigeon Pose Hold", formNote: "Sink deep. Focus on breathing into tight glute muscles." },
  { name: "Couch Stretch", formNote: "Keep spine tall, tilt pelvis back to isolate hip flexors." },
  { name: "World's Greatest Stretch", formNote: "Rotate spine fully. Follow your top hand with gaze." },
  { name: "Cat-Cow Dynamic Stretches", formNote: "Coordinate movement with deep inhalation and exhalation." },
  { name: "Thoracic Foam Roller Extensions", formNote: "Extend over roller. Keep core slightly engaged." }
];

// Helper: Stable/deterministic random seed generator (prevents flickering on re-renders, but ensures weekdays vary)
function getSeededRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (h << 5) - h + seedStr.charCodeAt(i);
    h |= 0;
  }
  return function() {
    let t = h += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Selector: picks unique exercises from a pool using the seeded random function
function selectUnique<T>(pool: T[], count: number, randomFn: () => number): T[] {
  const result: T[] = [];
  const poolCopy = [...pool];
  for (let i = 0; i < count; i++) {
    if (poolCopy.length === 0) break;
    const idx = Math.floor(randomFn() * poolCopy.length);
    result.push(poolCopy[idx]);
    poolCopy.splice(idx, 1);
  }
  return result;
}

export function generateWorkoutPlan(
  age: number,
  experience: "beginner" | "intermediate" | "advanced",
  goal: "lose" | "tone" | "maintain" | "gain" | "lose_tone",
  sessionsPerDay: 1 | 2 = 2,
  twoADaySplit: string = "cardio-lifting",
  dailySchedules?: Record<string, DailyScheduleConfig>,
  workoutTypesPref?: string[]
): WorkoutPlan {
  // Set reps and sets scaling based on experience and goal adjustments
  let setsMultiplier = 3;
  let repRange = "10-12";
  let restTime = "60s";

  if (experience === "beginner") {
    setsMultiplier = 3;
    repRange = goal === "gain" ? "10-12" : "12-15 (Lighter weight)";
    restTime = "90s (More recovery)";
  } else if (experience === "intermediate") {
    setsMultiplier = 4;
    repRange = goal === "gain" ? "8-10" : "10-12 (Moderate weight)";
    restTime = "60s";
  } else if (experience === "advanced") {
    setsMultiplier = 4;
    repRange = goal === "gain" ? "6-8 (Heavy strength loads)" : "8-10 (Heavy weight, final drop set)";
    restTime = goal === "gain" ? "90s" : "45-60s";
  }

  // Adjust routine focusing on age (recovery is key for >=40)
  const isOlderUser = age >= 40;
  const ageRecoveryNote = isOlderUser
    ? "Aged 40+ Focus: Prioritize joint-longevity. Perform slow negatives (3-count descent) and support active recovery with daily mobility. Never lift through joint pain."
    : "Focus on progressive overload: increment weights or adjust reps weekly while retaining clean concentric control.";

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
      case "conditioning": return "Performance Conditioning & Speed";
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

    // Initializing day-specific, stable randomized generator
    // Seeding ensures that Wednesday's upper day is totally different from Monday and Friday upper days!
    const rand = getSeededRandom(`${dayName}-${experience}-${goal}`);

    // DYNAMIC EXERCISE GENERATION BASED ON FOCUS AREA PREFERENCES, EXPERIENCES, AND GOALS:
    const userPrefs = workoutTypesPref && workoutTypesPref.length > 0 ? workoutTypesPref : ["lifting", "cardio"];

    // 1. Build Upper Body Exercises dynamically
    const selectedPush = selectUnique(PUSH_POOL, 2, rand);
    const selectedPull = selectUnique(PULL_POOL, 2, rand);
    
    // Pick active upper finisher based on user focus preference
    let upperFinisher: any = null;
    if (userPrefs.includes("core")) {
      upperFinisher = selectUnique(CORE_POOL, 1, rand)[0];
    } else if (userPrefs.includes("conditioning")) {
      upperFinisher = selectUnique(CONDITIONING_POOL, 1, rand)[0];
    } else if (userPrefs.includes("mobility")) {
      upperFinisher = selectUnique(MOBILITY_POOL, 1, rand)[0];
    } else {
      // Standard arm/isolation finisher
      upperFinisher = { 
        name: "Superset: Cable Bicep Curls & Tricep Pushdowns", 
        formNote: "Strict posture, keep elbows pinned to sides." 
      };
    }

    const dayUpperExercises: Exercise[] = [
      ...selectedPush.map(p => ({
        name: p.name,
        sets: setsMultiplier,
        reps: repRange,
        restTime,
        formNote: p.formNote
      })),
      ...selectedPull.map(p => ({
        name: p.name,
        sets: setsMultiplier,
        reps: repRange,
        restTime,
        formNote: p.formNote
      })),
      {
        name: upperFinisher.name,
        sets: Math.max(3, setsMultiplier - 1),
        reps: upperFinisher.name.includes("Superset") ? "12-15 each" : (upperFinisher.name.includes("Plank") || upperFinisher.name.includes("Hold") || upperFinisher.name.includes("Stretch") ? "60s hold" : "12-15"),
        restTime: "45s",
        formNote: upperFinisher.formNote
      }
    ];

    // 2. Build Lower Body Exercises dynamically
    const selectedLegCompounds = selectUnique(LEG_POOL_COMPOUND, 2, rand);
    const selectedLegIsolations = selectUnique(LEG_POOL_ISOLATION, 2, rand);

    let legFinisher: any = null;
    if (userPrefs.includes("core")) {
      legFinisher = selectUnique(CORE_POOL, 1, rand)[0];
    } else if (userPrefs.includes("conditioning")) {
      legFinisher = selectUnique(CONDITIONING_POOL, 1, rand)[0];
    } else {
      // Standard extra glute/calf isolation
      const remainingLegPool = LEG_POOL_ISOLATION.filter(item => !selectedLegIsolations.some(s => s.name === item.name));
      legFinisher = selectUnique(remainingLegPool, 1, rand)[0] || LEG_POOL_ISOLATION[0];
    }

    const dayLowerExercises: Exercise[] = [
      ...selectedLegCompounds.map(p => ({
        name: p.name,
        sets: setsMultiplier,
        reps: repRange,
        restTime: experience === "beginner" ? "90s" : "75s",
        formNote: p.formNote
      })),
      ...selectedLegIsolations.map(p => ({
        name: p.name,
        sets: setsMultiplier,
        reps: p.name.includes("lunges") || p.name.includes("Lunges") ? "12 steps total" : "10-12",
        restTime,
        formNote: p.formNote
      })),
      {
        name: legFinisher.name,
        sets: Math.max(3, setsMultiplier - 1),
        reps: legFinisher.name.includes("Plank") || legFinisher.name.includes("Hold") || legFinisher.name.includes("Stretch") ? "60s hold" : "12-15",
        restTime: "45s",
        formNote: legFinisher.formNote
      }
    ];

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
        exercises = dayUpperExercises;
        focusText = `Upper Body: ${selectedPush[0].name.split(" ")[0]} & ${selectedPull[0].name.split(" ")[0]} Focus`;
        titleText = `Primary Session: Upper Body Variant (${dayName.slice(0, 3)})`;
        warmupText = "5 mins arm circles, dynamic pushups, light facepulls";
      } else if (activeFormat === "lower") {
        exercises = dayLowerExercises;
        focusText = `Lower Body: ${selectedLegCompounds[0].name.split(" ")[0]} & ${selectedLegIsolations[0].name.split(" ")[0]}`;
        titleText = `Primary Session: Lower Body Variant (${dayName.slice(0, 3)})`;
        warmupText = "5 mins dynamic glute bridges, squats, hamstring sweeps";
      } else if (activeFormat === "heavy") {
        exercises = isUpperDay ? dayUpperExercises.slice(0, 4) : dayLowerExercises.slice(0, 4);
        focusText = "Heavy Mechanical Power Compound Loads";
        titleText = `Primary Session: Heavy Compound Variant (${dayName.slice(0, 3)})`;
        warmupText = "5 mins localized progressive lift warm-up sets";
        notesText = "Keep repetitions lower (6-8 reps), maximizing central drive. Rests at 90-120s.";
      } else if (activeFormat === "core") {
        exercises = selectUnique(CORE_POOL, 4, rand).map(p => ({
          name: p.name,
          sets: 3,
          reps: p.name.includes("Plank") || p.name.includes("Hold") ? "60s" : "15-20",
          restTime: "45s",
          formNote: p.formNote
        }));
        focusText = "Deep Core Stabilization & Abdominal Frame Alignment";
        titleText = "Primary Session: Abdominal Alignment Elements";
      } else if (activeFormat === "mobility") {
        exercises = selectUnique(MOBILITY_POOL, 4, rand).map(p => ({
          name: p.name,
          sets: 2,
          reps: p.name.includes("Stretch") || p.name.includes("Hold") ? "45s holds" : "10-12 slow reps",
          restTime: "15s",
          formNote: p.formNote
        }));
        focusText = "Active Fascial Stretch & Joint Restoration";
        titleText = "Primary Session: Decompression Mobility Flow";
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
          recoveryNote: `${ageRecoveryNote} ${notesText} Post-session: Replenish essential hydration and protein.`
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
          ? "Keep cardiovascular rate locked in Zone 2 to preserve heavy glycogen pools for evening strength splits." 
          : "Fabulous steady-state activity to encourage lower body blood circulation post-weight days."
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
          ? `Heavy ${selectedPull[0].name}, ${selectedPush[0].name} & Overheads`
          : `Heavy ${selectedLegCompounds[0].name}, ${selectedLegCompounds[1].name} & Pulls`,
        notes: "Heavy mechanical load style (RPE 9). Keep sets low, rests long (120s)."
      };
    } else if (s1 === "conditioning") {
      morningCardioObj = {
        title: `☀️ Session 1: ${getS1Label(s1)}`,
        duration: "35 mins",
        activity: "Kettlebell swing structures, heavy rope slams, rower intervals, and walking lunges",
        notes: "Intended to promote premium lactate clearance, explosive capacity, and cardiovascular density."
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
    let s2Exercises = isUpperDay ? dayUpperExercises : dayLowerExercises;
    let s2Warmup = isUpperDay 
      ? "5 mins arm circles, dynamic light rotations, empty barbell reps"
      : "5 mins deep glute activations, bodyweight air squats, knee hub releases";
    let s2Recovery = isUpperDay 
      ? "Execute active foam rolling on tight lat fascia. Drink 30g essential protein."
      : "Focus on re-hydrating. Take recovery electrolytes and roll calf nodes.";

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
        exercises: dayLowerExercises,
        recoveryNote: `${ageRecoveryNote} Post-leg day: Target deep hamstring tissue. Active walk suggested.`
      };
    } else if (s2 === "upper-strength") {
      eveningWeightObj = {
        title: `🌙 Session 2: ${getS2Label(s2)}`,
        lengthMinutes: 45,
        warmup: "5 mins arm swings, light shoulder warmups, bands",
        exercises: dayUpperExercises,
        recoveryNote: `${ageRecoveryNote} Focus on high level protein and active rest.`
      };
    } else if (s2 === "core") {
      eveningWeightObj = {
        title: `🌙 Session 2: ${getS2Label(s2)}`,
        lengthMinutes: 30,
        warmup: "5 mins deep spinal breathing, dead bugs, lower spine twists",
        exercises: selectUnique(CORE_POOL, 4, rand).map(p => ({
          name: p.name,
          sets: 3,
          reps: p.name.includes("Plank") || p.name.includes("Hold") ? "60s" : "15-20",
          restTime: "45s",
          formNote: p.formNote
        })),
        recoveryNote: "Practice 5-10 mins deep slow diaphragmatic breathing to release intra-abdominal pressure."
      };
    } else { // mobility
      eveningWeightObj = {
        title: `🌙 Session 2: ${getS2Label(s2)}`,
        lengthMinutes: 35,
        warmup: "Gentle child's pose breathing",
        exercises: selectUnique(MOBILITY_POOL, 4, rand).map(p => ({
          name: p.name,
          sets: 2,
          reps: p.name.includes("Stretch") || p.name.includes("Hold") ? "45s holds" : "10-12 slow reps",
          restTime: "15s",
          formNote: p.formNote
        })),
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
