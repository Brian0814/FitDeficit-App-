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
  const [activeTab, setActiveTab ] = useState<string>("dashboard");
  const [isOnboarding, setIsOnboarding] = useState(false);

  // States for custom Profile Deletion Confirm Modal
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingDatabase, setDeletingDatabase] = useState(false);
  const [deleteStatusMessage, setDeleteStatusMessage] = useState<string | null>(null);

  // Local sync utilities for dashboard
  const [caloriesEatenToday, setCaloriesEatenToday] = useState(0);
  const [caloriesBurnedToday, setCaloriesBurnedToday] = useState(0);
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
    const isGuestBypass = localStorage.getItem("fitdeficit_guest_mode") === "true";
    if (isGuestBypass) {
      const guestUser = {
        uid: "guest_user",
        email: "guest@fitdeficit.local",
        displayName: "Sandbox Guest",
        isGuest: true
      };
      setCurrentUser(guestUser);
      loadUserProfile("guest_user");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        setCurrentUser(authUser);
        await loadUserProfile(authUser.uid);
      } else {
        const activeGuest = localStorage.getItem("fitdeficit_guest_mode") === "true";
        if (!activeGuest) {
          setCurrentUser(null);
          setProfile(null);
          setIsOnboarding(false);
        }
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
      if (uid === "guest_user") {
        const savedProfile = localStorage.getItem("fitdeficit_profile_guest_user");
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
          setIsOnboarding(false);
        } else {
          setIsOnboarding(true);
        }
        return;
      }

      // Add a timeout to getDoc so it never blocks the app from booting if offline or unconfigured
      const docRef = doc(db, "profiles", uid);
      const getDocPromise = getDoc(docRef);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("FIRESTORE_READ_TIMEOUT")), 4000);
      });

      const docSnap = await Promise.race([getDocPromise, timeoutPromise]);

      if (docSnap.exists()) {
        const profileData = docSnap.data() as UserProfile;
        setProfile(profileData);
        setIsOnboarding(false);
      } else {
        // No Firestore profile found, let's check local storage offline backups!
        const offlineProfile = localStorage.getItem("fitdeficit_offline_profile_" + uid);
        if (offlineProfile) {
          setProfile(JSON.parse(offlineProfile));
          setIsOnboarding(false);
        } else {
          setIsOnboarding(true);
        }
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
      // Fallback to local storage offline backups!
      const offlineProfile = localStorage.getItem("fitdeficit_offline_profile_" + uid);
      if (offlineProfile) {
        setProfile(JSON.parse(offlineProfile));
        setIsOnboarding(false);
      } else {
        setIsOnboarding(true);
      }
    }
  };

  const syncDashboardTotals = async () => {
    if (!currentUser) return;
    try {
      if (currentUser.isGuest) {
        // Load Food Logs from localStorage
        const allFoodLogsRaw = localStorage.getItem("fitdeficit_food_logs") || "[]";
        const allFoodLogs: FoodLogItem[] = JSON.parse(allFoodLogsRaw);
        const physicalFoodLogs = allFoodLogs.filter(f => f.userId === currentUser.uid && f.date === todayDateStr);
        let cals = 0;
        let prot = 0;
        physicalFoodLogs.forEach(item => {
          cals += item.calories || 0;
          prot += item.protein || 0;
        });
        setCaloriesEatenToday(cals);
        setProteinEatenToday(prot);

        // Load Calorie Burn Logs from localStorage
        const allBurnLogsRaw = localStorage.getItem("fitdeficit_calorie_burn_logs") || "[]";
        const allBurnLogs = JSON.parse(allBurnLogsRaw);
        const physicalBurnLogs = allBurnLogs.filter((b: any) => b.userId === currentUser.uid && b.date === todayDateStr);
        let burnedCals = 0;
        physicalBurnLogs.forEach((b: any) => {
          burnedCals += b.caloriesBurned || 0;
        });
        setCaloriesBurnedToday(burnedCals);

        // Load Water Logs from localStorage
        const waterLogsRaw = localStorage.getItem("fitdeficit_water_logs") || "[]";
        const allWaterLogs = JSON.parse(waterLogsRaw);
        const todayWater = allWaterLogs.find((w: any) => w.userId === currentUser.uid && w.date === todayDateStr);
        setWaterCupsToday(todayWater ? todayWater.cups : 0);

        // Load Streak/Completed status from profile
        const savedProfile = localStorage.getItem("fitdeficit_profile_guest_user");
        if (savedProfile) {
          const pData = JSON.parse(savedProfile) as UserProfile;
          if (pData.lastActiveDate === todayDateStr) {
            setWorkoutCompletedToday(true);
          } else {
            setWorkoutCompletedToday(false);
          }
        }
        return;
      }

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

      // 1b. Fetch active calorie burn logs for today
      let burnedCals = 0;
      try {
        const burnQuery = query(
          collection(db, "calorieBurnLogs"),
          where("userId", "==", currentUser.uid),
          where("date", "==", todayDateStr)
        );
        const burnSnapshot = await getDocs(burnQuery);
        burnSnapshot.forEach((docSnap) => {
          const item = docSnap.data();
          burnedCals += item.caloriesBurned || 0;
        });
      } catch (err) {
        console.error("Failed to read calorieBurnLogs from Firestore:", err);
      }

      // Fallback/combine with offline storage just in case they added offline or are guest
      try {
        const allBurnLogsRaw = localStorage.getItem("fitdeficit_calorie_burn_logs") || "[]";
        const allBurnLogs = JSON.parse(allBurnLogsRaw);
        const physicalBurnLogs = allBurnLogs.filter((b: any) => b.userId === currentUser.uid && b.date === todayDateStr);
        let localBurned = 0;
        physicalBurnLogs.forEach((b: any) => {
          localBurned += b.caloriesBurned || 0;
        });
        if (localBurned > burnedCals) {
          burnedCals = localBurned;
        }
      } catch (e) {}

      setCaloriesBurnedToday(burnedCals);

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

      if (currentUser.isGuest) {
        const waterLogsRaw = localStorage.getItem("fitdeficit_water_logs") || "[]";
        const allWaterLogs = JSON.parse(waterLogsRaw);
        const index = allWaterLogs.findIndex((w: any) => w.userId === currentUser.uid && w.date === todayDateStr);
        if (index > -1) {
          allWaterLogs[index].cups = newCups;
        } else {
          allWaterLogs.push({
            id: "water_" + Date.now(),
            userId: currentUser.uid,
            cups: newCups,
            date: todayDateStr,
            timestamp: Date.now()
          });
        }
        localStorage.setItem("fitdeficit_water_logs", JSON.stringify(allWaterLogs));
        return;
      }

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

      if (currentUser.isGuest) {
        const waterLogsRaw = localStorage.getItem("fitdeficit_water_logs") || "[]";
        const allWaterLogs = JSON.parse(waterLogsRaw);
        const index = allWaterLogs.findIndex((w: any) => w.userId === currentUser.uid && w.date === todayDateStr);
        if (index > -1) {
          allWaterLogs[index].cups = newCups;
          localStorage.setItem("fitdeficit_water_logs", JSON.stringify(allWaterLogs));
        }
        return;
      }

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

      if (currentUser.isGuest) {
        localStorage.setItem("fitdeficit_profile_guest_user", JSON.stringify(updatedProfile));
        setProfile(updatedProfile);
        setWorkoutCompletedToday(true);
        return;
      }

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

  // Profile deletion state trigger
  const handleDeleteUserProfile = () => {
    if (!currentUser || !profile) return;
    setShowDeleteConfirmModal(true);
  };

  // Profile deletion implementation sequence
  const executeProfileDeletion = async () => {
    if (!currentUser || !profile) return;
    setDeletingDatabase(true);
    setDeleteStatusMessage("Starting account records erasure...");

    try {
      const uid = currentUser.uid;

      if (currentUser.isGuest) {
        setDeleteStatusMessage("Pruning guest memory nodes...");
        localStorage.removeItem("fitdeficit_profile_guest_user");
        localStorage.removeItem("fitdeficit_guest_mode");
        
        try {
          const allFoodRaw = localStorage.getItem("fitdeficit_food_logs") || "[]";
          const allFood = JSON.parse(allFoodRaw);
          localStorage.setItem("fitdeficit_food_logs", JSON.stringify(allFood.filter((f: any) => f.userId !== uid)));
        } catch (e) {}
        
        try {
          const allWeightsRaw = localStorage.getItem("fitdeficit_weight_logs") || "[]";
          const allWeights = JSON.parse(allWeightsRaw);
          localStorage.setItem("fitdeficit_weight_logs", JSON.stringify(allWeights.filter((w: any) => w.userId !== uid)));
        } catch (e) {}

        try {
          const allWaterRaw = localStorage.getItem("fitdeficit_water_logs") || "[]";
          const allWater = JSON.parse(allWaterRaw);
          localStorage.setItem("fitdeficit_water_logs", JSON.stringify(allWater.filter((w: any) => w.userId !== uid)));
        } catch (e) {}

        try {
          const allBurnRaw = localStorage.getItem("fitdeficit_calorie_burn_logs") || "[]";
          const allBurn = JSON.parse(allBurnRaw);
          localStorage.setItem("fitdeficit_calorie_burn_logs", JSON.stringify(allBurn.filter((b: any) => b.userId !== uid)));
        } catch (e) {}

        setDeleteStatusMessage("Clear completed! Goodbye!");
        setTimeout(() => {
          setCurrentUser(null);
          setProfile(null);
          setIsOnboarding(false);
          setShowDeleteConfirmModal(false);
          setDeletingDatabase(false);
          setDeleteStatusMessage(null);
        }, 1500);
        return;
      }

      setDeleteStatusMessage("Erasing physical profile record fields from Firestore...");
      // 1. Delete Firestore profile
      await deleteDoc(doc(db, "profiles", uid));

      setDeleteStatusMessage("Eviscerating user meals and food logging tables...");
      // 2. Delete Food Logs
      const foodQuery = query(collection(db, "foodLogs"), where("userId", "==", uid));
      const foodSnapshot = await getDocs(foodQuery);
      const foodDeletes = foodSnapshot.docs.map((docSnap) => deleteDoc(doc(db, "foodLogs", docSnap.id)));
      await Promise.all(foodDeletes);

      setDeleteStatusMessage("Purging physical body weight metrics records...");
      // 3. Delete Weight Logs
      const weightQuery = query(collection(db, "weightLogs"), where("userId", "==", uid));
      const weightSnapshot = await getDocs(weightQuery);
      const weightDeletes = weightSnapshot.docs.map((docSnap) => deleteDoc(doc(db, "weightLogs", docSnap.id)));
      await Promise.all(weightDeletes);

      setDeleteStatusMessage("Wiping systemic hydration logs databases...");
      // 4. Delete Water Logs
      const waterQuery = query(collection(db, "waterLogs"), where("userId", "==", uid));
      const waterSnapshot = await getDocs(waterQuery);
      const waterDeletes = waterSnapshot.docs.map((docSnap) => deleteDoc(doc(db, "waterLogs", docSnap.id)));
      await Promise.all(waterDeletes);

      setDeleteStatusMessage("Incinerating physical activity calorie burn logs...");
      // 4b. Delete Calorie Burn Logs
      try {
        const burnQuery = query(collection(db, "calorieBurnLogs"), where("userId", "==", uid));
        const burnSnapshot = await getDocs(burnQuery);
        const burnDeletes = burnSnapshot.docs.map((docSnap) => deleteDoc(doc(db, "calorieBurnLogs", docSnap.id)));
        await Promise.all(burnDeletes);
      } catch (err) {
        console.error("Failed to delete cloud burn logs during purge:", err);
      }

      setDeleteStatusMessage("De-authenticating credentials session instance...");
      // 5. Sign Out & Clear State to Route to Login Screen
      await signOut(auth);
      setDeleteStatusMessage("Permanent erasure completed successfully! Re-routing...");
      
      setTimeout(() => {
        setCurrentUser(null);
        setProfile(null);
        setIsOnboarding(false);
        setShowDeleteConfirmModal(false);
        setDeletingDatabase(false);
        setDeleteStatusMessage(null);
      }, 1500);

    } catch (err: any) {
      console.error("Profile deletion sequence failed:", err);
      setDeleteStatusMessage(`Failure: ${err.message || err}. Logging out manually...`);
      
      try {
        await signOut(auth);
      } catch (signOutErr) {
        console.error("Manual sign out failed:", signOutErr);
      }
      
      setTimeout(() => {
        setCurrentUser(null);
        setProfile(null);
        setIsOnboarding(false);
        setShowDeleteConfirmModal(false);
        setDeletingDatabase(false);
        setDeleteStatusMessage(null);
      }, 3000);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("fitdeficit_guest_mode");
      await signOut(auth);
      setCurrentUser(null);
      setProfile(null);
      setIsOnboarding(false);
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
    return (
      <AuthScreen 
        onSuccess={() => {
          const isGuestBypass = localStorage.getItem("fitdeficit_guest_mode") === "true";
          if (isGuestBypass) {
            const guestUser = {
              uid: "guest_user",
              email: "guest@fitdeficit.local",
              displayName: "Sandbox Guest",
              isGuest: true
            };
            setCurrentUser(guestUser);
            loadUserProfile("guest_user");
          }
          setIsOnboarding(false);
        }} 
      />
    );
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
          onSave={(newProfile, targetTab) => {
            setProfile(newProfile);
            setIsOnboarding(false);
            setActiveTab(targetTab || "dashboard");
          }} 
        />
      </div>
    );
  }

  // Calculate current week of program based on profile creation date
  const getCurrentProgramWeek = () => {
    if (!profile || !profile.createdAt) return 1;
    try {
      const createdTime = new Date(profile.createdAt).getTime();
      const currentTime = new Date().getTime();
      if (isNaN(createdTime)) return 1;
      
      const diffTime = currentTime - createdTime;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      // Days 0-6 are Week 1, 7-13 are Week 2, etc.
      const currentWeek = Math.floor(diffDays / 7) + 1;
      return Math.max(1, currentWeek);
    } catch (e) {
      return 1;
    }
  };

  // Make sure profile calculations align properly
  const macros: CalorieCalculations = profile 
    ? calculateMacros(profile) 
    : { maintenanceCalories: 2000, targetCalories: 1500, deficitOrSurplus: -500, timelineWeeks: 12, proteinGoal: 150, waterGoalCups: 8 };

  const currentWorkoutDayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const adjustedTargetCalories = (macros.targetCalories || 1500) + caloriesBurnedToday;
  const remainingKcal = adjustedTargetCalories - caloriesEatenToday;
  const isKcalCrossed = remainingKcal < 0;

  const todayWorkoutDay = (() => {
    if (!profile) return null;
    const plan = generateWorkoutPlan(
      profile.age,
      profile.workoutExperience || "beginner",
      profile.fitnessGoal,
      profile.workoutSessionsPerDay || 2,
      profile.twoADaySplitPreference || "cardio-lifting",
      profile.dailySchedules,
      profile.workoutTypesPref
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
            { id: "workout", label: "Workouts", Icon: Route },
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Deficit Card updated to display allowable calories (deficit metric target) */}
                <div className="bg-zinc-900 border-t-4 border-yellow-400 p-6 flex flex-col items-center justify-center gap-1.5 rounded-lg border-x border-b border-zinc-800 shadow-md text-center">
                  <p className="text-xs font-black uppercase text-zinc-500 tracking-wider">Daily Calorie Goal</p>
                  <p className="text-4xl font-black font-mono text-white tracking-wide">
                    {adjustedTargetCalories}
                  </p>
                  <p className="text-[10px] text-zinc-400 tracking-widest uppercase font-bold">KCAL TO EAT TODAY</p>
                  <div className="mt-1 px-2.5 py-0.5 bg-zinc-800/60 border border-zinc-800 rounded-sm text-[10px] font-mono text-zinc-400">
                    Base: <span className="text-zinc-350 font-bold">{macros.targetCalories}</span>
                    {caloriesBurnedToday > 0 && (
                      <span className="text-green-400 font-bold"> + {caloriesBurnedToday} burn</span>
                    )}
                  </div>
                </div>

                {/* Calories Burned Card */}
                <div className="bg-zinc-900 border-t-4 border-rose-500 p-6 flex flex-col items-center justify-center gap-1.5 rounded-lg border-x border-b border-zinc-800 shadow-md text-center">
                  <p className="text-xs font-black uppercase text-rose-500 tracking-wider">Calories Burned</p>
                  <p className="text-4xl font-black font-mono text-white tracking-wide">
                    {caloriesBurnedToday}
                  </p>
                  <p className="text-[10px] text-zinc-400 tracking-widest uppercase font-bold">ACTIVE KCAL BURNED</p>
                  <button 
                    onClick={() => setActiveTab("workout")}
                    className="mt-1.5 py-1 px-2 border border-rose-950/40 bg-zinc-800 hover:bg-zinc-700 text-rose-450 hover:text-rose-350 text-[10px] font-black uppercase transition leading-none select-none cursor-pointer rounded-sm"
                  >
                    Log burn &rarr;
                  </button>
                </div>

                {/* Protein Card */}
                <div className="bg-zinc-900 border-t-4 border-white p-6 flex flex-col items-center justify-center gap-1 rounded-lg border-x border-b border-zinc-800 shadow-md">
                  <p className="text-xs font-black uppercase text-zinc-500">Daily Protein</p>
                  <p className="text-5xl font-black font-mono text-white tracking-widest">{proteinEatenToday}g</p>
                  <p className="text-xs text-zinc-400 tracking-widest uppercase">Goal: {macros.proteinGoal}g</p>
                  <div className="w-full bg-zinc-800 h-1.5 mt-2 overflow-hidden rounded-full font-sans">
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
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="px-4 py-2 border border-zinc-700 text-xs font-bold font-mono uppercase">WEEK {getCurrentProgramWeek()}</div>
                    <div className="px-4 py-2 border border-zinc-800 text-zinc-400 text-xs font-bold font-mono uppercase">
                      EST: {macros.timelineWeeks || 12} WEEKS
                    </div>
                    <div className="px-4 py-2 bg-yellow-400 text-black text-xs font-black uppercase">{profile?.goalWeight} LBS GOAL</div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                  
                  {/* Calorie Progress Ring circle */}
                  <div className="w-48 h-48 rounded-full border-[12px] border-zinc-800 relative flex items-center justify-center shrink-0 shadow-lg">
                    <div 
                      className="absolute inset-0 rounded-full border-[12px] border-yellow-400 border-r-transparent border-b-transparent transition-transform duration-300"
                      style={{ transform: `rotate(${Math.min(360, (caloriesEatenToday / (adjustedTargetCalories || 1)) * 360)}deg)` }}
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
                    My Workouts Matrix
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
            calorieTarget={adjustedTargetCalories} 
            proteinTarget={macros.proteinGoal} 
          />
        )}

        {activeTab === "workout" && (
          <WorkoutSchedule 
            profile={profile!} 
            onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)} 
            userId={currentUser.uid}
            isGuest={currentUser.isGuest ? true : false}
            onBurnLogged={() => {
              syncDashboardTotals();
              setActiveTab("dashboard");
            }}
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
              onSave={(updatedProfile, targetTab) => {
                setProfile(updatedProfile);
                setActiveTab(targetTab || "dashboard");
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

      {/* Custom Portal Confirmation Modal for Profile Deletion */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border-2 border-red-900/50 max-w-md w-full p-6 rounded-md shadow-2xl relative overflow-hidden flex flex-col gap-4">
            
            {/* Top red bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-650 animate-pulse"></div>

            <div className="flex items-center gap-3 text-red-500 mb-1">
              <AlertCircle className="h-6 w-6 animate-bounce" />
              <h3 className="text-sm font-black font-mono tracking-widest uppercase">
                DESTRUCTIVE ACTION CONFIRMATION
              </h3>
            </div>

            <p className="text-xs text-zinc-300 font-mono tracking-wide uppercase leading-relaxed">
              ☢️ <strong className="text-red-400">WARNING: Permanent erasure sequence.</strong>
            </p>
            
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              This action is absolute and key-protected. This will completely and irrevocably purge your physical body metrics, daily workout streaks, logged weights, nutrition databases, hydration totals, and credentials. All data held on the Cloud database system will be terminated.
            </p>

            {deleteStatusMessage && (
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm">
                <p className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 font-bold flex items-center gap-2">
                  <span className="h-2 w-2 bg-yellow-400 rounded-full animate-ping inline-block shrink-0"></span>
                  {deleteStatusMessage}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-2">
              <button
                disabled={deletingDatabase}
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider font-mono rounded-sm transition cursor-pointer"
              >
                ABORT
              </button>
              <button
                disabled={deletingDatabase}
                onClick={executeProfileDeletion}
                className="px-4 py-2 bg-red-850 hover:bg-red-750 disabled:bg-red-950 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider font-mono rounded-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                {deletingDatabase ? (
                  <>
                    <span className="h-3 w-3 border-2 border-white/35 border-t-white rounded-full animate-spin inline-block"></span>
                    ERASING...
                  </>
                ) : (
                  "CONFIRM & PURGE"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
