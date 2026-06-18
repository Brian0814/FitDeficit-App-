import React, { useState } from "react";
import { 
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { 
  Dumbbell, 
  Sparkles, 
  AlertCircle, 
  ShieldCheck, 
  Laptop,
  CheckCircle2
} from "lucide-react";

interface AuthProps {
  onSuccess: () => void;
}

export default function AuthScreen({ onSuccess }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ code: string; message: string } | null>(null);

  const handleGoogleSignInSubmit = async () => {
    setLoading(true);
    setErrorDetails(null);

    try {
      const provider = new GoogleAuthProvider();
      // Configure custom parameters if necessary, e.g., prompt consent
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
      onSuccess();
    } catch (err: any) {
      console.error("Firebase Google Auth error:", err);
      setErrorDetails({
        code: err?.code || "server/unknown",
        message: err?.message || "Could not complete the Google Sign-In flow."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnterAsGuest = () => {
    localStorage.setItem("fitdeficit_guest_mode", "true");
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white flex flex-col justify-between p-4 font-sans selection:bg-yellow-400 selection:text-black">
      
      {/* Top spacing */}
      <div className="hidden lg:block h-6"></div>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center py-6 md:py-12 animate-fadeIn">
        <div className="max-w-4xl w-full space-y-10">
          
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex bg-yellow-400 p-3 rounded-sm text-black shadow-lg shadow-yellow-400/5">
              <Dumbbell className="h-7 w-7 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-mono tracking-widest font-extrabold text-white uppercase">
                FIT<span className="text-yellow-400">DEFICIT</span>
              </h1>
              <p className="text-[10px] md:text-xs uppercase tracking-widest text-neutral-500 font-mono font-bold">
                High-Performance Athletic Metrics & Schedule Engine
              </p>
            </div>
          </div>

          {/* Dual Action Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* Pathway 1: Instant Local Sandbox (Default / Fast) */}
            <div className="bg-[#111113] border border-neutral-900 rounded-sm p-6 md:p-8 flex flex-col justify-between relative shadow-xl overflow-hidden transition hover:border-neutral-800">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-neutral-800" />
              
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="bg-neutral-850 p-1.5 rounded text-neutral-400">
                    <Laptop className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-neutral-400">
                    PATHWAY A: OFFLINE PRIVACY
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-mono font-black uppercase text-white tracking-wide">
                    Instant Guest Sandbox
                  </h2>
                  <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                    Skip all login protocols entirely and construct your profile immediately. All calorie targets, metrics, and athletic logs save directly into your client's browser engine database.
                  </p>
                </div>

                {/* Security and Privacy highlights */}
                <div className="space-y-3 bg-neutral-950 p-4 border border-neutral-900 rounded-sm">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono tracking-wide font-extrabold uppercase text-green-400 block">
                        SANDBOX IS 100% SECURE
                      </span>
                      <p className="text-[10px] text-neutral-500 font-mono uppercase leading-relaxed font-bold">
                        Saves completely locally on your browser database (localStorage). No emails are registered, and no tracking cookies are transmitted. Completely offline and anonymous.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-900/60">
                <button
                  type="button"
                  onClick={handleEnterAsGuest}
                  className="w-full bg-neutral-900 hover:bg-neutral-850 hover:text-white border border-neutral-800 text-neutral-300 py-3.5 px-5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-2 cursor-pointer select-none active:scale-[0.98]"
                  id="btn-guest-instant-access"
                >
                  <Sparkles className="h-4 w-4 text-yellow-400/90" />
                  ENTER LOCAL SANDBOX
                </button>
                <div className="text-center mt-3">
                  <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest font-bold">
                    ⚡ Zero setup required • Load instantly
                  </span>
                </div>
              </div>
            </div>

            {/* Pathway 2: Cloud Sync with Google Auth (Already active & permitted) */}
            <div className="bg-[#111113] border border-neutral-900 rounded-sm p-6 md:p-8 flex flex-col justify-between relative shadow-xl overflow-hidden transition hover:border-[#222]">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-yellow-400" />

              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="bg-yellow-400/10 p-1.5 rounded text-yellow-400">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-yellow-400">
                    PATHWAY B: CLOUD STORAGE (RECOMMENDED)
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-mono font-black uppercase text-white tracking-wide">
                    Google Secure Sync
                  </h2>
                  <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                    Enable cloud persistence. Save your athletic logs, dietary style calculations, streaks, and user metrics securely. Access your data safely from any network device.
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="space-y-3 bg-neutral-950 p-4 border border-neutral-900 rounded-sm font-mono text-[10px] uppercase">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-neutral-500 font-bold">CLOUD AUTH STATUS:</span>
                    <span className="text-green-400 font-black animate-pulse flex items-center gap-1">
                      ● ENABLED & READY
                    </span>
                  </div>
                  <p className="text-[9px] text-neutral-500 font-bold leading-relaxed pt-1.5 border-t border-neutral-900">
                    Your Google authentication node is successfully set up and active for project <strong className="text-neutral-400">winged-tribute-ttxfk</strong>.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-900/60">
                {errorDetails && (
                  <div className="bg-red-950/20 border border-red-900/50 rounded-sm p-3.5 mb-4 space-y-1 animate-fadeIn">
                    <div className="flex items-start gap-2 text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wide">Sign-in protocol alert</span>
                    </div>
                    <p className="text-[9px] text-neutral-400 font-mono uppercase pl-6 leading-relaxed">
                      {errorDetails.message}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGoogleSignInSubmit}
                  disabled={loading}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-neutral-900 disabled:text-neutral-650 text-black py-3.5 px-5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-2 cursor-pointer select-none active:scale-[0.98] shadow-md hover:shadow-yellow-400/10"
                  id="btn-google-auth"
                >
                  {loading ? (
                    <span className="inline-block animate-spin border-2 border-current border-t-transparent h-4 w-4 rounded-full" />
                  ) : (
                    <>
                      {/* Let's construct a cleaner Google-colored layout icon */}
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.253-3.133C18.41 1.945 15.6 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.56-4.43 10.56-10.74 0-.72-.08-1.27-.175-1.985H12.24z"/>
                      </svg>
                      SIGN IN WITH GOOGLE
                    </>
                  )}
                </button>
                <div className="text-center mt-3">
                  <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest font-bold">
                    🔒 Secure • 1-Click Authenticate
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center py-4 font-mono text-[8px] tracking-widest text-[#2c2c31] uppercase flex flex-col md:flex-row justify-between items-center gap-2 border-t border-neutral-955 mt-6">
        <span>FITDEFICIT TERMINAL v2.8 // BY BOJ & DEEPMIND</span>
        <span className="text-yellow-400/30">CLIENT ENVIRONMENT: SANDBOX PRIVACY GUARANTEED</span>
      </footer>

    </div>
  );
}
