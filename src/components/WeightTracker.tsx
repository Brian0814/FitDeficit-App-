import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { WeightLog, UserProfile } from "../types";
import { Scale, Calendar, Trash2, TrendingDown, Clock, ChevronRight, Sparkles } from "lucide-react";

interface WeightTrackerProps {
  userId: string;
  profile: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

export default function WeightTracker({ userId, profile, onProfileUpdate }: WeightTrackerProps) {
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [newWeight, setNewWeight] = useState<string>("");
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [targetGoalWeight, setTargetGoalWeight] = useState<string>(profile.goalWeight.toString());
  
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(false);
  const [updatingGoal, setUpdatingGoal] = useState(false);

  useEffect(() => {
    fetchWeightLogs();
  }, [userId]);

  const fetchWeightLogs = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "weightLogs"),
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(q);
      const data: WeightLog[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as WeightLog);
      });
      
      // Sort in ascending order by date for timeline/chart, then display newest first in list
      data.sort((a, b) => a.timestamp - b.timestamp);
      setWeightLogs(data);
    } catch (err) {
      console.error("Error fetching weight records:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightNum = parseFloat(newWeight);
    if (isNaN(weightNum) || weightNum <= 0) return;

    setLogging(true);
    try {
      const logEntry: Omit<WeightLog, "id"> = {
        userId,
        weight: weightNum,
        date: logDate,
        timestamp: new Date(logDate + "T12:00:00").getTime()
      };

      await addDoc(collection(db, "weightLogs"), logEntry);
      
      // Update in local state list
      const updatedLogs = [...weightLogs, logEntry].sort((a, b) => a.timestamp - b.timestamp);
      setWeightLogs(updatedLogs);
      setNewWeight("");

      // Update the user's current weight in Firestore/Profile State
      const profileRef = doc(db, "profiles", userId);
      await updateDoc(profileRef, { currentWeight: weightNum });
      onProfileUpdate({ ...profile, currentWeight: weightNum });
      
    } catch (err) {
      console.error("Failed to log weight:", err);
    } finally {
      setLogging(false);
    }
  };

  const handleDeleteLog = async (id: string, weightToDelete: number) => {
    try {
      await deleteDoc(doc(db, "weightLogs", id));
      const updatedLogs = weightLogs.filter((log) => log.id !== id);
      setWeightLogs(updatedLogs);

      // Optionally roll back currentWeight if deleted log matches current profile weight
      if (profile.currentWeight === weightToDelete && updatedLogs.length > 0) {
        const lastLog = updatedLogs[updatedLogs.length - 1];
        const profileRef = doc(db, "profiles", userId);
        await updateDoc(profileRef, { currentWeight: lastLog.weight });
        onProfileUpdate({ ...profile, currentWeight: lastLog.weight });
      }
    } catch (err) {
      console.error("Failed to delete log:", err);
    }
  };

  const handleUpdateGoalWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const goalNum = parseFloat(targetGoalWeight);
    if (isNaN(goalNum) || goalNum <= 0) return;

    setUpdatingGoal(true);
    try {
      const profileRef = doc(db, "profiles", userId);
      await updateDoc(profileRef, { goalWeight: goalNum });
      onProfileUpdate({ ...profile, goalWeight: goalNum });
    } catch (err) {
      console.error("Failed to update goal weight:", err);
    } finally {
      setUpdatingGoal(false);
    }
  };

  // Metrics details
  const initialWeight = weightLogs.length > 0 ? weightLogs[0].weight : profile.currentWeight;
  const currentWeightVal = profile.currentWeight;
  const goalWeightVal = profile.goalWeight;
  
  const poundsLostOrGained = currentWeightVal - initialWeight;
  const absPoundsDiff = Math.abs(poundsLostOrGained).toFixed(1);
  const remainingPounds = (currentWeightVal - goalWeightVal);
  const isLossGoal = goalWeightVal < initialWeight;

  // Render SVG Sparkline
  const renderSparkline = () => {
    if (weightLogs.length < 2) {
      return (
        <div className="h-40 bg-neutral-900/40 border border-neutral-900 rounded flex flex-col justify-center items-center text-xs text-neutral-500 font-mono">
          <TrendingDown className="h-5 w-5 mb-1.5 text-neutral-600" />
          Log weight on multiple days to view history plot.
        </div>
      );
    }

    const margin = 25;
    const width = 600;
    const height = 150;
    
    const weights = weightLogs.map(l => l.weight);
    const minW = Math.min(...weights, goalWeightVal) - 2;
    const maxW = Math.max(...weights, goalWeightVal) + 2;
    const rangeW = maxW - minW || 1;

    const points = weightLogs.map((log, index) => {
      const x = margin + (index / (weightLogs.length - 1)) * (width - margin * 2);
      const y = height - margin - ((log.weight - minW) / rangeW) * (height - margin * 2);
      return { x, y, weight: log.weight, date: log.date };
    });

    // Draw lines
    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    // Goal weight baseline line
    const goalY = height - margin - ((goalWeightVal - minW) / rangeW) * (height - margin * 2);

    return (
      <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-sm overflow-x-auto">
        <div className="min-w-[500px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            {/* Horizontal Grid lines */}
            <line x1={margin} y1={margin} x2={width - margin} y2={margin} stroke="#1b1b22" strokeWidth={1} strokeDasharray="3 3" />
            <line x1={margin} y1={height/2} x2={width - margin} y2={height/2} stroke="#1b1b22" strokeWidth={1} strokeDasharray="3 3" />
            <line x1={margin} y1={height - margin} x2={width - margin} y2={height - margin} stroke="#1b1b22" strokeWidth={1} />
            
            {/* Goal Weight Line */}
            {goalY >= margin && goalY <= height - margin && (
              <g>
                <line 
                  x1={margin} 
                  y1={goalY} 
                  x2={width - margin} 
                  y2={goalY} 
                  stroke="#facc15" 
                  strokeWidth={1.5} 
                  strokeDasharray="4 4" 
                  opacity={0.7}
                />
                <text x={width - margin - 50} y={goalY - 6} fill="#facc15" className="text-[10px] font-mono font-bold uppercase">
                  Goal: {goalWeightVal} lbs
                </text>
              </g>
            )}

            {/* Main Weight Path Line */}
            <path d={pathD} fill="none" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

            {/* Weight points details */}
            {points.map((p, i) => (
              <g key={i}>
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r={4} 
                  fill="#facc15" 
                  stroke="#000000" 
                  strokeWidth={1.5} 
                  className="cursor-pointer hover:scale-150 transition"
                />
                {/* Always print label for endpoints OR hover details */}
                {(i === 0 || i === points.length - 1) && (
                  <text 
                    x={p.x} 
                    y={p.y - 10} 
                    textAnchor="middle" 
                    fill="#cbd5e1" 
                    className="text-[10px] font-mono font-bold"
                  >
                    {p.weight}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
        <div className="flex justify-between items-center text-[9px] font-mono text-neutral-500 mt-2 px-2 uppercase">
          <span>Start: {weightLogs[0].date}</span>
          <span>Latest: {weightLogs[weightLogs.length - 1].date}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#121215] border border-neutral-800 rounded-sm p-4 md:p-6 space-y-6">
      
      {/* Target Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Scale current weight */}
        <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase font-mono text-neutral-500 tracking-wider block">
              Current Registered Weight
            </span>
            <span className="text-3xl font-mono font-extrabold text-white mt-1 block">
              {currentWeightVal} <span className="text-xs font-normal text-neutral-400">lbs</span>
            </span>
          </div>
          <div className="h-10 w-10 bg-neutral-900 rounded-sm flex items-center justify-center text-white border border-neutral-800">
            <Scale className="h-5 w-5" />
          </div>
        </div>

        {/* Changes achieved */}
        <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm">
          <span className="text-[9px] uppercase font-mono text-neutral-500 tracking-wider block">
            Net Weight Adaptation
          </span>
          <span className="text-2xl font-mono font-extrabold block mt-1 text-white">
            {poundsLostOrGained === 0 ? (
              <span className="text-neutral-400">No Change</span>
            ) : poundsLostOrGained < 0 ? (
              <span className="text-green-400">-{absPoundsDiff} lbs</span>
            ) : (
              <span className="text-yellow-400">+{absPoundsDiff} lbs</span>
            )}
          </span>
          <span className="text-[9px] text-neutral-500 font-mono mt-0.5 block">
            Compared to first log ({initialWeight} lbs)
          </span>
        </div>

        {/* Goal delta remaining */}
        <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm">
          <span className="text-[9px] uppercase font-mono text-neutral-500 tracking-wider block">
            Distance to Target Goal
          </span>
          <span className="text-2xl font-mono font-extrabold block mt-1 text-white">
            {remainingPounds === 0 ? (
              <span className="text-yellow-400 flex items-center gap-1">Goal Reached! <Sparkles className="h-4 w-4" /></span>
            ) : remainingPounds > 0 ? (
              <span>Lose {remainingPounds.toFixed(1)} lbs</span>
            ) : (
              <span className="text-yellow-400">Surplus {Math.abs(remainingPounds).toFixed(1)} lbs</span>
            )}
          </span>
          <span className="text-[9px] text-neutral-500 font-mono mt-0.5 block">
            Target Goal Weight: {goalWeightVal} lbs
          </span>
        </div>

      </div>

      {/* Weight History Line Plot */}
      <div className="space-y-2">
        <h4 className="text-xs uppercase font-mono tracking-wider font-extrabold text-neutral-400 flex items-center gap-1.5">
          <TrendingDown className="h-4 w-4 text-yellow-400" />
          METRIC TIMELINE
        </h4>
        {renderSparkline()}
      </div>

      {/* Forms Segment: Add Log & Edit Goal Weight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-900">
        
        {/* Form: Add Daily log */}
        <form onSubmit={handleAddWeight} className="space-y-3">
          <h4 className="text-xs uppercase font-mono text-neutral-400 font-extrabold">
            REGISTER WEIGHT CHANGE
          </h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">
                Weight (lbs)
              </label>
              <input
                type="number"
                step="0.1"
                min="50"
                max="600"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="180.5"
                className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 outline-none p-2 text-xs font-mono text-white rounded-sm"
                required
                id="input-weight-new-value"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">
                Date Completed
              </label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 outline-none p-2 text-xs font-mono text-white rounded-sm"
                required
                id="input-weight-new-date"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={logging}
            className="w-full py-2 bg-white hover:bg-neutral-200 text-black font-mono text-xs font-bold uppercase tracking-wider rounded-sm transition cursor-pointer"
            id="btn-weight-submit-log"
          >
            {logging ? "RECORDING..." : "COMMIT WEIGHT REGISTER"}
          </button>
        </form>

        {/* Form: Edit Goal weight */}
        <form onSubmit={handleUpdateGoalWeight} className="space-y-3">
          <h4 className="text-xs uppercase font-mono text-neutral-400 font-extrabold">
            ADJUST GOAL WEIGHT METRIC
          </h4>
          
          <div>
            <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">
              Target Goal Weight (lbs)
            </label>
            <input
              type="number"
              step="0.1"
              min="50"
              max="600"
              value={targetGoalWeight}
              onChange={(e) => setTargetGoalWeight(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 outline-none p-2 text-xs font-mono text-white rounded-sm"
              required
              id="input-weight-goal-adjust"
            />
          </div>

          <button
            type="submit"
            disabled={updatingGoal}
            className="w-full py-2 bg-yellow-400 hover:bg-yellow-500 disabled:bg-neutral-900 text-black font-mono text-xs font-bold uppercase tracking-wider rounded-sm transition cursor-pointer"
            id="btn-weight-goal-update"
          >
            {updatingGoal ? "ADJUSTING..." : "RE-FORMULATE GOAL METRIC"}
          </button>
        </form>

      </div>

      {/* History Log list */}
      <div className="pt-4 border-t border-neutral-900">
        <h4 className="text-xs uppercase font-mono font-extrabold text-neutral-400 mb-2.5 flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          HISTORICAL LOG ENTRIES ({weightLogs.length})
        </h4>
        
        {loading ? (
          <div className="py-4 text-center text-xs text-neutral-500 font-mono animate-pulse">
            LOADING WEIGHT HISTORY STORES...
          </div>
        ) : weightLogs.length === 0 ? (
          <div className="py-3 text-center text-xs text-neutral-500 font-mono bg-neutral-950/40 border border-neutral-900 rounded-sm">
            NO LOG ENTRIES COMPLETED YET.
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
            {[...weightLogs].reverse().map((log) => (
              <div 
                key={log.id} 
                className="bg-neutral-950/60 border border-neutral-900 px-3 py-2 rounded-sm flex justify-between items-center text-xs transition hover:border-neutral-850"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                  <span className="font-mono text-white font-semibold">{log.weight} lbs</span>
                  <span className="font-mono text-[10px] text-neutral-500">[{log.date}]</span>
                </div>
                {log.id && (
                  <button
                    onClick={() => handleDeleteLog(log.id!, log.weight)}
                    className="text-neutral-500 hover:text-red-400 p-1"
                    title="Delete record"
                    id={`btn-weight-delete-${log.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
