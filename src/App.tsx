import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { UserProfile, CalorieCalculations, FoodLogItem } from "./types";
import { calculateMacros } from "./lib/calculators";
import { generateWorkoutPlan } from "./lib/workouts";

// Components
import AuthScreen from "./components/AuthScreen";
import ProfileSetup from "./components/ProfileSetup";
import WeightTracker from "./components/WeightTracker";
import FoodLog from "./components/FoodLog";
import WorkoutSchedule from "./components/WorkoutPlan";
import Community from "./components/Community";
import AdminPortal from "./components/AdminPortal";
import AIChatBot from "./components/AIChatBot";

// Icons
import { 
  Dumbbell, Flame, LogOut, Settings, Award, Droplet, 
  Sparkles, ShieldCheck, HelpCircle, Utensils, Route, 
  TrendingDown, Users, BookOpen, AlertCircle, RefreshCw, CheckCircle, Scale
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Local sync utilities for dashboard
  const [caloriesEatenToday, setCaloriesEatenToday] = useState(0);
  const [proteinEatenToday, setProteinEatenToday] = useState(0);
  const [waterCupsToday, setWaterCupsToday] = useState(0);
  const [workoutCompletedToday, setWorkoutCompletedToday] = useState(false);
  const [updatingStreak, setUpdatingStreak] = useState(false);
  const [updatingWater, setUpdatingWater] = useState(false);

  const todayDateStr = new Date().toISOString().split("T")[0];

  const getInitials = (n?: string) => {
    if (!n) return "FD";
    return n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  // Subscribe to Authentication state checks
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        setCurrentUser(authUser);
        await loadUserProfile(authUser.uid);
      } else {
        setCurrentUser(null);
        setProfile(null);
        setIsOnboarding(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch daily totals (food, water) whenever tab or date loads
  useEffect(() => {
    if (currentUser) {
      syncDashboardTotals();
    }
  }, [currentUser, activeTab]);

  const loadUserProfile = async (uid: string) => {
    try {
      const docRef = doc(db, "profiles", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profileData = docSnap.data() as UserProfile;
        setProfile(profileData);
        setIsOnboarding(false);
      } else {
        setIsOnboarding(true);
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
    }
  };

  const syncDashboardTotals = async () => {
    if (!currentUser) return;
    try {
      // 1. Fetch calorie and protein totals for today
      const foodQuery = query(
        collection(db, "foodLogs"),
        where("userId", "==", currentUser.uid),
        where("date", "==", todayDateStr)
      );
      const foodSnapshot = await getDocs(foodQuery);
      let cals = 0;
      let prot = 0;
      foodSnapshot.forEach((docSnap) => {
        const item = docSnap.data() as FoodLogItem;
        cals += item.calories || 0;
        prot += item.protein || 0;
      });
      setCaloriesEatenToday(cals);
      setProteinEatenToday(prot);

      // 2. Fetch water cups for today
      const waterQuery = query(
        collection(db, "waterLogs"),
        where("userId", "==", currentUser.uid),
        where("date", "==", todayDateStr)
      );
      const waterSnapshot = await getDocs(waterQuery);
      if (!waterSnapshot.empty) {
        const waterDoc = waterSnapshot.docs[0].data();
        setWaterCupsToday(waterDoc.cups || 0);
      } else {
        setWaterCupsToday(0);
      }

      // 3. Check if workout completed matches active profile status
      // We check if streak has already been updated for today
      const streakRef = doc(db, "profiles", currentUser.uid);
      const streakSnap = await getDoc(streakRef);
      if (streakSnap.exists()) {
        const pData = streakSnap.data() as UserProfile;
        if (pData.lastActiveDate === todayDateStr) {
          setWorkoutCompletedToday(true);
        } else {
          setWorkoutCompletedToday(false);
        }
      }
    } catch (e) {
      console.error("Dashboard synchronization failure:", e);
    }
  };

  const handleIncrementWater = async () => {
    if (!currentUser) return;
    setUpdatingWater(true);
    try {
      const newCups = waterCupsToday + 1;
      setWaterCupsToday(newCups);

      const waterQuery = query(
        collection(db, "waterLogs"),
        where("userId", "==", currentUser.uid),
        where("date", "==", todayDateStr)
      );
      const waterSnapshot = await getDocs(waterQuery);

      if (!waterSnapshot.empty) {
        const docRef = doc(db, "waterLogs", waterSnapshot.docs[0].id);
        await updateDoc(docRef, { cups: newCups });
      } else {
        await addDoc(collection(db, "waterLogs"), {
          userId: currentUser.uid,
          cups: newCups,
          date: todayDateStr,
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error("Failed to sync water increments:", e);
    } finally {
      setUpdatingWater(false);
    }
  };

  const handleDecrementWater = async () => {
    if (!currentUser || waterCupsToday <= 0) return;
    setUpdatingWater(true);
    try {
      const newCups = waterCupsToday - 1;
      setWaterCupsToday(newCups);

      const waterQuery = query(
        collection(db, "waterLogs"),
        where("userId", "==", currentUser.uid),
        where("date", "==", todayDateStr)
      );
      const waterSnapshot = await getDocs(waterQuery);

      if (!waterSnapshot.empty) {
        const docRef = doc(db, "waterLogs", waterSnapshot.docs[0].id);
        await updateDoc(docRef, { cups: newCups });
      }
    } catch (e) {
      console.error("Failed to sync water decrement:", e);
    } finally {
      setUpdatingWater(false);
    }
  };

  const handleCompleteWorkout = async () => {
    if (!currentUser || !profile || workoutCompletedToday || updatingStreak) return;
    setUpdatingStreak(true);

    try {
      const newStreakCount = (profile.workoutStreak || 0) + 1;
      const updatedProfile = {
        ...profile,
        workoutStreak: newStreakCount,
        lastActiveDate: todayDateStr
      };

      // Updates Firestore profile doc
      const profileRef = doc(db, "profiles", currentUser.uid);
      await updateDoc(profileRef, {
        workoutStreak: newStreakCount,
        lastActiveDate: todayDateStr
      });

      setProfile(updatedProfile);
      setWorkoutCompletedToday(true);
    } catch (err) {
      console.error("Critical: Could not update workout streak:", err);
    } finally {
      setUpdatingStreak(false);
    }
  };

  // Profile deletion sequence
  const handleDeleteUserProfile = async () => {
    if (!currentUser || !profile) return;
    const confirmation = window.confirm(
      "☢️ WARNING: This action is permanent! Are you sure you want to completely erase your physical profile, logged weights, nutrition logs, water totals, and credentials? This cannot be undone."
    );
    if (!confirmation) return;

    try {
      const uid = currentUser.uid;

      // 1. Delete Firestore profile
      await deleteDoc(doc(db, "profiles", uid));

      // 2. Delete Food Logs
      const foodQuery = query(collection(db, "foodLogs"), where("userId", "==", uid));
      const foodSnapshot = await getDocs(foodQuery);
      foodSnapshot.forEach(async (docSnap) => {
        await deleteDoc(doc(db, "foodLogs", docSnap.id));
      });

      // 3. Delete Weight Logs
      const weightQuery = query(collection(db, "weightLogs"), where("userId", "==", uid));
      const weightSnapshot = await getDocs(weightQuery);
      weightSnapshot.forEach(async (docSnap) => {
        await deleteDoc(doc(db, "weightLogs", docSnap.id));
      });

      // 4. Delete Water Logs
      const waterQuery = query(collection(db, "waterLogs"), where("userId", "==", uid));
      const waterSnapshot = await getDocs(waterQuery);
      waterSnapshot.forEach(async (docSnap) => {
        await deleteDoc(doc(db, "waterLogs", docSnap.id));
      });

      // 5. Sign Out
      await signOut(auth);
      alert("Your profile and historical logs have been permanently erased.");
    } catch (err: any) {
      console.error("Profile deletion sequence failed:", err);
      alert("Failed to delete all databases. You have been logged out manually.");
      await signOut(auth);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  // Loading indicator on boot up
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center font-mono">
        <Dumbbell className="h-10 w-10 text-yellow-400 animate-spin mb-3 stroke-[2]" />
        <span className="text-xs uppercase tracking-widest text-neutral-400">Loading FitDeficit system cores...</span>
      </div>
    );
  }

  // Not logged in -> Show login screen
  if (!currentUser) {
    return <AuthScreen onSuccess={() => setIsOnboarding(false)} />;
  }

  // Profile Onboarding Form
  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center mb-6">
          <span className="font-mono text-xl tracking-wider font-extrabold text-white">
            FIT<span className="text-yellow-400">DEFICIT</span>
          </span>
          <p className="text-[10px] text-neutral-500 font-mono uppercase mt-1">Configure physical metrics to unlock dashboard</p>
        </div>
        <ProfileSetup 
          userId={currentUser.uid} 
          userEmail={currentUser.email || "user@fitdeficit.com"} 
          onSave={(newProfile) => {
            setProfile(newProfile);
            setIsOnboarding(false);
            setActiveTab("dashboard");
          }} 
        />
      </div>
    );
  }

  // Make sure profile calculations align properly
  const macros: CalorieCalculations = profile 
    ? calculateMacros(profile) 
    : { maintenanceCalories: 2000, targetCalories: 1500, deficitOrSurplus: -500, timelineWeeks: 12, proteinGoal: 150, waterGoalCups: 8 };

  const currentWorkoutDayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const remainingKcal = macros.targetCalories - caloriesEatenToday;
  const isKcalCrossed = remainingKcal < 0;

  const todayWorkoutDay = (() => {
    if (!profile) return null;
    const plan = generateWorkoutPlan(
      profile.age,
      profile.workoutExperience || "beginner",
      profile.fitnessGoal,
      profile.workoutSessionsPerDay || 2,
      profile.twoADaySplitPreference || "cardio-lifting",
      profile.dailySchedules
    );
    const weekdaysArr = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayNameStr = weekdaysArr[new Date().getDay()];
    return plan.days.find(d => d.dayName.toLowerCase() === dayNameStr.toLowerCase()) || plan.days[0];
  })();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-yellow-400 selection:text-black">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-805 bg-[#0f0f0f] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400 p-1 rounded-sm">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic text-white flex items-center leading-none">
            FitDeficit
            <span className="text-[9px] font-mono font-bold uppercase py-0.5 px-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 tracking-normal not-italic font-black ml-1.5 align-middle">v2.0</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs font-mono" title="Consecutive workout streak">
            <Flame className="h-4 w-4 text-yellow-300 shrink-0" />
            <span className="text-white font-extrabold">{profile?.workoutStreak || 0}</span>
            <span className="text-zinc-500 uppercase text-[9px] font-bold">d streak</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-zinc-500 uppercase">{profile?.name || "USER"}</p>
              <p className="text-[10px] font-mono text-zinc-400">Streak Checked</p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-yellow-400 bg-zinc-800 overflow-hidden flex items-center justify-center">
              <div className="font-sans font-black text-xs text-white uppercase">{getInitials(profile?.name)}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-zinc-500 hover:text-red-400 transition ml-1"
            title="Logout Session"
            id="btn-header-logout"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Central Tab Navigation System */}
      <div className="bg-[#0f0f0f] border-b border-zinc-805 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="max-w-7xl mx-auto flex px-4">
          {[
            { id: "dashboard", label: "Dashboard", Icon: Award },
            { id: "food", label: "Meals Log", Icon: Utensils },
            { id: "workout", label: "Workout Splits", Icon: Route },
            { id: "chat", label: "AI Coach", Icon: Sparkles },
            { id: "weight", label: "Weight Records", Icon: Scale },
            { id: "community", label: "Community", Icon: Users },
            { id: "admin", label: "Admin Console", Icon: ShieldCheck },
            { id: "settings", label: "Metrics Edit", Icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-6 font-sans text-xs uppercase tracking-widest font-black transition border-b-2 shrink-0 select-none cursor-pointer ${
                activeTab === tab.id
                  ? "border-yellow-400 text-yellow-400 font-extrabold bg-zinc-900/40"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
              id={`tab-navigation-button-${tab.id}`}
            >
              <tab.Icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Core Screen Switcher inside Desktop grid bounding box */}
      <main className="flex-grow max-w-7xl mx-auto w-full py-6 px-4 md:px-8 space-y-8">
        
        {/* Render Active Tab */}
        {activeTab === "dashboard" && (
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            
            {/* Left Sidebar Pane */}
            <aside className="w-full lg:w-64 flex flex-col gap-4">
              
              {/* User Profile Info Widget */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg flex flex-col gap-3 shadow-md overflow-hidden">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">User Profile</h3>
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-black text-white tracking-tight break-all leading-tight">{profile?.name}</span>
                  <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 bg-yellow-400 rounded-full inline-block"></span>
                    {profile?.workoutExperience || "Beginner"} level
                  </span>
                </div>
                <div className="space-y-2 mt-2 font-mono">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Height</span>
                    <span className="text-zinc-200">{profile?.height} cm</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Weight</span>
                    <span className="text-zinc-200">{profile?.currentWeight} lbs</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Goal</span>
                    <span className="text-yellow-400 font-bold uppercase tracking-wider">{profile?.fitnessGoal === "lose_tone" ? "Lose & Tone" : profile?.fitnessGoal}</span>
                  </div>
                </div>
                <button onClick={() => setActiveTab("settings")} className="mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold uppercase tracking-tighter text-white transition select-none cursor-pointer">
                  Edit Profile
                </button>
              </div>

              {/* Instructions Widget */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg flex-1 shadow-md">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Instructions</h3>
                <div className="space-y-4 text-xs leading-relaxed text-zinc-400">
                  <p><strong className="text-white italic">SIGN UP:</strong> Enter your baseline metrics to calculate your personalized deficit.</p>
                  <p><strong className="text-white italic">LOGGING:</strong> Use the Meal Log to capture food nutrients and track daily macro balances.</p>
                  <p><strong className="text-white italic">PROTEIN:</strong> Aim for 1g of protein per pound of bodyweight. Use the status meters on the dashboard to review values.</p>
                  <button onClick={handleDeleteUserProfile} className="mt-2 text-red-500 hover:underline font-bold uppercase block text-left">
                    Delete Profile
                  </button>
                </div>
              </div>

            </aside>

            {/* Center Section: Main dynamic display area */}
            <section className="flex-1 flex flex-col gap-6">
              
              {/* Highlight Metrics Grid rows */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Deficit Card updated to display allowable calories (deficit metric target) */}
                <div className="bg-zinc-900 border-t-4 border-yellow-400 p-6 flex flex-col items-center justify-center gap-1.5 rounded-lg border-x border-b border-zinc-800 shadow-md text-center">
                  <p className="text-xs font-black uppercase text-zinc-500 tracking-wider">Daily Calorie Target</p>
                  <p className="text-5xl font-black font-mono text-white tracking-wide">
                    {macros.targetCalories}
                  </p>
                  <p className="text-[10px] text-zinc-400 tracking-widest uppercase font-bold">KCAL TO EAT / DAY</p>
                  <div className="mt-1 px-2.5 py-0.5 bg-zinc-800/60 border border-zinc-800 rounded-sm text-[10px] font-mono text-zinc-400">
                    Deficit: <span className={macros.deficitOrSurplus < 0 ? "text-green-400 font-bold" : "text-yellow-400 font-bold"}>
                      {macros.deficitOrSurplus > 0 ? `+${macros.deficitOrSurplus}` : macros.deficitOrSurplus}
                    </span> kcal
                  </div>
                </div>

                {/* Protein Card */}
                <div className="bg-zinc-900 border-t-4 border-white p-6 flex flex-col items-center justify-center gap-1 rounded-lg border-x border-b border-zinc-800 shadow-md">
                  <p className="text-xs font-black uppercase text-zinc-500">Daily Protein</p>
                  <p className="text-5xl font-black font-mono text-white tracking-widest">{proteinEatenToday}g</p>
                  <p className="text-xs text-zinc-400 tracking-widest uppercase">Goal: {macros.proteinGoal}g</p>
                  <div className="w-full bg-zinc-800 h-1.5 mt-2 overflow-hidden rounded-full">
                    <div className="bg-white h-full" style={{ width: `${Math.min(100, (proteinEatenToday / (macros.proteinGoal || 1)) * 100)}%` }}></div>
                  </div>
                </div>

                {/* Hydration target Card */}
                <div className="bg-zinc-900 border-t-4 border-zinc-500 p-6 flex flex-col items-center justify-center gap-1 rounded-lg border-x border-b border-zinc-800 shadow-md">
                  <p className="text-xs font-black uppercase text-zinc-500">Water Intake</p>
                  <p className="text-5xl font-black font-mono text-white tracking-widest">{waterCupsToday}<span className="text-xl text-zinc-400 uppercase font-sans"> cups</span></p>
                  <p className="text-xs text-zinc-400 tracking-widest uppercase">Goal: {macros.waterGoalCups} Cups</p>
                  
                  {/* Plus/minus buttons nestled inside card */}
                  <div className="flex gap-2.5 mt-2.5 w-full">
                    <button 
                      onClick={handleDecrementWater} 
                      disabled={updatingWater || waterCupsToday <= 0} 
                      className="flex-1 py-1 px-2 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-[10px] font-black uppercase text-white transition leading-none select-none cursor-pointer rounded-sm"
                    >
                      - Drop
                    </button>
                    <button 
                      onClick={handleIncrementWater} 
                      disabled={updatingWater} 
                      className="flex-1 py-1 px-2 border border-yellow-405/30 bg-yellow-400 text-black hover:bg-yellow-500 text-[10px] font-black uppercase transition leading-none select-none cursor-pointer rounded-sm"
                    >
                      + Add
                    </button>
                  </div>
                </div>

              </div>

              {/* Large Dashboard Overview Block */}
              <div className="bg-zinc-900 border border-zinc-800 p-8 flex flex-col rounded-lg shadow-md">
                
                <div className="flex justify-between items-start mb-8 gap-4 flex-wrap border-b border-zinc-800 pb-5">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-black italic uppercase leading-none text-white">Dashboard Overview</h2>
                    <p className="text-zinc-550 font-bold uppercase tracking-widest text-xs">Biometric System Feedback</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-4 py-2 border border-zinc-700 text-xs font-bold font-mono">WEEK {macros.timelineWeeks || 12}</div>
                    <div className="px-4 py-2 bg-yellow-400 text-black text-xs font-black uppercase">{profile?.goalWeight} LBS GOAL</div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                  
                  {/* Calorie Progress Ring circle */}
                  <div className="w-48 h-48 rounded-full border-[12px] border-zinc-800 relative flex items-center justify-center shrink-0 shadow-lg">
                    <div 
                      className="absolute inset-0 rounded-full border-[12px] border-yellow-400 border-r-transparent border-b-transparent transition-transform duration-300"
                      style={{ transform: `rotate(${Math.min(360, (caloriesEatenToday / (macros.targetCalories || 1)) * 360)}deg)` }}
                    />
                    <div className="text-center z-10 px-2">
                      <span className="block text-4xl font-black text-white font-mono leading-none">{caloriesEatenToday}</span>
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5 leading-none">Calories In</span>
                    </div>
                  </div>

                  {/* Core information stats columns */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4 w-full">
                    
                    <div className="border-l border-zinc-800 pl-6 flex flex-col justify-center">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Maintenance Est.</p>
                      <p className="text-2xl font-black text-white font-mono leading-none">{macros.maintenanceCalories} kcal</p>
                    </div>

                    <div className="border-l border-zinc-800 pl-6 flex flex-col justify-center">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Remaining Budget</p>
                      <p className={`text-2xl font-black font-mono leading-none ${isKcalCrossed ? "text-red-400" : "text-yellow-400"}`}>
                        {remainingKcal} kcal
                      </p>
                    </div>

                    <div className="border-l border-zinc-800 pl-6 flex flex-col justify-center">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Weight Goal Gap</p>
                      <p className="text-2xl font-black text-white font-mono leading-none">
                        {profile ? `${(profile.currentWeight - profile.goalWeight) > 0 ? "+" : ""}${(profile.currentWeight - profile.goalWeight).toFixed(1)} lbs` : "0 lbs"}
                      </p>
                    </div>

                    <div className="border-l border-zinc-800 pl-6 flex flex-col justify-center">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Active Streak</p>
                      <p className="text-2xl font-black text-white font-mono leading-none">{profile?.workoutStreak || 0} Days</p>
                    </div>

                  </div>

                </div>

                {/* Workout Checked Trigger */}
                <div className="mt-8 border-t border-zinc-800 pt-6">
                  <button
                    type="button"
                    onClick={handleCompleteWorkout}
                    disabled={workoutCompletedToday || updatingStreak}
                    className={`w-full py-3.5 font-sans text-xs font-black uppercase tracking-wider rounded transition flex items-center justify-center gap-2 select-none cursor-pointer ${
                      workoutCompletedToday
                        ? "bg-zinc-850 border border-zinc-750 text-zinc-400 pointer-events-none"
                        : "bg-yellow-400 hover:bg-yellow-500 text-black shadow-lg"
                    }`}
                    id="btn-workout-today-complete"
                  >
                    {workoutCompletedToday ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        SPLITS LOGGED & STREAK LOCKED!
                      </>
                    ) : updatingStreak ? (
                      "TETHERING RECORD..."
                    ) : (
                      <>
                        <Flame className="h-4 w-4" />
                        MARK TODAY'S WORKOUT COMPLETE
                      </>
                    )}
                  </button>
                </div>

              </div>

            </section>

            {/* Right Sidebar Pane */}
            <aside className="w-full lg:w-72 flex flex-col gap-6 shrink-0">
              
              {/* Today's Training detail panel in primary yellow */}
              <div className="bg-yellow-400 p-6 text-black flex-1 flex flex-col rounded-lg shadow-md justify-between min-h-[340px]">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-tighter mb-4 border-b border-black/20 pb-2 flex items-center gap-1.5">
                    <Dumbbell className="h-4 w-4" />
                    Today's Training
                  </h3>
                  {todayWorkoutDay ? (
                    <div className="flex-1 flex flex-col justify-center space-y-1">
                      <p className="text-3xl font-black italic uppercase leading-none tracking-tight">
                        {todayWorkoutDay.isRestDay ? "REST DAY" : todayWorkoutDay.focus.split(" ").slice(0, 2).join(" ")}
                      </p>
                      <span className="text-xs font-bold uppercase tracking-widest text-black/60 font-mono">
                        {todayWorkoutDay.dayName} Split
                      </span>
                      
                      {todayWorkoutDay.isRestDay ? (
                        <p className="text-xs font-medium leading-relaxed font-sans pt-4">
                          Today is scheduled as a structural active-recovery cycle. Focus on deep hydration and sleep to restore metabolic systems.
                        </p>
                      ) : (
                        <div className="pt-4">
                          <p className="text-[10px] font-black uppercase text-black/50 tracking-wider mb-2">Primary Muscle Groups</p>
                          <ul className="text-[11px] font-bold space-y-2 uppercase">
                            {todayWorkoutDay.eveningWeightTraining?.exercises.slice(0, 4).map((ex) => (
                              <li key={ex.name} className="flex justify-between border-b border-black/10 pb-1">
                                <span className="truncate max-w-[150px]" title={ex.name}>{ex.name}</span>
                                <span>{ex.sets}x{ex.reps.split(" ")[0]}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs font-bold">Configure biological metrics to formulate training profiles.</p>
                  )}
                </div>
                
                <div className="pt-6">
                  {todayWorkoutDay && !todayWorkoutDay.isRestDay && (
                    <p className="text-[10px] leading-tight font-bold text-black/70 italic mb-4">
                      Rest 90s between sets. Focus on explosive concentric movement.
                    </p>
                  )}
                  <button onClick={() => setActiveTab("workout")} className="w-full py-2 bg-black text-white text-[10px] font-black uppercase tracking-wider block text-center rounded-sm transition hover:bg-zinc-900 cursor-pointer">
                    Workout Splits Matrix
                  </button>
                </div>
              </div>

              {/* Community Widget Preview */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3">Community</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300 font-mono shrink-0">IM</div>
                    <div className="flex-1 text-[11px] min-w-0">
                      <p className="font-bold uppercase text-white truncate">@IronMike</p>
                      <p className="text-zinc-400 italic truncate text-zinc-500">Hit 200g protein today! 👊</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-yellow-400 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-900 font-mono shrink-0">SG</div>
                    <div className="flex-1 text-[11px] min-w-0">
                      <p className="font-bold uppercase text-white truncate">@SarahGainz</p>
                      <p className="text-zinc-400 italic truncate text-zinc-500">New Squat PR: 225lbs!</p>
                    </div>
                  </div>
                </div>

                <button onClick={() => setActiveTab("community")} className="w-full text-center mt-4 pt-3 border-t border-zinc-800 text-[10px] font-black text-zinc-400 hover:text-white uppercase transition tracking-wider cursor-pointer">
                  View Community Board →
                </button>
              </div>

            </aside>

          </div>
        )}

        {activeTab === "food" && (
          <FoodLog 
            userId={currentUser.uid} 
            profile={profile!} 
            calorieTarget={macros.targetCalories} 
            proteinTarget={macros.proteinGoal} 
          />
        )}

        {activeTab === "workout" && (
          <WorkoutSchedule 
            profile={profile!} 
            onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)} 
          />
        )}

        {activeTab === "chat" && (
          <AIChatBot />
        )}

        {activeTab === "weight" && (
          <WeightTracker 
            userId={currentUser.uid} 
            profile={profile!} 
            onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)} 
          />
        )}

        {activeTab === "community" && (
          <Community 
            userId={currentUser.uid} 
            profile={profile!} 
          />
        )}

        {activeTab === "admin" && (
          <AdminPortal />
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            
            {/* Standard setups edit */}
            <ProfileSetup 
              userId={currentUser.uid} 
              userEmail={currentUser.email || "user@fitdeficit.com"} 
              onSave={(updatedProfile) => {
                setProfile(updatedProfile);
                setActiveTab("dashboard");
              }} 
              initialProfile={profile}
            />

            {/* Warning block - Destructive tools */}
            <div className="bg-red-950/10 border border-red-900/30 p-5 rounded-sm max-w-4xl mx-auto space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs uppercase font-mono font-extrabold text-red-400">
                    DESTRUCTIVE TOOLS: DELETE USER PROFILE
                  </h4>
                  <p className="text-[11px] font-mono text-neutral-400 uppercase leading-relaxed">
                    Erase all logged weights, nutrient databases, and physical configurations. This will strip credentials off Firestore and clean auth nodes permanently.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleDeleteUserProfile}
                  className="bg-red-800 hover:bg-red-700 text-white font-mono text-xs uppercase px-5 py-2.5 rounded-sm transition tracking-wider font-extrabold cursor-pointer"
                  id="btn-settings-delete-account"
                >
                  ⚠️ PERMANENTLY ERASE MY PROFILE
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Global Safety disclaimers always present */}
        <section className="bg-neutral-950 border border-neutral-900 p-4.5 rounded-sm max-w-4xl mx-auto text-center" id="disclaimer-section">
          <div className="flex items-start gap-2.5 justify-center text-left max-w-2xl mx-auto">
            <AlertCircle className="h-4.5 w-4.5 text-neutral-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-neutral-500 font-mono leading-normal uppercase">
              🚨 <strong className="text-neutral-400">SAFETY DISCLAIMER:</strong> This app provides general fitness and nutrition guidance and is not medical advice. Users should consult a qualified doctor before beginning any new high-deficit calorie program, dietary restrictions, or split workout splits, especially if they have medical conditions or recent surgical procedures.
            </p>
          </div>
        </section>

      </main>

      {/* Persistent global footer */}
      <footer className="bg-[#121214] border-t border-neutral-950 py-6 text-center text-neutral-600 font-mono text-[10px] tracking-widest uppercase px-4 space-y-2">
        <div>
          FITDEFICIT // REGISTERED WORKSPACE: {currentUser.email}
        </div>
        <div className="text-neutral-500 font-extrabold">
          SYSTEM BUILT & DESIGNED // CREATED BY BOJ
        </div>
      </footer>

    </div>
  );
}
