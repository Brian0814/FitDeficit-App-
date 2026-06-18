import React, { useState } from "react";
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { 
  Dumbbell, 
  Eye, 
  EyeOff, 
  LogIn, 
  Mail, 
  KeyRound, 
  Sparkles, 
  UserPlus, 
  AlertCircle, 
  ShieldCheck, 
  Laptop
} from "lucide-react";

interface AuthProps {
  onSuccess: () => void;
}

export default function AuthScreen({ onSuccess }: AuthProps) {
  // Option controls
  const [isLoginGroup, setIsLoginGroup] = useState(true);
  
  // Credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ code: string; message: string } | null>(null);

  // Email/Password authentication flow
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorDetails({ 
        code: "client/missing-fields", 
        message: "Please specify both your email address and secure password." 
      });
      return;
    }
    if (password.length < 6) {
      setErrorDetails({ 
        code: "client/weak-password", 
        message: "Safety regulation: Passwords must contain at least 6 characters." 
      });
      return;
    }

    setLoading(true);
    setErrorDetails(null);

    try {
      if (isLoginGroup) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (err: any) {
      console.error("Firebase Auth Exception:", err);
      setErrorDetails({
        code: err?.code || "server/unknown",
        message: err?.message || "An unexpected error occurred during email verification."
      });
    } finally {
      setLoading(false);
    }
  };

  // Google authentication flow (signInWithPopup)
  const handleGoogleSignInFlow = async () => {
    setLoading(true);
    setErrorDetails(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
      onSuccess();
    } catch (err: any) {
      console.error("Firebase Google Exception:", err);
      setErrorDetails({
        code: err?.code || "server/unknown",
        message: err?.message || "An unexpected error occurred launching Google Popup protocol."
      });
    } finally {
      setLoading(false);
    }
  };

  // Instant local sandbox bypass
  const handleEnterAsGuest = () => {
    localStorage.setItem("fitdeficit_guest_mode", "true");
    onSuccess();
  };

  // Error inspection flags
  const errCode = errorDetails?.code || "";
  const errMsg = errorDetails?.message || "";

  const isOperationNotAllowed = errCode === "auth/operation-not-allowed" || errMsg.includes("operation-not-allowed");
  const isUnauthorizedDomain = errCode === "auth/unauthorized-domain" || errMsg.includes("unauthorized-domain");
  const isEmailAlreadyInUse = errCode === "auth/email-already-in-use" || errMsg.includes("email-already-in-use");

  return (
    <div className="min-h-screen bg-[#070708] text-white flex flex-col justify-between p-4 md:p-6 font-sans selection:bg-yellow-400 selection:text-black">
      
      {/* Top spacing */}
      <div className="hidden lg:block h-6"></div>

      {/* Main Grid Viewport */}
      <main className="flex-grow flex items-center justify-center py-6 md:py-10 animate-fadeIn">
        <div className="max-w-4xl w-full space-y-8">
          
          {/* Brand Header */}
          <div className="text-center space-y-2.5">
            <div className="inline-flex bg-yellow-400 p-3 rounded-sm text-black shadow-lg shadow-yellow-400/5 shadow-inner">
              <Dumbbell className="h-7 w-7 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-mono tracking-widest font-extrabold text-white uppercase">
                FIT<span className="text-yellow-400">DEFICIT</span>
              </h1>
              <p className="text-[10px] md:text-xs uppercase tracking-widest text-neutral-500 font-mono font-black">
                High-Performance Athletic Metrics & Schedule Engine
              </p>
            </div>
          </div>

          {/* Unified Action Panel Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* Pathway A: Instant Local Sandbox (Bypasses all connectivity risks immediately) */}
            <div className="bg-[#111113] border border-neutral-900 rounded-sm p-6 md:p-8 flex flex-col justify-between relative shadow-xl overflow-hidden transition hover:border-neutral-850">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-neutral-800" />
              
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="bg-neutral-850 p-1.5 rounded text-neutral-400">
                    <Laptop className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] font-mono font-black tracking-widest uppercase text-neutral-400">
                    PATHWAY A: OFFLINE PRIVACY (FASTEST)
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-mono font-black uppercase text-white tracking-wide">
                    Instant Guest Sandbox
                  </h2>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Skip internet authorizations and jump straight into athletic logs. Calorie calculators, macro splits, weight tracking, and calendar schedules will save instantly onto your device's private browser cache.
                  </p>
                </div>

                {/* Features Checklist */}
                <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-sm space-y-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono tracking-wide font-black uppercase text-green-400 block">
                        Is Sandbox Secure?
                      </span>
                      <p className="text-[10px] text-neutral-500 font-mono uppercase leading-relaxed font-bold">
                        100% Isolated. Saves completely inside standard LOCALSTORAGE database. No servers tracking you and zero personal registration tags required. Perfect for instant mobile testing!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-900/60">
                <button
                  type="button"
                  onClick={handleEnterAsGuest}
                  className="w-full bg-neutral-900 hover:bg-neutral-850 hover:text-white border border-neutral-800 hover:border-neutral-700 text-neutral-300 py-3.5 px-5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-2 cursor-pointer select-none active:scale-[0.98]"
                  id="btn-guest-instant-access"
                >
                  <Sparkles className="h-4 w-4 text-yellow-400/90" />
                  ENTER LOCAL SANDBOX
                </button>
                <div className="text-center mt-3">
                  <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest font-black">
                    ⚡ No credentials needed • Offline ready
                  </span>
                </div>
              </div>
            </div>

            {/* Pathway B: Production Cloud Synchronization (Unified Login + Signup + Google UI) */}
            <div className="bg-[#111113] border border-neutral-900 rounded-sm p-6 md:p-8 flex flex-col justify-between relative shadow-xl overflow-hidden transition border-t-yellow-400">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-yellow-400" />

              <div className="space-y-4">
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-black tracking-widest uppercase text-yellow-400">
                    PATHWAY B: CLOUD HOSTING
                  </span>
                  <span className="bg-neutral-950 px-2 py-0.5 rounded text-[9px] font-mono text-neutral-450 border border-neutral-900 uppercase">
                    {isLoginGroup ? "SIGN IN" : "REGISTER"}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-mono font-black uppercase text-white tracking-wide">
                    {isLoginGroup ? "Access Cloud Profile" : "Register Cloud Profile"}
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Synchronize your metabolic goals, meal databases, and historical progress safely across your desktop and mobile devices.
                  </p>
                </div>

                {/* CONTEXT-AWARE DETAILED DISCOVERY / DEPLOYMENT GUIDE */}
                {errorDetails && (
                  <div className="space-y-3.5">
                    
                    {/* CASE 1: UN-AUTHORIZED DOMAIN FAULT (e.g., custom Vercel domain like sigma-three.vercel.app hits a starter-tier lock) */}
                    {isUnauthorizedDomain ? (
                      <div className="bg-yellow-400/10 border border-yellow-500/40 rounded-sm p-4 space-y-3 animate-fadeIn">
                        <div className="flex items-start gap-2 text-yellow-400">
                          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono font-black uppercase tracking-wider block">
                              PRODUCTION DOMAIN CONFLICT DETECTED
                            </span>
                            <span className="text-[9px] font-mono uppercase text-neutral-400 leading-relaxed font-bold block">
                              The domain <span className="text-white underline">{window.location.hostname}</span> is not registered inside the starter-tier Firebase project database.
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-sm space-y-2.5 font-mono text-[9px] uppercase font-bold text-neutral-305 leading-relaxed">
                          <p className="text-yellow-400 font-black border-b border-neutral-900 pb-1">
                            🛠️ RESOLUTION: HOW TO FIX THIS NOW FOR ALL PHONES & WEB USERS
                          </p>
                          <p className="text-neutral-450 font-normal normal-case">
                            The current Firebase project (<span className="text-white">winged-tribute-ttxfk</span>) is a restricted Starter-tier instance pre-allocated by the AI Studio workspace, meaning you don't own permission to whitelist domains (like <span className="text-white font-mono">{window.location.hostname}</span>).
                          </p>
                          <p className="text-yellow-400 font-black">
                            Step 1: Deploy your own FREE Firebase project:
                          </p>
                          <ol className="list-decimal list-inside space-y-1 pl-1 text-neutral-400">
                            <li>Create a project on <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">firebase.google.com</a></li>
                            <li>Enable the <span className="text-white">Google</span> AND/OR <span className="text-white">Email/Password</span> providers in your console.</li>
                            <li>Add <span className="text-yellow-400">{window.location.hostname}</span> into the "Authorized Domains" section.</li>
                          </ol>
                          <p className="text-yellow-400 font-black pt-1">
                            Step 2: Add these credentials to your Vercel Settings:
                          </p>
                          <div className="bg-neutral-900 p-2 border border-neutral-850 rounded font-normal font-sans text-emerald-400 text-[9.5px] select-all leading-normal">
                            VITE_FIREBASE_API_KEY="your_api_key"<br/>
                            VITE_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"<br/>
                            VITE_FIREBASE_PROJECT_ID="your_project_id"<br/>
                            VITE_FIREBASE_STORAGE_BUCKET="your_project.appspot.com"<br/>
                            VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"<br/>
                            VITE_FIREBASE_APP_ID="your_app_id"
                          </div>
                          <p className="text-[8.5px] font-mono text-neutral-500 normal-case leading-normal pt-1">
                            💡 Once these variables are added in your Vercel Dashboard, login will work instantly on your phone! While configuring this, click <strong>"ENTER LOCAL SANDBOX"</strong> on the left to test 100% of the tracker offline.
                          </p>
                        </div>
                      </div>
                    ) : isOperationNotAllowed ? (
                      
                      /* CASE 2: OPERATION NOT ALLOWED (Email/Password Provider disabled inside project) */
                      <div className="bg-yellow-400/15 border border-yellow-500/40 rounded-sm p-4 space-y-2.5 animate-fadeIn">
                        <div className="flex items-start gap-2 text-yellow-400">
                          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono font-black uppercase tracking-wider block">
                              AUTHENTICATION CONFIGURATION NEEDED
                            </span>
                            <span className="text-[9px] font-mono uppercase text-neutral-400 leading-relaxed font-bold block">
                              The Email/Password authentication provider is disabled inside the default project.
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-neutral-950 border border-neutral-900 rounded space-y-2 font-mono text-[9px] uppercase font-bold text-neutral-300">
                          <p className="text-yellow-400">Enable in your own Firebase project:</p>
                          <ol className="list-decimal list-inside space-y-1 text-neutral-400">
                            <li>Create your own free Firebase project on the Google Firebase Console.</li>
                            <li>Go to <span className="text-white">Authentication &rarr; Sign-in method &rarr; Add email provider</span>.</li>
                            <li>Set your custom variables on your Vercel dashboard!</li>
                          </ol>
                        </div>
                      </div>
                    ) : isEmailAlreadyInUse ? (
                      
                      /* CASE 3: EMAIL ALREADY REGISTERED */
                      <div className="bg-red-950/20 border border-red-900/50 rounded-sm p-3.5 space-y-1.5 animate-fadeIn">
                        <div className="flex items-start gap-2 text-red-400">
                          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                          <span className="text-[10px] font-mono font-black uppercase tracking-wider">REGISTRATION COLLISION</span>
                        </div>
                        <p className="text-[9.5px] text-neutral-300 font-mono uppercase pl-6 leading-relaxed font-bold">
                          The email address <span className="text-white">{email}</span> is already mapped to an active USER PROFILE.
                        </p>
                        <p className="text-[9px] text-neutral-500 font-mono uppercase pl-6 leading-normal">
                          💡 Quick patch: Toggle below to email Sign In and input your credentials to restore synchronization.
                        </p>
                      </div>
                    ) : (
                      
                      /* DEFAULT ERROR HANDLER */
                      <div className="bg-red-950/20 border border-red-900/50 rounded-sm p-3 space-y-0.5 animate-fadeIn">
                        <div className="text-red-400 font-mono text-[9px] uppercase font-black flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          AUTHENTICATION BREACH ({errCode})
                        </div>
                        <p className="text-[9px] text-neutral-400 font-mono uppercase pl-5 leading-relaxed">
                          {errMsg}
                        </p>
                      </div>
                    )}

                  </div>
                )}

              </div>

              {/* Dynamic Authentication Form - Both flows side-by-side / stacked seamlessly */}
              <div className="mt-6 space-y-5">
                
                {/* FLOW 1: AUTHENTICATE WITH GOOGLE (With official stylized dark/light button representation) */}
                <div>
                  <button
                    type="button"
                    onClick={handleGoogleSignInFlow}
                    disabled={loading}
                    className="w-full bg-white hover:bg-neutral-100 disabled:bg-neutral-900 disabled:text-neutral-600 text-black py-3.5 px-5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-2 cursor-pointer select-none active:scale-[0.98] shadow-md shadow-white/5"
                    id="btn-google-auth-trigger"
                  >
                    {loading ? (
                      <span className="inline-block animate-spin border-2 border-current border-t-transparent h-4.5 w-4.5 rounded-full" />
                    ) : (
                      <>
                        <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.253-3.133C18.41 1.945 15.6 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.56-4.43 10.56-10.74 0-.72-.08-1.27-.175-1.985H12.24z"/>
                        </svg>
                        CONTINUE WITH GOOGLE
                      </>
                    )}
                  </button>
                </div>

                {/* VISUAL SEPARATOR WITH LOGICAL "OR" */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-grow h-px bg-neutral-900" />
                  <span className="text-[9px] font-mono tracking-widest text-[#2c2c31] uppercase font-black">
                    OR EMAIL PROTOCOL
                  </span>
                  <div className="flex-grow h-px bg-neutral-900" />
                </div>

                {/* FLOW 2: STANDARD EMAIL & PASSWORD FORM */}
                <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                  
                  <div className="space-y-1">
                    <label className="block text-[8px] uppercase font-mono tracking-widest text-neutral-500 font-black">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-3.5 w-3.5 text-neutral-600" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@domain.com"
                        className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 text-xs py-3 pl-9 pr-4 outline-none rounded-sm font-mono transition text-white placeholder-neutral-700"
                        required
                        id="input-auth-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[8px] uppercase font-mono tracking-widest text-neutral-500 font-black">
                      Secure Database Password
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3.5 h-3.5 w-3.5 text-neutral-600" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 text-xs py-3 pl-9 pr-11 outline-none rounded-sm font-mono transition text-white placeholder-neutral-700"
                        required
                        id="input-auth-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 p-1 text-neutral-600 hover:text-neutral-400 transition cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-neutral-900 hover:bg-neutral-850 hover:text-white border border-neutral-800 hover:border-neutral-700 disabled:bg-neutral-950 disabled:text-neutral-750 disabled:border-neutral-900 text-white font-mono uppercase tracking-wider py-3.5 px-4 text-xs font-bold rounded-sm transition flex items-center justify-center gap-2 mt-4 cursor-pointer select-none active:scale-[0.98]"
                    id="btn-email-auth"
                  >
                    {loading ? (
                      <span className="inline-block animate-spin border-2 border-current border-t-transparent h-4 w-4 rounded-full" />
                    ) : isLoginGroup ? (
                      <>
                        <LogIn className="h-3.5 w-3.5" />
                        SIGN IN SECURELY
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        CREATE SECURE PROFILE
                      </>
                    )}
                  </button>
                </form>

                {/* MODE TOGGLER BELOW EMAIL OPTIONS */}
                <div className="text-center pt-2">
                  {isLoginGroup ? (
                    <p className="text-[10px] text-neutral-500 font-mono uppercase">
                      Don't have a customized profile?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLoginGroup(false);
                          setErrorDetails(null);
                        }}
                        className="text-yellow-400 hover:text-yellow-300 underline font-black font-mono cursor-pointer"
                        id="btn-toggle-to-register"
                      >
                        Create Account
                      </button>
                    </p>
                  ) : (
                    <p className="text-[10px] text-neutral-500 font-mono uppercase">
                      Already have an active profile?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLoginGroup(true);
                          setErrorDetails(null);
                        }}
                        className="text-yellow-400 hover:text-yellow-300 underline font-black font-mono cursor-pointer"
                        id="btn-toggle-to-signin"
                      >
                        Sign In Instead
                      </button>
                    </p>
                  )}
                </div>

              </div>

              {/* Secure cloud connection message */}
              <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest text-center mt-6 pt-3 border-t border-neutral-900/60 leading-normal flex items-center justify-center gap-1">
                <span>📶 CONNECTS SECURELY TO GOOGLE CLOUD INSTANCE</span>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Elegant, clean Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center py-4 font-mono text-[8px] tracking-widest text-[#2c2c31] uppercase flex flex-col md:flex-row justify-between items-center gap-2 border-t border-neutral-955 mt-6">
        <span>FITDEFICIT TERMINAL v2.8 // BY BOJ & DEEPMIND</span>
        <span className="text-yellow-400/30">CLIENT ENVIRONMENT: SANDBOX PRIVACY GUARANTEED</span>
      </footer>

    </div>
  );
}
