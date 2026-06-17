import React, { useState } from "react";
import { 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { Dumbbell, ShieldAlert, CircleHelp, Info, ShieldCheck, ArrowRight } from "lucide-react";

interface AuthProps {
  onSuccess: () => void;
}

export default function AuthScreen({ onSuccess }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Configure to recommend selecting an account if multiple exist
      provider.setCustomParameters({
        prompt: "select_account"
      });
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
      <header className="max-w-7xl mx-auto w-full flex justify-between items-center py-4 border-b border-neutral-900" id="auth-header">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400 p-2 rounded-sm text-black inline-flex items-center justify-center">
            <Dumbbell className="h-6 w-6 stroke-[2.5]" id="logo-icon" />
          </div>
          <span className="font-mono text-xl tracking-wider font-extrabold text-white">
            FIT<span className="text-yellow-400">DEFICIT</span>
          </span>
        </div>
        <button 
          onClick={() => setShowInstructions(!showInstructions)} 
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-yellow-400 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-sm transition font-mono uppercase tracking-wider cursor-pointer"
          id="btn-instructions-toggle"
        >
          <CircleHelp className="h-4 w-4" />
          Security Info
        </button>
      </header>

      {/* Main Body */}
      <main className="flex-grow flex items-center justify-center my-8">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          {/* Informational Column (Left) */}
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs uppercase font-mono font-bold tracking-widest text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded inline-block">
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

            {/* Google-First Onboarding Flow explanation */}
            <div className="bg-[#121216] border border-neutral-800 rounded-lg p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-yellow-400 font-mono text-xs uppercase tracking-wider font-bold">
                <Info className="h-4 w-4 shrink-0" />
                Zero-Friction Authentication
              </div>
              <ul className="space-y-3 text-xs text-neutral-300 font-sans">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 font-bold font-mono">01.</span>
                  <span><strong className="text-white">One-Tap Auth:</strong> Skip password creation, verification emails, and database configuration issues. Log in instantly with your Google account.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 font-bold font-mono">02.</span>
                  <span><strong className="text-white">Secure Data:</strong> Your credentials are managed directly by Google Identity and secured via Firebase Authentication.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 font-bold font-mono">03.</span>
                  <span><strong className="text-white">Real-Time Sync:</strong> Formulates your private profile in Firestore instantly to log food, activity, and weight safely.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Sign-In Card (Right) */}
          <div className="bg-[#121215] border border-neutral-800 rounded-sm p-6 md:p-8 relative shadow-2xl overflow-hidden" id="login-card">
            {/* Top Yellow Bar */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-yellow-400" />
            
            <div className="mb-6 space-y-2">
              <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wider font-mono text-white">
                SECURE AUTHENTICATION
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                FitDeficit requires validation to coordinate calorie buffers and load private metrics securely.
              </p>
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-800 rounded-sm p-3 mb-5 flex items-start gap-2.5 text-xs text-red-200">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="py-6 flex flex-col items-center justify-center border-b border-neutral-900 mb-6">
              <div className="w-16 h-16 rounded-full bg-yellow-400/15 border border-yellow-400/20 flex items-center justify-center mb-4">
                <ShieldCheck className="h-8 w-8 text-yellow-400" />
              </div>
              <p className="text-xs text-center text-neutral-400 max-w-xs leading-relaxed">
                Continue below to initialize your metabolic metrics. All activity and weight records sync instantly to live storage.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-black py-3.5 px-5 text-sm font-black font-mono uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-2.5 cursor-pointer shadow-lg active:scale-[0.98]"
              id="btn-google-signin"
            >
              {loading ? (
                <span className="inline-block animate-spin border-2 border-current border-t-transparent h-4 w-4 rounded-full" />
              ) : (
                <>
                  <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="currentColor"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="currentColor"/>
                  </svg>
                  <span>CONTINUE WITH GOOGLE</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </>
              )}
            </button>

            <p className="text-[10px] font-mono tracking-wider text-center text-neutral-500 uppercase mt-6">
              SECURED BY GOOGLE IDENTITY & FIREBASE
            </p>
          </div>

        </div>
      </main>

      {/* Instruction Drawer Modal (Overlay) */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-security">
          <div className="bg-[#121215] border border-neutral-800 max-w-lg w-full p-6 rounded-sm shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
              <h3 className="font-mono text-sm uppercase tracking-wider font-extrabold text-yellow-400 flex items-center gap-1.5">
                <Dumbbell className="h-4 w-4" />
                FITDEFICIT SECURITY OVERVIEW
              </h3>
              <button 
                onClick={() => setShowInstructions(false)}
                className="text-xs text-neutral-500 hover:text-white uppercase font-mono cursor-pointer"
              >
                [Close]
              </button>
            </div>
            
            <div className="space-y-4 text-xs leading-relaxed text-neutral-300 overflow-y-auto max-h-[70vh]">
              <p>
                FitDeficit features zero local caching of critical metrics to preserve physical profile integrity. Here is how Google Sign-In secures your training environment:
              </p>
              <div className="p-3 bg-neutral-900/50 border border-neutral-900 rounded space-y-2">
                <p className="font-bold text-white uppercase font-mono text-[10px] tracking-wider">🔒 Cryptographic Keys</p>
                <p>Google Identity authenticates session keys natively so nobody else can read your weight deficit trends or nutrition targets.</p>
              </div>
              <div className="p-3 bg-neutral-900/50 border border-neutral-900 rounded space-y-2">
                <p className="font-bold text-white uppercase font-mono text-[10px] tracking-wider">⚙️ Automated Provisioning</p>
                <p>Your user workspace and calorie profiles map cleanly to a secure subcollection linked explicitly to your specific Firebase User ID.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowInstructions(false)}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs uppercase py-2.5 border border-neutral-800 transition tracking-wider cursor-pointer"
            >
              PROCEED TO SIGN IN
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
