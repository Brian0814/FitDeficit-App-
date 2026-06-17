import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfile } from "../types";
import { Shield, Eye, Lock, Search, HeartPulse, Sparkles, Filter, Scale, Users, Trophy } from "lucide-react";

export default function AdminPortal() {
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Users data
  const [loading, setLoading] = useState(false);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "191401") {
      setIsAdminAuth(true);
      setPasswordError(null);
      fetchAdminUsers();
    } else {
      setPasswordError("CORRUPT KEY CODE. CRITICAL ACCESS DENIED.");
    }
  };

  const fetchAdminUsers = async () => {
    setLoading(true);
    try {
      if (localStorage.getItem("fitdeficit_guest_mode") === "true") {
        setUsersList([
          { uid: "guest_user", name: "Sandbox Guest (You)", age: 30, height: 175, currentWeight: 180, goalWeight: 165, fitnessGoal: "lose", activityLevel: "moderate", workoutExperience: "beginner", dietaryPreference: "None", isPrivate: true, workoutSessionsPerDay: 2, twoADaySplitPreference: "cardio-lifting", workoutStreak: 0, createdAt: new Date().toISOString() },
          { uid: "p1", name: "RippedTitan", age: 28, height: 182, currentWeight: 195, goalWeight: 190, fitnessGoal: "tone", activityLevel: "active", workoutExperience: "advanced", dietaryPreference: "None", isPrivate: false, workoutSessionsPerDay: 2, twoADaySplitPreference: "cardio-lifting", workoutStreak: 7, createdAt: new Date().toISOString() },
          { uid: "p2", name: "ValkyrieLift", age: 25, height: 168, currentWeight: 140, goalWeight: 135, fitnessGoal: "lose_tone", activityLevel: "moderate", workoutExperience: "intermediate", dietaryPreference: "None", isPrivate: false, workoutSessionsPerDay: 1, twoADaySplitPreference: "cardio-lifting", workoutStreak: 4, createdAt: new Date().toISOString() }
        ]);
        setLoading(false);
        return;
      }

      // Admin bypass: load all registered user profiles
      const querySnapshot = await getDocs(collection(db, "profiles"));
      const data: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        data.push(doc.data() as UserProfile);
      });
      setUsersList(data);
    } catch (err) {
      console.error("Admin user fetch failure:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculations for stats
  const totalUsers = usersList.length;
  const publicUsers = usersList.filter(u => !u.isPrivate).length;
  const privateUsers = totalUsers - publicUsers;
  
  const averageAge = totalUsers > 0 
    ? Math.round(usersList.reduce((acc, current) => acc + (current.age || 0), 0) / totalUsers)
    : 0;

  const averageStreak = totalUsers > 0
    ? Math.round((usersList.reduce((acc, current) => acc + (current.workoutStreak || 0), 0) / totalUsers) * 10) / 10
    : 0;

  const filteredUsers = usersList.filter((u) => {
    const searchLow = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(searchLow) ||
      u.dietaryPreference.toLowerCase().includes(searchLow) ||
      u.fitnessGoal.toLowerCase().includes(searchLow)
    );
  });

  if (!isAdminAuth) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-[#121215] border border-neutral-800 p-6 rounded relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-yellow-400" />
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-12 w-12 bg-neutral-950 border border-neutral-900 rounded-full flex items-center justify-center text-yellow-500">
              <Shield className="h-6 w-6 stroke-[2]" />
            </div>
            
            <div>
              <h3 className="font-mono text-sm uppercase text-white font-extrabold tracking-widest">
                VERIFY ADMINISTRATOR SECURITY CODE
              </h3>
              <p className="text-[10px] text-neutral-500 font-mono mt-1 uppercase">
                Dual security handshake required to view private user lists.
              </p>
            </div>

            {passwordError && (
              <div className="w-full text-[10px] text-red-500 bg-red-950/20 border border-red-950 p-2 font-mono uppercase text-center rounded">
                ⚠️ {passwordError}
              </div>
            )}

            <form onSubmit={handleVerifyPassword} className="w-full space-y-3 pt-2">
              <input
                type="password"
                placeholder="PROXIMITY SECURE KEY CODE"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 outline-none p-3 text-xs font-mono text-white tracking-widest text-center uppercase"
                required
                id="input-admin-password"
              />
              
              <button
                type="submit"
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer rounded-sm"
                id="btn-admin-submit"
              >
                AUTHORIZE PORTAL
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#121215] border border-neutral-800 rounded-sm p-4 md:p-6 space-y-6">
      
      {/* Admin Title Block */}
      <div className="border-b border-neutral-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm uppercase font-mono font-extrabold text-neutral-300 flex items-center gap-1.5 leading-none">
            <Shield className="h-5 w-5 text-yellow-400" />
            SECURE ADMINISTRATIVE CONTROL CENTER
          </h3>
          <p className="text-[10px] text-neutral-500 font-mono mt-0.5 uppercase">
            ROOT COMMAND SHELL // BYPASS PRIVACY LAWS ENFORCED
          </p>
        </div>
        
        <button
          onClick={() => {
            setIsAdminAuth(false);
            setPasswordInput("");
          }}
          className="text-[9px] font-mono text-neutral-400 hover:text-white uppercase bg-neutral-950 border border-neutral-900 px-3 py-1.5 rounded transition cursor-pointer"
          id="btn-admin-logout"
        >
          🔒 Lock Shell
        </button>
      </div>

      {/* Aggregate Stats Dashboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Registrations */}
        <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase font-mono text-neutral-500 tracking-wider block">
              DB Registrants
            </span>
            <span className="text-2xl font-mono font-extrabold text-white mt-1 block">
              {totalUsers} <span className="text-xs font-normal text-neutral-500">Profiles</span>
            </span>
          </div>
          <Users className="h-8 w-8 text-neutral-800 shrink-0" />
        </div>

        {/* Average Streak */}
        <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase font-mono text-neutral-500 tracking-wider block">
              Avg Active Streak
            </span>
            <span className="text-2xl font-mono font-extrabold text-yellow-400 mt-1 block">
              {averageStreak} <span className="text-xs font-normal text-neutral-500">Days</span>
            </span>
          </div>
          <Trophy className="h-8 w-8 text-neutral-800 shrink-0" />
        </div>

        {/* average age */}
        <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase font-mono text-neutral-500 tracking-wider block">
              Avg Profile Age
            </span>
            <span className="text-2xl font-mono font-extrabold text-white mt-1 block">
              {averageAge} <span className="text-xs font-normal text-neutral-500">Yrs</span>
            </span>
          </div>
          <HeartPulse className="h-8 w-8 text-neutral-800 shrink-0" />
        </div>

        {/* privacy scopes split */}
        <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase font-mono text-neutral-500 tracking-wider block">
              Private vs Public
            </span>
            <span className="text-2xl font-mono font-extrabold text-white mt-1 block">
              {privateUsers} <span className="text-xs font-normal text-neutral-500">/ {publicUsers}</span>
            </span>
          </div>
          <Lock className="h-8 w-8 text-neutral-800 shrink-0" />
        </div>

      </div>

      {/* Users table list with search filter controls */}
      <div className="space-y-3">
        <div className="flex bg-neutral-950 p-2 border border-neutral-900 rounded-sm items-center gap-2">
          <Search className="h-4 w-4 text-neutral-500 shrink-0 ml-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username, goal (lose, tone), dietary preference..."
            className="bg-transparent border-none outline-none font-mono text-xs text-white placeholder-neutral-600 w-full"
            id="input-admin-search"
          />
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-neutral-500 font-mono animate-pulse">
            LOADING RAW DB ENTRIES...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-500 font-mono bg-neutral-950/40 border border-neutral-900 rounded-sm">
            NO USERS MATCHED SEARCH CRITERIA.
          </div>
        ) : (
          <div className="overflow-x-auto rounded border border-neutral-900 bg-neutral-950">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-neutral-900 text-neutral-400 uppercase font-mono text-[9px] tracking-wider bg-neutral-900/30">
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Age</th>
                  <th className="py-3 px-4 font-semibold">Height</th>
                  <th className="py-3 px-4 font-semibold">Current / Goal (lbs)</th>
                  <th className="py-3 px-4 font-semibold">Metric goal</th>
                  <th className="py-3 px-4 font-semibold">Diet style</th>
                  <th className="py-3 px-4 font-semibold">Streak</th>
                  <th className="py-3 px-4 font-semibold">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 text-neutral-300">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-neutral-900/40 transition">
                    <td className="py-3 px-4 font-semibold text-white">{user.name}</td>
                    <td className="py-3 px-4 font-mono">{user.age} yrs</td>
                    <td className="py-3 px-4 font-mono">{user.height} cm</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {user.currentWeight} / {user.goalWeight}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-neutral-900 border border-neutral-850 rounded text-neutral-400">
                        {user.fitnessGoal === "lose_tone" ? "lose & tone" : user.fitnessGoal}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">{user.dietaryPreference}</td>
                    <td className="py-3 px-4 font-mono font-bold text-yellow-400">{user.workoutStreak || 0}d</td>
                    <td className="py-3 px-4 font-mono text-[10px] uppercase">
                      {user.isPrivate ? (
                        <span className="text-red-400 flex items-center gap-1">🔒 Private</span>
                      ) : (
                        <span className="text-green-400 flex items-center gap-1">👥 Public</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
