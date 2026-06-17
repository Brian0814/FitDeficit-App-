import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { Dumbbell, ShieldAlert, KeyRound, Mail, UserPlus, LogIn, CircleHelp, Info, Eye, EyeOff } from "lucide-react";

interface AuthProps {
  onSuccess: () => void;
}

export default function AuthScreen({ onSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all credentials.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = "Authentication failed.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        msg = "Invalid email or password. Please try again.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "This email is already registered. Try logging in instead.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password is too weak. Must be at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Please enter a valid email address.";
      } else {
        msg = err.message || msg;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onSuccess();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col justify-between p-4 md:p-8 font-sans selection:bg-yellow-400 selection:text-black">
      
      {/* Header */}
      <header className="max-w-7xl mx-auto w-full flex justify-between items-center py-4 border-b border-neutral-900">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400 p-2 rounded-sm text-black inline-flex items-center justify-center">
            <Dumbbell className="h-6 w-6 stroke-[2.5]" />
          </div>
          <span className="font-mono text-xl tracking-wider font-extrabold text-white">
            FIT<span className="text-yellow-400">DEFICIT</span>
          </span>
        </div>
        <button 
          onClick={() => setShowInstructions(!showInstructions)} 
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-yellow-400 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-sm transition font-mono uppercase tracking-wider"
          id="btn-instructions-toggle"
        >
          <CircleHelp className="h-4 w-4" />
          How to Setup
        </button>
      </header>

      {/* Main Body */}
      <main className="flex-grow flex items-center justify-center my-8">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          {/* Informational Column (Left) */}
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs uppercase font-mono font-bold tracking-widest text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded inline-block">
                Elite Performance Dashboard
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                FUEL PROGRESS.<br />
                EXPOSE THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">DEFICIT</span>.
              </h1>
              <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                Take control of your body composition. Calculate scientific energy thresholds, scan food logs instantly, plan high-intensity split training, and synchronize weight targets. 
              </p>
            </div>

            {/* Live Sign-up Instructions always visible on Left or as alert */}
            <div className="bg-[#121216] border border-neutral-800 rounded-lg p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-yellow-400 font-mono text-xs uppercase tracking-wider font-bold">
                <Info className="h-4 w-4 shrink-0" />
                How to Register & Get Started
              </div>
              <ol className="space-y-3 text-xs text-neutral-300 font-sans list-decimal list-inside pl-1">
                <li>
                  <strong className="text-white">Choose Your Action:</strong> Switch the form to <span className="text-yellow-400 font-semibold uppercase">"Create Account"</span> if you are new.
                </li>
                <li>
                  <strong className="text-white">Provide Email & Pass:</strong> Enter a valid email format and a secure password (minimum 6 characters).
                </li>
                <li>
                  <strong className="text-white">Run setup sequence:</strong> You will immediately be routed to build your personal body metrics (Age, Height, Weights, Dietary styles).
                </li>
                <li>
                  <strong className="text-white">Real-Time Sync:</strong> Standard mock data is forbidden. Everything you log persists live to your private profile dashboard!
                </li>
              </ol>
            </div>
          </div>

          {/* Form & Card (Right) */}
          <div className="bg-[#121215] border border-neutral-800 rounded-sm p-6 md:p-8 relative shadow-2xl overflow-hidden">
            {/* Top Yellow Bar */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-yellow-400" />
            
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wider font-mono text-white">
                {isLogin ? "USER LOGIN" : "CREATE DISCIPLINE PROFILE"}
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                {isLogin ? "Access your personal metabolic control center" : "Begin your live fitness profile formulation"}
              </p>
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-800 rounded-sm p-3 mb-5 flex items-start gap-2.5 text-xs text-red-200">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-semibold text-neutral-400 mb-1.5">
                  User Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-400 text-sm py-2.5 pl-10 pr-4 outline-none rounded-sm font-sans transition text-white"
                    required
                    id="input-auth-email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono tracking-wider font-semibold text-neutral-400 mb-1.5">
                  Secure Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-400 text-sm py-2.5 pl-10 pr-12 outline-none rounded-sm font-sans transition text-white"
                    required
                    id="input-auth-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 p-1 text-neutral-500 hover:text-neutral-300 transition"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-black py-3 px-5 text-sm font-bold font-mono uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-2 mt-6 shrink-0 shadow-lg cursor-pointer"
                id="btn-auth-submit"
              >
                {loading ? (
                  <span className="inline-block animate-spin border-2 border-current border-t-transparent h-4 w-4 rounded-full" />
                ) : isLogin ? (
                  <>
                    <LogIn className="h-4 w-4 stroke-[2.5]" />
                    ESTABLISH ACCESS
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 stroke-[2.5]" />
                    REGISTER METRICS
                  </>
                )}
              </button>
            </form>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-neutral-900"></div>
              <span className="flex-shrink mx-4 text-[10px] font-mono tracking-wider text-neutral-500 uppercase">OR</span>
              <div className="flex-grow border-t border-neutral-900"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 hover:border-neutral-700 text-white py-3 px-5 text-sm font-bold font-mono uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-2.5 cursor-pointer shadow-md disabled:opacity-50"
              id="btn-google-signin"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>CONTINUE WITH GOOGLE</span>
            </button>

            {/* Toggle Link */}
            <div className="mt-6 text-center border-t border-neutral-900 pt-5">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setShowPassword(false);
                }}
                className="text-xs text-neutral-400 hover:text-yellow-400 transition underline decoration-neutral-800 font-mono uppercase tracking-wider cursor-pointer"
                id="btn-auth-toggle"
              >
                {isLogin ? "Need a profile? Create Account" : "Registered? User Login Instead"}
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Instruction Drawer Modal (Overlay) */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#121215] border border-neutral-800 max-w-lg w-full p-6 rounded-sm shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
              <h3 className="font-mono text-sm uppercase tracking-wider font-extrabold text-yellow-400 flex items-center gap-1.5">
                <Dumbbell className="h-4 w-4" />
                FITDEFICIT ACCESS GUIDE
              </h3>
              <button 
                onClick={() => setShowInstructions(false)}
                className="text-xs text-neutral-500 hover:text-white uppercase font-mono"
              >
                [Close]
              </button>
            </div>
            
            <div className="space-y-3 text-xs leading-relaxed text-neutral-300 overflow-y-auto max-h-[70vh]">
              <p>
                FitDeficit utilizes standard live database syncing. To configure a workspace:
              </p>
              <div className="p-3 bg-neutral-900/50 border border-neutral-900 rounded space-y-2">
                <p className="font-bold text-white">⚙️ 1. CREATE ACCOUNT</p>
                <p>Toggle prompt to "Create Account", provide name format and securely input password. Press register.</p>
              </div>
              <div className="p-3 bg-neutral-900/50 border border-neutral-900 rounded space-y-2">
                <p className="font-bold text-white">💪 2. METRIC FORMULATION</p>
                <p>Input your weight, target and age. Safe calorie deficits are calculated automatically matching active schedules.</p>
              </div>
              <div className="p-3 bg-neutral-900/50 border border-neutral-900 rounded space-y-2">
                <p className="font-bold text-white">📸 3. LOGGING MEALS & PHOTO RECON</p>
                <p>Track foods by either typing manually, scanning UPC codes (using Open Food Facts) or snapping pictures for Gemini nutrition estimates!</p>
              </div>
            </div>
            <button 
              onClick={() => setShowInstructions(false)}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs uppercase py-2 border border-neutral-800 transition tracking-wider"
            >
              UNDERSTOOD. LET'S TRAIN.
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center py-4 border-t border-neutral-950 font-mono text-[10px] tracking-widest text-neutral-600 uppercase">
        FITDEFICIT // SYSTEM LOG // CREATED BY BOJ
      </footer>

    </div>
  );
}
