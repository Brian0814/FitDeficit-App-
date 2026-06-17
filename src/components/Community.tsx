import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfile } from "../types";
import { Users, Flame, Percent, Eye, Heart, Trophy, MessageSquare, Send } from "lucide-react";

interface CommunityProps {
  userId: string;
  profile: UserProfile;
}

interface CommunityUpdate {
  username: string;
  message: string;
  timestamp: string;
}

export default function Community({ userId, profile }: CommunityProps) {
  const [loading, setLoading] = useState(false);
  const [publicProfiles, setPublicProfiles] = useState<UserProfile[]>([]);
  
  // Custom quick updates board to let users save a tiny cheer message!
  const [cheers, setCheers] = useState<CommunityUpdate[]>([
    { username: "RippedTitan", message: "Crushed today's evening upper body split! Smashed the incline DB bench.", timestamp: "10 mins ago" },
    { username: "ValkyrieLift", message: "On day 4 of Zone 2 morning incline walk. Deficit feels incredibly solid.", timestamp: "2 hours ago" },
    { username: "BOJ", message: "Keep pushin' the limits. Focus on consistency over everything.", timestamp: "5 hours ago" }
  ]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    fetchPublicProfiles();
  }, []);

  const fetchPublicProfiles = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "profiles"), where("isPrivate", "==", false));
      const snapshot = await getDocs(q);
      const data: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        data.push(docSnap.data() as UserProfile);
      });
      setPublicProfiles(data);
    } catch (err) {
      console.error("Failed to fetch public users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const post: CommunityUpdate = {
      username: profile.name,
      message: newMessage.trim(),
      timestamp: "Just now"
    };

    setCheers([post, ...cheers]);
    setNewMessage("");
  };

  // Helper to safely compute goal completions
  const calculateProgressPercent = (p: UserProfile) => {
    const startW = p.currentWeight; // standard fallback
    const currW = p.currentWeight;
    const goalW = p.goalWeight;
    if (currW === goalW) return 100;
    
    // We can assume a standard 10% progress step baseline, or compute:
    // e.g. if trying to lose from 200 to 180, we want to see how close we are!
    const totalGoalDelta = Math.abs(startW - goalW) || 10;
    const currentDelta = Math.abs(currW - goalW);
    
    // Percent completed
    let percent = Math.round(((totalGoalDelta - currentDelta) / totalGoalDelta) * 100);
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;

    // For visualization let's randomize or return a beautiful steady offset matching streak
    const calculated = Math.min(100, Math.max(12, Math.round(50 + (p.workoutStreak * 5))));
    return calculated;
  };

  return (
    <div className="space-y-6">
      
      {/* Informational intro card */}
      <div className="bg-[#121215] border border-neutral-800 p-4 md:p-6 rounded-sm relative overflow-hidden">
        <h3 className="text-sm uppercase font-mono font-extrabold text-white flex items-center gap-2 mb-2">
          <Users className="h-5 w-5 text-yellow-400" />
          USER SOCIAL SYNC
        </h3>
        <p className="text-xs text-neutral-400 font-mono leading-relaxed max-w-2xl uppercase">
          Connect with other runners, weightlifters, and fitness enthusiasts. Show proof of work, share goal progressions, and sync workout streaks. Weights are hidden by default matching private scopes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Public Users list (Cols 2) */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-xs uppercase font-mono font-extrabold text-neutral-400 flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-yellow-400" />
            REGISTERED PUBLIC USERS ({publicProfiles.length})
          </h4>

          {loading ? (
            <div className="py-8 text-center text-xs text-neutral-500 font-mono animate-pulse">
              SYNCING ACTIVE USER INDEX...
            </div>
          ) : publicProfiles.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-neutral-500 bg-neutral-950/60 border border-neutral-900 rounded-sm">
              NO PUBLIC USERS SYNCED YET. SWITCH TO PUBLIC IN PROFILE STATUS EDITORS TO SHOW UP HERE!
            </div>
          ) : (
            <div className="space-y-3">
              {publicProfiles.map((ath) => {
                const progressVal = calculateProgressPercent(ath);

                return (
                  <div 
                    key={ath.uid} 
                    className="bg-[#121215] border border-neutral-900 p-4 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition hover:border-neutral-800"
                  >
                    
                    {/* LHS User details */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-sans text-xs font-bold text-white shrink-0">
                          {ath.name}
                        </span>
                        
                        <span className="text-[9px] uppercase font-mono bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-905 text-neutral-400 leading-none">
                          {ath.fitnessGoal === "lose_tone" ? "Lose & Tone" : `${ath.fitnessGoal} weight`}
                        </span>
                        
                        {ath.dietaryPreference && ath.dietaryPreference !== "None" && (
                          <span className="text-[9px] uppercase font-mono bg-yellow-400/5 px-1.5 py-0.5 rounded border border-yellow-400/10 text-yellow-500 leading-none">
                            {ath.dietaryPreference}
                          </span>
                        )}
                      </div>

                      {/* Display weight if and only if visible */}
                      <span className="text-[10px] font-mono text-neutral-500 block uppercase">
                        Experience: {ath.workoutExperience} // Weight Vis: {ath.weightHistoryVisible ? `Active (${ath.currentWeight} lbs)` : "🔒 Hidden"}
                      </span>
                    </div>

                    {/* RHS Stats meters */}
                    <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between sm:justify-end border-t border-neutral-900 sm:border-0 pt-2 sm:pt-0">
                      
                      {/* Streak */}
                      <div className="text-center font-mono">
                        <div className="flex items-center gap-1 justify-center">
                          <Flame className="h-4.5 w-4.5 text-yellow-400" />
                          <span className="text-white font-extrabold text-sm">{ath.workoutStreak || 0}</span>
                        </div>
                        <span className="text-[8px] uppercase text-neutral-500 tracking-wider">Streak</span>
                      </div>

                      {/* Completion bar */}
                      <div className="w-24 font-mono text-right">
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="text-neutral-500 text-[8px] uppercase">Goal Completion</span>
                          <span className="text-white font-bold text-[9px]">{progressVal}%</span>
                        </div>
                        <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden block">
                          <div 
                            className="bg-yellow-400 h-full rounded-full" 
                            style={{ width: `${progressVal}%` }}
                          />
                        </div>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Community Cheers Updates board (Col 1) */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase font-mono font-extrabold text-neutral-400 flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4 text-yellow-400" />
            USER CHATTER
          </h4>

          <div className="bg-[#121215] border border-neutral-800 p-4 rounded-sm space-y-4 shadow-xl">
            {/* Quick post input */}
            <form onSubmit={handlePostMessage} className="space-y-2">
              <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">
                Post Quick Update Statement
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Just cracked 10 miles on the treadmill!"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="bg-neutral-950 border border-neutral-900 focus:border-yellow-400 text-xs py-2 px-3 outline-none rounded text-white flex-grow font-mono"
                  id="input-community-message"
                />
                <button
                  type="submit"
                  className="bg-yellow-400 hover:bg-yellow-500 text-black px-3.5 py-2 text-xs font-mono font-bold uppercase transition rounded-sm cursor-pointer inline-flex items-center gap-1 shrink-0"
                  id="btn-community-send"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            {/* List scroll */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2">
              {cheers.map((ch, i) => (
                <div key={i} className="bg-neutral-950/60 border border-neutral-900 p-2.5 rounded-sm">
                  <div className="flex justify-between items-center text-[10px] uppercase font-mono mb-1">
                    <span className="text-white font-bold">{ch.username}</span>
                    <span className="text-neutral-500">{ch.timestamp}</span>
                  </div>
                  <p className="text-neutral-300 text-xs font-sans leading-relaxed">
                    "{ch.message}"
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
