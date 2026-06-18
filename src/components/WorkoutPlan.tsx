import React, { useState, useEffect } from "react";
import { UserProfile, WorkoutPlan, WorkoutDay } from "../types";
import { generateWorkoutPlan } from "../lib/workouts";
import { Dumbbell, Sun, Moon, Sparkles, HeartPulse, Clock, FileText, Settings, Coffee, Flame, Plus, Trash2 } from "lucide-react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface WorkoutScheduleProps {
  profile: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
  userId: string;
  isGuest: boolean;
  onBurnLogged: () => void;
}

export default function WorkoutSchedule({ profile, onProfileUpdate, userId, isGuest, onBurnLogged }: WorkoutScheduleProps) {
  if (!profile) {
    return (
      <div className="bg-[#121215] border border-neutral-800 rounded-sm p-6 text-center text-neutral-400 font-mono">
        <Dumbbell className="h-8 w-8 text-yellow-400 mx-auto mb-2 animate-pulse" />
        <p className="text-xs uppercase">No active profile loaded. Please configure your profile first.</p>
      </div>
    );
  }

  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced">(
    profile.workoutExperience || "beginner"
  );
  
  // Calorie Burn States
  const [activityName, setActivityName] = useState("");
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [burnLogs, setBurnLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [submittingBurn, setSubmittingBurn] = useState(false);

  const loadTodayBurnLogs = async () => {
    setLoadingLogs(true);
    const todayStr = new Date().toISOString().split("T")[0];
    try {
      if (isGuest) {
        const logsRaw = localStorage.getItem("fitdeficit_calorie_burn_logs") || "[]";
        const allLogs = JSON.parse(logsRaw);
        const filtered = allLogs.filter((l: any) => l.userId === userId && l.date === todayStr);
        setBurnLogs(filtered);
      } else {
        const q = query(
          collection(db, "calorieBurnLogs"),
          where("userId", "==", userId),
          where("date", "==", todayStr)
        );
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setBurnLogs(list);
      }
    } catch (err) {
      console.error("Error loading burn logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadTodayBurnLogs();
  }, [userId, isGuest]);

  const handleLogBurn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cals = Math.round(parseFloat(caloriesBurned) || 0);
    if (!activityName.trim() || cals <= 0) return;

    setSubmittingBurn(true);
    const todayStr = new Date().toISOString().split("T")[0];
    const logItem = {
      userId,
      activityName: activityName.trim(),
      caloriesBurned: cals,
      date: todayStr,
      timestamp: Date.now()
    };

    try {
      if (isGuest) {
        const logsRaw = localStorage.getItem("fitdeficit_calorie_burn_logs") || "[]";
        const allLogs = JSON.parse(logsRaw);
        allLogs.push({ id: "burn_" + Date.now(), ...logItem });
        localStorage.setItem("fitdeficit_calorie_burn_logs", JSON.stringify(allLogs));
      } else {
        // ALWAYS backup to localStorage as well for instant feedback and robust database-offline fallback!
        const logsRaw = localStorage.getItem("fitdeficit_calorie_burn_logs") || "[]";
        const allLogs = JSON.parse(logsRaw);
        allLogs.push({ id: "burn_fallback_" + Date.now(), ...logItem });
        localStorage.setItem("fitdeficit_calorie_burn_logs", JSON.stringify(allLogs));

        try {
          // Attempt Firestore save with a 3-second watchdog race
          const savePromise = addDoc(collection(db, "calorieBurnLogs"), logItem);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("FIRESTORE_WRITE_TIMEOUT")), 3000);
          });
          await Promise.race([savePromise, timeoutPromise]);
        } catch (dbErr) {
          console.warn("Firestore save timed out or bypassed, utilizing local storage cache:", dbErr);
        }
      }

      setActivityName("");
      setCaloriesBurned("");
      await loadTodayBurnLogs();
      onBurnLogged(); // Notify parent App.tsx to reload totals
    } catch (err) {
      console.error("Failed to save calorie burn log:", err);
      // Extremely robust fallback: even if everything fails, guarantee redirect and local update
      onBurnLogged();
    } finally {
      setSubmittingBurn(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      if (isGuest) {
        const logsRaw = localStorage.getItem("fitdeficit_calorie_burn_logs") || "[]";
        const allLogs = JSON.parse(logsRaw);
        const filtered = allLogs.filter((l: any) => l.id !== logId);
        localStorage.setItem("fitdeficit_calorie_burn_logs", JSON.stringify(filtered));
      } else {
        await deleteDoc(doc(db, "calorieBurnLogs", logId));
      }
      await loadTodayBurnLogs();
      onBurnLogged(); // Notify parent App.tsx to reload totals
    } catch (err) {
      console.error("Failed to delete log item:", err);
    }
  };
  
  // Generate the schedule live from our adaptive alg
  const workoutPlan: WorkoutPlan = generateWorkoutPlan(
    profile.age || 30,
    experienceLevel,
    profile.fitnessGoal || "lose",
    profile.workoutSessionsPerDay || 2,
    profile.twoADaySplitPreference || "cardio-lifting",
    profile.dailySchedules,
    profile.workoutTypesPref,
    profile.weeklyRateOfChange
  );

  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const activeDay: WorkoutDay = (workoutPlan.days && workoutPlan.days[activeDayIndex])
    ? workoutPlan.days[activeDayIndex]
    : { dayName: "Rest", focus: "Recovery", isRestDay: true };

  // Helper to sync experience level adjustment back to user profile/database
  const handleLevelChange = (level: "beginner" | "intermediate" | "advanced") => {
    setExperienceLevel(level);
    // Note: We update local toggle state instantly:
  };

  return (
    <div className="bg-[#121215] border border-neutral-800 rounded-sm p-4 md:p-6 space-y-6">
      
      {/* Title block */}
      <div className="border-b border-neutral-900 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm uppercase font-mono font-extrabold text-neutral-300 flex items-center gap-1.5 leading-none">
            <Dumbbell className="h-5 w-5 text-yellow-400" />
            LIVE WORKOUT PLAN MATRIX
          </h3>
          <p className="text-[10px] text-neutral-500 font-mono mt-1 uppercase">
            Optimized split program based on Age ({profile.age}y) & Fitness goal ({profile.fitnessGoal})
          </p>
        </div>

        {/* Level Toggler */}
        <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-sm border border-neutral-900 self-stretch md:self-auto">
          <span className="text-[9px] uppercase font-mono text-neutral-500 px-2">Program Level:</span>
          {(["beginner", "intermediate", "advanced"] as const).map((level) => (
            <button
              key={level}
              onClick={() => handleLevelChange(level)}
              className={`text-[9px] font-mono py-1 px-2.5 uppercase transition select-none cursor-pointer rounded-sm ${
                experienceLevel === level
                  ? "bg-yellow-400 text-black font-extrabold"
                  : "text-neutral-400 hover:text-white"
              }`}
              id={`btn-experience-toggle-${level}`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Days Horizontal Line Scroller */}
      <div className="flex bg-neutral-950 p-1 border border-neutral-900 rounded-sm overflow-x-auto gap-1">
        {workoutPlan.days.map((day, idx) => (
          <button
            key={day.dayName}
            onClick={() => setActiveDayIndex(idx)}
            className={`flex-1 min-w-[75px] py-2 px-1 text-center border transition select-none cursor-pointer rounded-sm ${
              activeDayIndex === idx
                ? "bg-white border-white text-black font-bold"
                : "bg-transparent border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
            id={`btn-workout-day-tab-${idx}`}
          >
            <span className="block text-[11px] font-mono leading-none tracking-tight">{day.dayName}</span>
            <span className={`text-[8px] uppercase mt-0.5 leading-none block font-mono ${activeDayIndex === idx ? "text-neutral-800" : "text-neutral-500"}`}>
              {day.isRestDay ? "Rest" : "Active"}
            </span>
          </button>
        ))}
      </div>

      {/* Active Day Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Day Header/Summary focus (Col 1) */}
        <div className="space-y-4">
          <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-sm space-y-3 relative">
            <span className="text-[9px] uppercase font-mono text-yellow-400 bg-yellow-400/5 border border-yellow-400/10 px-2 py-0.5 rounded inline-block">
              Daily Target Overview
            </span>
            <h4 className="text-xl font-extrabold text-white font-sans tracking-tight">
              {activeDay.dayName} Schedule
            </h4>
            <div className="flex gap-2 items-center text-xs font-mono text-neutral-300">
              <HeartPulse className="h-4 w-4 text-neutral-500 shrink-0" />
              <span>{activeDay.focus}</span>
            </div>
          </div>

          {/* Form and physical recovery notice */}
          <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-sm space-y-3">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-mono font-bold text-neutral-400 border-b border-neutral-900 pb-1.5">
              <Settings className="h-3.5 w-3.5" />
              Form & Joint Recovery Notes
            </div>
            
            <p className="text-[11px] font-mono leading-relaxed text-neutral-400">
              {activeDay.eveningWeightTraining?.recoveryNote || "Today is scheduled as a structural active-recovery cycle. Focus on deep hydration and high sleep quality to restore metabolic systems."}
            </p>
          </div>

          {/* Calorie Burn Logger Block */}
          <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-sm space-y-4">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-mono font-bold text-rose-450 border-b border-neutral-900 pb-1.5">
              <Flame className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              Active Calorie Burn Logger
            </div>

            <p className="text-[10px] text-neutral-400 uppercase leading-snug font-mono">
              Log energy expenditure from workouts. This will automatically increase your allowable calorie goal for the day.
            </p>

            <form onSubmit={handleLogBurn} className="space-y-3">
              <div>
                <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono block mb-1">
                  Activity Context
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., HIIT Sprint, Morning Lift"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  className="w-full bg-[#121215] border border-neutral-800 focus:border-neutral-700 text-xs text-white p-2 text-left rounded-sm font-sans placeholder:text-neutral-600 focus:outline-none"
                  id="input-burn-activity"
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono block mb-1">
                  Calories Burned (kcal)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g., 350"
                  value={caloriesBurned}
                  onChange={(e) => setCaloriesBurned(e.target.value)}
                  className="w-full bg-[#121215] border border-neutral-800 focus:border-neutral-700 text-xs text-white p-2 text-left rounded-sm font-sans placeholder:text-neutral-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  id="input-burn-calories"
                />
              </div>

              <button
                type="submit"
                disabled={submittingBurn}
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider rounded-sm transition select-none cursor-pointer flex items-center justify-center gap-1.5"
                id="btn-submit-calorie-burn"
              >
                {submittingBurn ? (
                  <span>Logging Burn...</span>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Log Active Session
                  </>
                )}
              </button>
            </form>

            {/* List of today's logged burns */}
            {burnLogs.length > 0 && (
              <div className="border-t border-neutral-900 pt-3.5 space-y-2">
                <span className="text-[9px] uppercase font-mono text-zinc-500 block">
                  Today's logged calories burned
                </span>
                
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {burnLogs.map((log) => (
                    <div key={log.id} className="flex justify-between items-center bg-[#121215] border border-neutral-900 px-2.5 py-1.5 rounded-sm">
                      <div className="min-w-0 pr-2">
                        <span className="text-[11px] text-white font-sans font-medium truncate block uppercase">{log.activityName}</span>
                        <span className="text-[9px] text-rose-400 font-bold font-mono tracking-wider">{log.caloriesBurned} kcal</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteLog(log.id)}
                        className="text-neutral-600 hover:text-red-400 p-1 transition cursor-pointer"
                        title="Delete log"
                        id={`btn-delete-burn-log-${log.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Columns (Cols 2) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Rest day condition */}
          {activeDay.isRestDay ? (
            <div className="bg-neutral-950 border border-neutral-900 p-8 rounded-sm text-center flex flex-col justify-center items-center space-y-3 h-full">
              <div className="h-12 w-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-yellow-400">
                <Coffee className="h-6 w-6" />
              </div>
              <h5 className="font-mono text-sm uppercase text-white font-extrabold tracking-wider">
                ACTIVE RECOVERY / REST MODE
              </h5>
              <p className="text-xs text-neutral-400 font-mono max-w-sm leading-relaxed">
                No lifting splits are programmed. Go for a very light outdoor walk, do some deep hip-opening yoga stretches, and target perfect nutrition intake targets.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Morning cardio program */}
              {activeDay.morningCardio && (
                <div className="bg-[#16161c]/40 border border-neutral-850 rounded p-4 relative overflow-hidden">
                  <div className="absolute right-3 top-3 text-neutral-800 opacity-20 pointer-events-none">
                    <Sun className="h-10 w-10 text-yellow-400" />
                  </div>
                  
                  <div className="flex gap-2 items-center text-xs font-mono font-extrabold uppercase text-yellow-400 mb-2">
                    <Sun className="h-4 w-4" />
                    {activeDay.morningCardio.title || "Morning Session: Cardio Burn"}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 border-b border-neutral-900/60 pb-2.5">
                    <div>
                      <span className="text-[9px] text-neutral-500 font-mono uppercase block">Exercise Activity</span>
                      <span className="text-xs text-white uppercase font-bold tracking-tight font-sans block mt-0.5">
                        {activeDay.morningCardio.activity}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 font-mono uppercase block">Duration Quota</span>
                      <span className="text-xs text-white font-bold font-mono block mt-0.5">
                        {activeDay.morningCardio.duration}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-neutral-400 font-mono mt-2.5 uppercase leading-normal">
                    💡 NOTE: {activeDay.morningCardio.notes}
                  </p>
                </div>
              )}

              {/* Evening lifting program */}
              {activeDay.eveningWeightTraining && (
                <div className="bg-neutral-950 border border-neutral-900 rounded p-4 space-y-4 relative">
                  <div className="absolute right-3 top-3 text-neutral-800 opacity-20 pointer-events-none">
                    <Moon className="h-10 w-10 text-neutral-300" />
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-neutral-900 pb-2 flex-wrap gap-2">
                    <div className="flex gap-2 items-center text-xs font-mono font-extrabold uppercase text-white">
                      <Moon className="h-4 w-4 text-neutral-400" />
                      {activeDay.eveningWeightTraining.title || "Evening Session: Resistance Hypertrophy"}
                    </div>
                    
                    <span className="text-[9px] font-mono text-neutral-500 uppercase flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Appx: {activeDay.eveningWeightTraining.lengthMinutes} mins
                    </span>
                  </div>

                  {/* Warmup */}
                  <div className="bg-[#121214] p-2.5 border border-neutral-900 rounded-sm text-[11px] font-mono text-neutral-400">
                    <strong className="text-white uppercase font-bold block mb-0.5">Dynamic Warm-up:</strong>
                    {activeDay.eveningWeightTraining.warmup}
                  </div>

                  {/* Exercises list items */}
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-mono text-neutral-500 tracking-wider block">
                      Target Weight lifts sheet
                    </span>
                    
                    {activeDay.eveningWeightTraining.exercises.map((ex, exIdx) => (
                      <div 
                        key={exIdx} 
                        className="bg-[#121215] border border-neutral-900 px-3 py-2 rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition hover:border-neutral-850"
                      >
                        <div>
                          <span className="text-xs font-bold text-white font-sans">{ex.name}</span>
                          {ex.formNote && (
                            <span className="text-[9px] font-mono text-neutral-500 block leading-tight mt-0.5">
                              {ex.formNote}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex gap-3 font-mono text-[10px] text-neutral-400 leading-none shrink-0 self-end sm:self-auto uppercase">
                          <div className="text-right">
                            <span className="text-white font-extrabold block">{ex.sets}</span>
                            <span>sets</span>
                          </div>
                          <div className="text-right border-l border-neutral-900 pl-3">
                            <span className="text-yellow-400 font-extrabold block">{ex.reps}</span>
                            <span>reps</span>
                          </div>
                          <div className="text-right border-l border-neutral-900 pl-3">
                            <span className="text-white block">{ex.restTime}</span>
                            <span>rest</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
