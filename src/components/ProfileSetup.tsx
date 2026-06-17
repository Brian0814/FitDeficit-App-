import React, { useState, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfile } from "../types";
import { calculateMacros } from "../lib/calculators";
import { Dumbbell, Save, Eye, EyeOff, Scale, User, Calendar, Activity } from "lucide-react";

interface ProfileSetupProps {
  userId: string;
  userEmail: string;
  onSave: (profile: UserProfile) => void;
  initialProfile?: UserProfile | null;
}

export default function ProfileSetup({ userId, userEmail, onSave, initialProfile }: ProfileSetupProps) {
  const [name, setName] = useState(initialProfile?.name || userEmail.split("@")[0] || "");
  const [age, setAge] = useState<number>(initialProfile?.age || 30);
  
  // Height options: allow Feet & Inches to easily auto-store cm!
  const initialFeet = initialProfile ? Math.floor((initialProfile.height / 2.54) / 12) : 5;
  const initialInches = initialProfile ? Math.round((initialProfile.height / 2.54) % 12) : 9;
  const [heightFeet, setHeightFeet] = useState<number>(initialFeet);
  const [heightInches, setHeightInches] = useState<number>(initialInches);
  
  const [currentWeight, setCurrentWeight] = useState<number>(initialProfile?.currentWeight || 180);
  const [goalWeight, setGoalWeight] = useState<number>(initialProfile?.goalWeight || 165);
  const [fitnessGoal, setFitnessGoal] = useState<"lose" | "tone" | "maintain" | "gain" | "lose_tone">(initialProfile?.fitnessGoal || "lose");
  const [activityLevel, setActivityLevel] = useState<"sedentary" | "light" | "moderate" | "active" | "very_active">(initialProfile?.activityLevel || "moderate");
  const [workoutExperience, setWorkoutExperience] = useState<"beginner" | "intermediate" | "advanced">(initialProfile?.workoutExperience || "beginner");
  const [dietaryPreference, setDietaryPreference] = useState<string>(initialProfile?.dietaryPreference || "None");
  const [isPrivate, setIsPrivate] = useState<boolean>(initialProfile?.isPrivate ?? true);
  const [workoutSessionsPerDay, setWorkoutSessionsPerDay] = useState<1 | 2>((initialProfile?.workoutSessionsPerDay as 1 | 2) || 2);
  
  // Custom split mapping with backward compatibility
  const getInitialSplits = () => {
    const rawVal = initialProfile?.twoADaySplitPreference || "cardio-lifting";
    if (rawVal === "cardio-lifting") return { s1: "cardio", s2: "lifting" };
    if (rawVal === "upper-lower") return { s1: "upper", s2: "lower" };
    if (rawVal === "double-weights") return { s1: "heavy", s2: "mixed" };
    if (rawVal === "mixed") return { s1: "conditioning", s2: "core" };
    
    if (rawVal.includes("-")) {
      const parts = rawVal.split("-");
      return { s1: parts[0] || "cardio", s2: parts[1] || "lifting" };
    }
    return { s1: "cardio", s2: "lifting" };
  };

  const initialSplits = getInitialSplits();
  const [session1Pref, setSession1Pref] = useState<string>(initialSplits.s1);
  const [session2Pref, setSession2Pref] = useState<string>(initialSplits.s2);
  const [twoADaySplitPreference, setTwoADaySplitPreference] = useState<string>(
    initialProfile?.twoADaySplitPreference || "cardio-lifting"
  );

  // Advanced Day-by-Day training matrix
  const [dailySchedules, setDailySchedules] = useState<Record<string, { sessions: 1 | 2 | 0; s1: string; s2: string }>>(() => {
    if (initialProfile?.dailySchedules) {
      return initialProfile.dailySchedules;
    }
    // Pre-populate using the old sessionsPerDay/twoADaySplitPreference or standard defaults
    const isSingleGlobal = (initialProfile?.workoutSessionsPerDay as 1 | 2) === 1;
    const splitPref = initialProfile?.twoADaySplitPreference || "cardio-lifting";
    let s1Group = "cardio";
    let s2Group = "lifting";
    if (splitPref === "upper-lower") { s1Group = "upper"; s2Group = "lower"; }
    else if (splitPref === "double-weights") { s1Group = "heavy"; s2Group = "mixed"; }
    else if (splitPref === "mixed") { s1Group = "conditioning"; s2Group = "core"; }
    else if (splitPref.includes("-")) {
      const parts = splitPref.split("-");
      s1Group = parts[0] || "cardio";
      s2Group = parts[1] || "lifting";
    }

    const initialMap: Record<string, { sessions: 1 | 2 | 0; s1: string; s2: string }> = {};
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].forEach((dayName) => {
      if (dayName === "Sunday") {
        initialMap[dayName] = { sessions: 0, s1: "mobility", s2: "mobility" };
      } else {
        initialMap[dayName] = { 
          sessions: isSingleGlobal ? 1 : 2, 
          s1: s1Group, 
          s2: s2Group 
        };
      }
    });
    return initialMap;
  });

  const updateDaySchedule = (day: string, updates: Partial<{ sessions: 1 | 2 | 0; s1: string; s2: string }>) => {
    setDailySchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        ...updates
      }
    }));
  };

  useEffect(() => {
    setTwoADaySplitPreference(`${session1Pref}-${session2Pref}`);
  }, [session1Pref, session2Pref]);

  const getSession1Label = (val: string) => {
    switch(val) {
      case "cardio": return "Cardio Burn & Aerobic Base";
      case "upper": return "Upper Body Strength Focus";
      case "heavy": return "Heavy Strength & Power Compounds";
      case "conditioning": return "Athletic Conditioning & Speed";
      case "mobility": return "Joint Lubrication & Active Mobility";
      default: return val.toUpperCase();
    }
  };

  const getSession2Label = (val: string) => {
    switch(val) {
      case "lifting": return "Hypertrophy & Density Sculpting";
      case "lower": return "Lower Body Target Split";
      case "upper-strength": return "Upper Body Sculpt & Finishers";
      case "core": return "Core Stabilization & Abdominal Ab Shred";
      case "mobility": return "Deep Flex & Active Fascial Release";
      default: return val.toUpperCase();
    }
  };
  
  const [saving, setSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Height calculated value in cm
  const calculatedHeightCm = Math.round((heightFeet * 12 + heightInches) * 2.54);

  // Live profile model for macro calculation preview
  const [calculatedMacros, setCalculatedMacros] = useState({
    maintenanceCalories: 2200,
    targetCalories: 1700,
    deficitOrSurplus: -500,
    timelineWeeks: 12,
    proteinGoal: 150,
    waterGoalCups: 11
  });

  useEffect(() => {
    // Generate a temporary mock profile to dynamically re-calculate macros live!
    const tempProfile: UserProfile = {
      uid: userId,
      name: name || "User",
      age,
      height: calculatedHeightCm,
      currentWeight,
      goalWeight,
      fitnessGoal,
      activityLevel,
      workoutExperience,
      dietaryPreference,
      isPrivate,
      workoutSessionsPerDay,
      twoADaySplitPreference,
      dailySchedules,
      workoutStreak: initialProfile?.workoutStreak || 0,
      createdAt: initialProfile?.createdAt || new Date().toISOString()
    };
    try {
      const results = calculateMacros(tempProfile);
      setCalculatedMacros(results);
    } catch (e) {
      // safe fallback
    }
  }, [name, age, heightFeet, heightInches, currentWeight, goalWeight, fitnessGoal, activityLevel, workoutExperience, dietaryPreference, isPrivate, workoutSessionsPerDay, twoADaySplitPreference, dailySchedules]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorCode("Name is required");
      return;
    }
    if (age <= 0 || currentWeight <= 0 || goalWeight <= 0) {
      setErrorCode("Values must be positive integers");
      return;
    }

    setSaving(true);
    setErrorCode(null);

    const profileData: UserProfile = {
      uid: userId,
      name: name.trim(),
      age,
      height: calculatedHeightCm,
      currentWeight,
      goalWeight,
      fitnessGoal,
      activityLevel,
      workoutExperience,
      dietaryPreference,
      isPrivate,
      workoutSessionsPerDay,
      twoADaySplitPreference,
      dailySchedules,
      workoutStreak: initialProfile?.workoutStreak || 0,
      createdAt: initialProfile?.createdAt || new Date().toISOString()
    };

    try {
      // Save directly to the firestore under /profiles/{userId} (with localStorage Guest bypass fallback)
      if (userId === "guest_user") {
        localStorage.setItem("fitdeficit_profile_guest_user", JSON.stringify(profileData));
        onSave(profileData);
      } else {
        await setDoc(doc(db, "profiles", userId), profileData);
        onSave(profileData);
      }
    } catch (err: any) {
      console.error("Error setting custom user profile:", err);
      setErrorCode("Could not save your physical profile contents to Firestore: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 md:px-0">
      <div className="bg-[#121215] border border-neutral-800 rounded-sm overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-yellow-400" />
        
        {/* Title Block */}
        <div className="p-6 border-b border-neutral-900 bg-gradient-to-r from-neutral-950 to-neutral-900">
          <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-wider font-mono text-white flex items-center gap-2.5">
            <User className="h-6 w-6 text-yellow-400" />
            {initialProfile ? "RE-FORMULATE PHYSICAL METRICS" : "ESTABLISH BODY PARAMETERS"}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Configure your age, size, weight, and split program metrics to generate daily calorie targets.
          </p>
        </div>

        {errorCode && (
          <div className="m-6 p-3 bg-red-950/35 border border-red-800 rounded text-red-200 text-xs text-center font-mono">
            ⚠️ {errorCode}
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8">
          
          {/* Main Grid: Inputs vs Real-time Calculations Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            {/* Input Form Fields (Cols 3) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Profile Basics */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-mono tracking-widest font-bold text-yellow-500 border-b border-neutral-900 pb-1.5 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  1. Profile Details
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-mono text-neutral-400 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Username / User"
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-400 text-sm py-2 px-3 outline-none rounded-sm text-white"
                      required
                      id="input-setup-name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-mono text-neutral-400 mb-1 flex justify-between items-center">
                      <span>Age (Years)</span>
                      <span className="text-[9px] text-neutral-500 font-mono text-right lowercase">type or scroll/slide</span>
                    </label>
                    <div className="space-y-2">
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={age || ""}
                          onChange={(e) => setAge(Math.min(120, parseInt(e.target.value) || 0))}
                          className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-400 text-sm py-2 pl-10 pr-3 outline-none rounded-sm text-white font-mono"
                          required
                          id="input-setup-age"
                        />
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="120"
                        value={age || 1}
                        onChange={(e) => setAge(parseInt(e.target.value) || 1)}
                        className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-yellow-400 focus:outline-none"
                        id="input-setup-age-slider"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-mono text-neutral-400 mb-1.5">
                      Height (Feet & Inches)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 focus-within:border-yellow-400 px-2.5 py-1.5 rounded-sm">
                        <select
                          value={heightFeet}
                          onChange={(e) => setHeightFeet(parseInt(e.target.value))}
                          className="bg-transparent border-none outline-none font-mono text-sm text-white flex-grow cursor-pointer"
                          id="select-setup-feet"
                        >
                          {[3, 4, 5, 6, 7, 8].map((f) => (
                            <option key={f} value={f} className="bg-black text-white">{f} ft</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 focus-within:border-yellow-400 px-2.5 py-1.5 rounded-sm">
                        <select
                          value={heightInches}
                          onChange={(e) => setHeightInches(parseInt(e.target.value))}
                          className="bg-transparent border-none outline-none font-mono text-sm text-white flex-grow cursor-pointer"
                          id="select-setup-inches"
                        >
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                            <option key={i} value={i} className="bg-black text-white">{i} in</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
                      Auto-converts to {calculatedHeightCm} cm
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-mono text-neutral-400 mb-1.5">
                      Dietary Preferences
                    </label>
                    <select
                      value={dietaryPreference}
                      onChange={(e) => setDietaryPreference(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-400 text-sm py-2 px-3 outline-none rounded-sm text-white cursor-pointer"
                      id="select-setup-diet"
                    >
                      {["None", "High-Protein", "Keto", "Low-Carb", "Vegan", "Vegetarian", "Gluten-Free", "Paleo"].map((pref) => (
                        <option key={pref} value={pref} className="bg-black text-white">{pref}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Weight targets */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-mono tracking-widest font-bold text-yellow-500 border-b border-neutral-900 pb-1.5 flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  2. Weight Milestones & Metrics
                </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-mono text-neutral-400 mb-1 flex justify-between items-center">
                      <span>Current Weight (lbs)</span>
                      <span className="text-[9px] text-neutral-500 font-mono text-right lowercase">type or scroll/slide</span>
                    </label>
                    <div className="space-y-2">
                      <input
                        type="number"
                        min="50"
                        max="600"
                        value={currentWeight || ""}
                        onChange={(e) => setCurrentWeight(parseInt(e.target.value) || 0)}
                        className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-400 text-sm py-2 px-3 outline-none rounded-sm text-white font-mono"
                        required
                        id="input-setup-current-weight"
                      />
                      <input
                        type="range"
                        min="50"
                        max="400"
                        value={currentWeight || 150}
                        onChange={(e) => setCurrentWeight(parseInt(e.target.value) || 50)}
                        className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-yellow-400 focus:outline-none"
                        id="input-setup-current-weight-slider"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-mono text-neutral-400 mb-1 flex justify-between items-center">
                      <span>Goal Weight (lbs)</span>
                      <span className="text-[9px] text-neutral-500 font-mono text-right lowercase">type or scroll/slide</span>
                    </label>
                    <div className="space-y-2">
                      <input
                        type="number"
                        min="50"
                        max="600"
                        value={goalWeight || ""}
                        onChange={(e) => setGoalWeight(parseInt(e.target.value) || 0)}
                        className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-400 text-sm py-2 px-3 outline-none rounded-sm text-white font-mono"
                        required
                        id="input-setup-goal-weight"
                      />
                      <input
                        type="range"
                        min="50"
                        max="400"
                        value={goalWeight || 150}
                        onChange={(e) => setGoalWeight(parseInt(e.target.value) || 50)}
                        className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-yellow-400 focus:outline-none"
                        id="input-setup-goal-weight-slider"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-mono text-neutral-400 mb-2">
                    Primary Fitness Metric
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {[
                      { key: "lose", label: "Lose Weight", note: "Calorie Deficit" },
                      { key: "lose_tone", label: "Lose & Tone", note: "Hybrid Recomp" },
                      { key: "tone", label: "Get Toned", note: "Body Recomposition" },
                      { key: "maintain", label: "Maintain", note: "Steady Balance" },
                      { key: "gain", label: "Gain Muscle", note: "Calorie Surplus" }
                    ].map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setFitnessGoal(g.key as any)}
                        className={`p-3 border rounded-sm font-sans flex flex-col justify-center items-center text-center transition cursor-pointer select-none ${
                          fitnessGoal === g.key
                            ? "bg-yellow-400 border-yellow-400 text-black font-extrabold"
                            : "bg-neutral-950 border-neutral-900 hover:border-neutral-700 text-neutral-300"
                        }`}
                        id={`btn-setup-goal-${g.key}`}
                      >
                        <span className="text-xs uppercase font-semibold leading-tight">{g.label}</span>
                        <span className={`text-[9px] mt-0.5 leading-none ${fitnessGoal === g.key ? "text-neutral-900 font-bold" : "text-neutral-500"}`}>{g.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Schedules & Intensity */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-mono tracking-widest font-bold text-yellow-500 border-b border-neutral-900 pb-1.5 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  3. Schedules & Experience
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-mono text-neutral-400 mb-1.5">
                      Daily Activity Level
                    </label>
                    <select
                      value={activityLevel}
                      onChange={(e) => setActivityLevel(e.target.value as any)}
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-400 text-sm py-2 px-3 outline-none rounded-sm text-white cursor-pointer"
                      id="select-setup-activity"
                    >
                      <option value="sedentary" className="bg-black text-white">Sedentary (Office/Desk job)</option>
                      <option value="light" className="bg-black text-white">Lightly Active (1-2 workouts/week)</option>
                      <option value="moderate" className="bg-black text-white">Moderately Active (3-5 workouts/week)</option>
                      <option value="active" className="bg-black text-white">Highly Active (6+ hard workouts/week)</option>
                      <option value="very_active" className="bg-black text-white">Extremely Active (Heavy physical labor daily)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-mono text-neutral-400 mb-1.5">
                      Workout Experience
                    </label>
                    <select
                      value={workoutExperience}
                      onChange={(e) => setWorkoutExperience(e.target.value as any)}
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-400 text-sm py-2 px-3 outline-none rounded-sm text-white cursor-pointer"
                      id="select-setup-exp"
                    >
                      <option value="beginner" className="bg-black text-white">Beginner (1-12 months lift history)</option>
                      <option value="intermediate" className="bg-black text-white">Intermediate (1-3 years constant lift)</option>
                      <option value="advanced" className="bg-black text-white">Advanced (3+ years elite progressive lift)</option>
                    </select>
                  </div>
                </div>

                {/* Day-by-Day Customizable Training Matrix Builder */}
                <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-sm space-y-6">
                  <div>
                    <h4 className="text-xs uppercase font-mono text-yellow-400 font-extrabold tracking-wider">
                      Weekly Training Matrix Builder
                    </h4>
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      Configure your sessions uniquely for each day. Customize splits, insert rest/recovery days, or schedule advanced two-a-days.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((dayName) => {
                      const dayConf = dailySchedules[dayName] || { sessions: 2, s1: "cardio", s2: "lifting" };
                      return (
                        <div key={dayName} className="p-3 bg-neutral-900/40 border border-neutral-800 rounded-sm space-y-3 animate-fadeIn">
                          {/* Day Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-900 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs uppercase font-mono font-bold text-white tracking-wide">
                                {dayName}
                              </span>
                              <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                                dayConf.sessions === 0
                                  ? "bg-neutral-800 text-neutral-400"
                                  : dayConf.sessions === 1
                                    ? "bg-blue-400/10 text-blue-400 border border-blue-400/20"
                                    : "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
                              }`}>
                                {dayConf.sessions === 0 && "Rest & Recovery"}
                                {dayConf.sessions === 1 && "1 Session Scheduled"}
                                {dayConf.sessions === 2 && "2 Sessions Scheduled"}
                              </span>
                            </div>

                            {/* Session Count Option Toggle Buttons */}
                            <div className="flex items-center gap-1 font-mono text-[9px] self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => updateDaySchedule(dayName, { sessions: 0 })}
                                className={`px-2.5 py-1 rounded-xs border transition cursor-pointer ${
                                  dayConf.sessions === 0
                                    ? "bg-neutral-800 border-neutral-600 text-white font-extrabold"
                                    : "bg-neutral-950 border-neutral-900 text-neutral-500 hover:text-neutral-300"
                                }`}
                              >
                                REST DAY
                              </button>
                              <button
                                type="button"
                                onClick={() => updateDaySchedule(dayName, { sessions: 1 })}
                                className={`px-2.5 py-1 rounded-xs border transition cursor-pointer ${
                                  dayConf.sessions === 1
                                    ? "bg-blue-400/10 border-blue-400/30 text-blue-400 font-extrabold"
                                    : "bg-neutral-950 border-neutral-900 text-neutral-500 hover:text-neutral-300"
                                }`}
                              >
                                1 SESSION
                              </button>
                              <button
                                type="button"
                                onClick={() => updateDaySchedule(dayName, { sessions: 2 })}
                                className={`px-2.5 py-1 rounded-xs border transition cursor-pointer ${
                                  dayConf.sessions === 2
                                    ? "bg-yellow-400/10 border-yellow-400/30 text-yellow-400 font-extrabold"
                                    : "bg-neutral-950 border-neutral-900 text-neutral-500 hover:text-neutral-300"
                                }`}
                              >
                                TWO-A-DAY
                              </button>
                            </div>
                          </div>

                          {/* Conditional Selectors */}
                          {dayConf.sessions > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 transition">
                              {dayConf.sessions === 1 ? (
                                <div className="sm:col-span-2 space-y-1">
                                  <label className="block text-[9px] uppercase font-mono text-neutral-400">
                                    Primary Workout Focus Style
                                  </label>
                                  <select
                                    value={dayConf.s2 === "lifting" ? dayConf.s1 : dayConf.s2}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      // If user picks strength, we save to s2 as target workout; if cardio, s1 as target
                                      if (["cardio", "conditioning", "mobility"].includes(val)) {
                                        updateDaySchedule(dayName, { s1: val, s2: "lifting" });
                                      } else {
                                        updateDaySchedule(dayName, { s1: "cardio", s2: val });
                                      }
                                    }}
                                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-yellow-400 text-xs py-2 px-2.5 rounded-sm text-neutral-200 cursor-pointer outline-none"
                                  >
                                    <option value="cardio">☀️ Cardio Burn & Aerobic Base</option>
                                    <option value="upper">🏋️ Upper Body Strength Focus</option>
                                    <option value="lower">🏋️ Lower Body Target Split</option>
                                    <option value="heavy">💪 Heavy Strength & Power Compounds</option>
                                    <option value="conditioning">🏃 Athletic Conditioning & Speed</option>
                                    <option value="core">🧩 Core Stabilization & Ab Shred</option>
                                    <option value="mobility">🧘 Deep Flex & Active Mobility Recovery</option>
                                  </select>
                                </div>
                              ) : (
                                <>
                                  <div className="space-y-1">
                                    <label className="block text-[9px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                                      ☀️ Morning Session (Session 1)
                                    </label>
                                    <select
                                      value={dayConf.s1}
                                      onChange={(e) => updateDaySchedule(dayName, { s1: e.target.value })}
                                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-yellow-400 text-xs py-2 px-2.5 rounded-sm text-neutral-200 cursor-pointer outline-none"
                                    >
                                      <option value="cardio">☀️ Cardio Burn & Aerobic Base</option>
                                      <option value="upper">☀️ Upper Body Strength Activation</option>
                                      <option value="heavy">☀️ Heavy Lift Compounds</option>
                                      <option value="conditioning">☀️ Athletic Speed & Conditioning</option>
                                      <option value="mobility">☀️ Dynamic Mobility & Joint Release</option>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-[9px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                                      🌙 Evening Session (Session 2)
                                    </label>
                                    <select
                                      value={dayConf.s2}
                                      onChange={(e) => updateDaySchedule(dayName, { s2: e.target.value })}
                                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-yellow-400 text-xs py-2 px-2.5 rounded-sm text-neutral-200 cursor-pointer outline-none"
                                    >
                                      <option value="lifting">🌙 Hypertrophy & Density Sculpting</option>
                                      <option value="lower">🌙 Lower Body Target Leg Split</option>
                                      <option value="upper-strength">🌙 Upper Body Sculpt Finishers</option>
                                      <option value="core">🌙 Core Stabilization & Ab Shred</option>
                                      <option value="mobility">🌙 Deep Stretch & Recovery Fascia</option>
                                    </select>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {dayConf.sessions === 0 && (
                            <div className="text-[10px] text-neutral-500 font-mono italic">
                              😴 Full day allocated for muscle reconstruction, neural decompression, and mobility.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Ribbon summarizing everything together */}
                  {(() => {
                    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                    const schedulesList = daysOfWeek.map(d => dailySchedules[d] || { sessions: 0, s1: "mobility", s2: "mobility" });
                    const numWorkDays = schedulesList.filter(d => d.sessions > 0).length;
                    const numTotalSessions = schedulesList.reduce((acc, d) => acc + d.sessions, 0);
                    const numRestDays = schedulesList.filter(d => d.sessions === 0).length;

                    return (
                      <div className="bg-neutral-900 border border-neutral-800 border-l-2 border-l-yellow-400 p-4 rounded-sm space-y-3 font-mono">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-yellow-400 font-extrabold block">
                              Weekly Training Matrix Ribbon
                            </span>
                            <span className="text-[10px] text-neutral-400 leading-normal">
                              Review customized day-by-day split layouts. Gym matrices adapt on demand based on these choices.
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 text-[9px] uppercase font-bold text-neutral-300">
                            <span className="bg-neutral-950 px-2 py-1 rounded-sm border border-neutral-800">
                              🏃 {numWorkDays} Work Days
                            </span>
                            <span className="bg-neutral-950 px-2 py-1 rounded-sm border border-neutral-800">
                              🔥 {numTotalSessions} Total Sessions
                            </span>
                            <span className="bg-neutral-950 px-2 py-1 rounded-sm border border-neutral-800">
                              😴 {numRestDays} Rest Days
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                          {daysOfWeek.map((dayName) => {
                            const dayConf = dailySchedules[dayName] || { sessions: 0, s1: "mobility", s2: "mobility" };
                            return (
                              <div 
                                key={dayName} 
                                className={`p-2 rounded-sm border text-center transition flex flex-col justify-between h-16 ${
                                  dayConf.sessions === 0
                                    ? "bg-neutral-950/40 border-neutral-900 text-neutral-600"
                                    : dayConf.sessions === 1
                                      ? "bg-yellow-400/5 border-yellow-400/20 text-yellow-200"
                                      : "bg-yellow-400/10 border-yellow-400/40 text-yellow-400"
                                }`}
                              >
                                <div className="text-[9px] font-extrabold uppercase tracking-wide border-b border-neutral-900/60 pb-0.5 text-neutral-300">
                                  {dayName.slice(0, 3)}
                                </div>
                                
                                <div className="text-[8px] font-bold uppercase text-[9px] leading-tight">
                                  {dayConf.sessions === 0 && "Rest"}
                                  {dayConf.sessions === 1 && "1 Session"}
                                  {dayConf.sessions === 2 && "Two-a-Day"}
                                </div>

                                <div className="text-[7px] leading-none text-neutral-500 truncate uppercase mt-0.5">
                                  {dayConf.sessions === 0 && "Recovery"}
                                  {dayConf.sessions === 1 && (dayConf.s2 === "lifting" ? getSession1Label(dayConf.s1).split(" & ")[0] : getSession2Label(dayConf.s2).split(" & ")[0])}
                                  {dayConf.sessions === 2 && `${dayConf.s1} + ${dayConf.s2}`}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs uppercase font-mono text-neutral-400 mb-1.5">
                    Profile Visibility Setting
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setIsPrivate(true)}
                      className={`py-2.5 px-4 font-mono text-xs uppercase border rounded-sm flex items-center justify-center gap-2 transition cursor-pointer select-none ${
                        isPrivate 
                          ? "bg-neutral-800 border-neutral-600 text-white font-bold" 
                          : "bg-neutral-950 border-neutral-900 text-neutral-500 hover:text-white"
                      }`}
                      id="btn-setup-visibility-private"
                    >
                      <EyeOff className="h-4 w-4" />
                      Private Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPrivate(false)}
                      className={`py-2.5 px-4 font-mono text-xs uppercase border rounded-sm flex items-center justify-center gap-2 transition cursor-pointer select-none ${
                        !isPrivate 
                          ? "bg-yellow-400/10 border-yellow-400 text-yellow-400 font-bold" 
                          : "bg-neutral-950 border-neutral-900 text-neutral-500 hover:text-white"
                      }`}
                      id="btn-setup-visibility-public"
                    >
                      <Eye className="h-4 w-4" />
                      Community Sync (Public)
                    </button>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
                    {isPrivate 
                      ? "🔒 Invisible to others. Only you can view your calorie targets and timelines." 
                      : "👥 Visible in community listings. Other users can view your goals, streak, and target metrics."
                    }
                  </span>
                </div>
              </div>

            </div>

            {/* Calculations Dashboard Widget Preview (Cols 2) */}
            <div className="lg:col-span-2 bg-neutral-950/80 border border-neutral-900 rounded-sm p-4 md:p-6 space-y-6 self-start">
              <div className="border-b border-neutral-900 pb-3">
                <h4 className="font-mono text-xs uppercase tracking-wider font-extrabold text-yellow-400">
                  REAL-TIME METRIC ANALYSIS
                </h4>
                <p className="text-[10px] text-neutral-500 font-mono leading-relaxed mt-0.5">
                  Adaptive BMR projection mapping based on your current formulation.
                </p>
              </div>

              {/* Display Targets */}
              <div className="space-y-4">
                
                {/* Calories Target Card */}
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-sm relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 text-neutral-800 translate-y-3 translate-x-2 font-mono text-6xl font-black pointer-events-none opacity-20">
                    KCAL
                  </div>
                  <span className="text-[9px] uppercase font-mono text-neutral-400 tracking-wider block">
                    Daily Calorie Budget (Allowed Intake)
                  </span>
                  <span className="text-3xl font-mono font-extrabold text-white mt-1 block">
                    {calculatedMacros.targetCalories} <span className="text-xs font-normal text-neutral-400">Kcal to eat</span>
                  </span>
                  <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-neutral-850 text-[10px] font-mono text-neutral-400">
                    <span>Maintenance: {calculatedMacros.maintenanceCalories} kcal</span>
                    <span className={calculatedMacros.deficitOrSurplus < 0 ? "text-green-400" : "text-yellow-400"}>
                      {calculatedMacros.deficitOrSurplus >= 0 ? "+" : ""}{calculatedMacros.deficitOrSurplus} kcal
                    </span>
                  </div>
                </div>

                {/* Protein Goal Card */}
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-mono text-neutral-400 tracking-wider block">
                      Daily Protein Intake
                    </span>
                    <span className="text-2xl font-mono font-extrabold text-yellow-400 mt-1 block">
                      {calculatedMacros.proteinGoal}g
                    </span>
                  </div>
                  <Dumbbell className="h-8 w-8 text-neutral-600 stroke-[1.5]" />
                </div>

                {/* Water Target Card */}
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-sm">
                  <span className="text-[9px] uppercase font-mono text-neutral-400 tracking-wider block">
                    Hydration Quota
                  </span>
                  <span className="text-xl font-mono font-extrabold text-white mt-0.5 block">
                    {calculatedMacros.waterGoalCups} Cups <span className="text-xs font-normal text-neutral-400">({calculatedMacros.waterGoalCups * 250}ml)</span>
                  </span>
                </div>

                {/* Est time target */}
                {calculatedHeightCm > 0 && Math.abs(currentWeight - goalWeight) > 0 && (
                  <div className="bg-yellow-400/5 border border-yellow-400/20 p-4 rounded-sm text-xs font-mono rounded">
                    <span className="uppercase text-[9px] text-yellow-500 tracking-wider font-extrabold block mb-1">
                      🔬 Target Projection
                    </span>
                    At {Math.abs(calculatedMacros.deficitOrSurplus)} kcal/day, it is projected to take about{" "}
                    <span className="text-white font-extrabold text-sm border-b border-dotted border-white pb-0.5">{calculatedMacros.timelineWeeks}</span>{" "}
                    weeks to reach your target milestone.
                  </div>
                )}

              </div>

              {/* Quote details */}
              <div className="text-[10px] text-neutral-500 font-mono leading-relaxed bg-[#0f0f13] p-3 rounded-sm border border-neutral-900">
                🚨 SAFE CALORIFICATION MANDATE: FitDeficit locks a safe minimum threshold of 1200 kcal for energy preservation.
              </div>
            </div>

          </div>

          {/* Submit Trigger bottom */}
          <div className="border-t border-neutral-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-neutral-400 leading-normal max-w-md">
              By confirming these metrics, you agree that your targets can be recomputated to dynamically match your live weight tracker recordings.
            </div>
            
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-neutral-900 disabled:text-neutral-600 text-black font-mono text-sm font-bold uppercase tracking-wider rounded-sm shadow-lg flex items-center gap-2 items-center justify-center w-full sm:w-auto cursor-pointer"
              id="btn-setup-save"
            >
              {saving ? (
                <span className="inline-block animate-spin border-2 border-current border-t-transparent h-4 w-4 rounded-full" />
              ) : (
                <>
                  <Save className="h-4 w-4 stroke-[2.3]" />
                  CONFIRM METRICS
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
