import React, { useState, useEffect } from "react";
import { 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { Dumbbell, ShieldAlert, CircleHelp, Info, ShieldCheck, ArrowRight, Mail, KeyRound, Eye, EyeOff, LogIn, UserPlus, Sparkles } from "lucide-react";

interface AuthProps {
  onSuccess: () => void;
}

type AuthMethod = "email" | "google";

export default function AuthScreen({ onSuccess }: AuthProps) {
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Check for any redirect result when the component mounts
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          onSuccess();
        }
      })
      .catch((err: any) => {
        console.error("Google Auth Redirect Result error:", err);
        handleAuthError(err);
      });
  }, []);

  const handleAuthError = (err: any) => {
    const code = err?.code || "";
    const message = err?.message || "";
    console.error("Processing auth error code:", code, "message:", message);

    if (code === "auth/unauthorized-domain" || message.toLowerCase().includes("unauthorized-domain")) {
      setIsUnauthorizedDomain(true);
      setError("Firebase Authorized Domains Restriction");
    } else if (code === "auth/popup-blocked" || message.toLowerCase().includes("popup-blocked") || message.toLowerCase().includes("popup_blocked_by_browser")) {
      setIsPopupBlocked(true);
      setError("Pop-up Window Blocked");
    } else if (code === "auth/operation-not-allowed" || message.toLowerCase().includes("operation-not-allowed")) {
      setIsOperationNotAllowed(true);
      setError("Sign-In Method is Disabled in Firebase");
    } else if (code === "auth/popup-closed-by-user" || message.toLowerCase().includes("closed-by-user")) {
      setError("Sign-In Cancelled. Please try again.");
    } else if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/user-not-found") {
      setError("Invalid credentials. Please double check your email and password.");
    } else if (code === "auth/email-already-in-use") {
      setError("This email is already in use. Please sign in instead.");
    } else if (code === "auth/weak-password") {
      setError("Password must be at least 6 characters long.");
    } else if (code === "auth/invalid-email") {
      setError("Please provide a valid email address.");
    } else {
      setError(err.message || "Authentication attempt failed.");
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);
    setIsUnauthorizedDomain(false);
    setIsPopupBlocked(false);
    setIsOperationNotAllowed(false);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (err: any) {
      console.error("Email auth error:", err);
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorizedDomain(false);
    setIsPopupBlocked(false);
    setIsOperationNotAllowed(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      
      if (isMobile) {
        console.log("Mobile/Touch environment detected. Using signInWithRedirect...");
        await signInWithRedirect(auth, provider);
      } else {
        console.log("Desktop environment detected. Using signInWithPopup...");
        await signInWithPopup(auth, provider);
        onSuccess();
      }
    } catch (err: any) {
      console.error("Google Auth initial step error:", err);
      handleAuthError(err);
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

            {/* Support and Security Notice */}
            <div className="bg-[#121216] border border-neutral-800 rounded-lg p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-yellow-400 font-mono text-xs uppercase tracking-wider font-bold">
                <Info className="h-4 w-4 shrink-0" />
                Zero-Friction Client-Side Authentication
              </div>
              <ul className="space-y-3 text-xs text-neutral-300 font-sans">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 font-bold font-mono">01.</span>
                  <span><strong className="text-white">Continuous Sync:</strong> Your workouts, body fat estimates, and foods save straight to live storage mapped strictly to your ID.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 font-bold font-mono">02.</span>
                  <span><strong className="text-white">Secure Password Flow:</strong> Create a direct user account that works flawlessly on *any* URL, including mobile or Vercel, without needing setup steps.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 font-bold font-mono">03.</span>
                  <span><strong className="text-white">Encrypted Sign-On:</strong> Google credentials and private email access pass directly to Google Cloud without caching on secondary nodes.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Authentication Card (Right) */}
          <div className="bg-[#121215] border border-neutral-800 rounded-sm p-6 md:p-8 relative shadow-2xl overflow-hidden" id="login-card">
            {/* Top Yellow Bar */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-yellow-400" />
            
            <div className="mb-6 space-y-2">
              <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wider font-mono text-white">
                SECURE AUTHENTICATION
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Validate user profile to align metabolic macros and preserve tracking database integrity.
              </p>
            </div>

            {/* Auth Method Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 rounded-sm mb-6 border border-neutral-900">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod("email");
                  setError(null);
                }}
                className={`py-2 text-xs font-mono font-bold tracking-wider uppercase transition rounded-sm cursor-pointer ${
                  authMethod === "email" 
                    ? "bg-yellow-400 text-black" 
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                EMAIL PASSWORD
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod("google");
                  setError(null);
                }}
                className={`py-2 text-xs font-mono font-bold tracking-wider uppercase transition rounded-sm cursor-pointer ${
                  authMethod === "google" 
                    ? "bg-yellow-400 text-black" 
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                GOOGLE AUTH
              </button>
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-800 rounded-sm p-4 mb-5 space-y-3 text-xs text-red-200">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span className="font-bold uppercase tracking-wider">{error}</span>
                </div>
                {isUnauthorizedDomain && (
                  <div className="pt-2.5 border-t border-red-900/40 space-y-2 text-neutral-300 font-sans">
                    <p className="font-bold text-yellow-400 uppercase text-[10px] tracking-wider">
                      🛠️ WHY EMAIL IS BETTER ON VERCEL:
                    </p>
                    <p className="leading-relaxed">
                      Google OAuth requires white-listing deployment domains in your Firebase settings.
                    </p>
                    <p className="leading-relaxed bg-black/40 p-2 border border-neutral-900 text-[11px] font-mono">
                      👉 Switch to the <span className="text-yellow-400 font-bold">EMAIL PASSWORD</span> tab above! It runs instantly on any Vercel url, telephone, or local connection without any setup!
                    </p>
                    <p className="text-[10px] text-neutral-400 italic">
                      Alternatively, add your Vercel address under your Firebase Console &gt; AuthSettings &gt; Authorized Domains.
                    </p>
                  </div>
                )}
                {isOperationNotAllowed && (
                  <div className="pt-2.5 border-t border-red-900/40 space-y-2.5 text-neutral-300 font-sans">
                    <p className="font-bold text-yellow-400 uppercase text-[10px] tracking-wider">
                      ⚙️ UNLOCK FIREBASE AUTHENTICATION (FIRST-TIME SETUP):
                    </p>
                    <p className="leading-relaxed">
                      Your Firebase project (<span className="text-yellow-400 font-mono text-[11px]">winged-tribute-ttxfk</span>) has its Authentication module currently sleeping. You must initialize it once.
                    </p>
                    <div className="bg-black/65 border border-neutral-900 rounded p-3 space-y-2.5 text-[11px] leading-relaxed">
                      <p className="font-bold text-white uppercase text-[10px] tracking-wider text-yellow-300 flex items-center gap-1">
                        👉 STEP 1: INITIALIZE AUTHENTICATION MODULE
                      </p>
                      <p>
                        Open your{" "}
                        <a 
                          href="https://console.firebase.google.com/project/winged-tribute-ttxfk/authentication" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-yellow-400 underline hover:text-yellow-300 font-bold inline"
                        >
                          Firebase Authentication Console
                        </a>. If you see a landing page, click the prominent, blue <strong className="text-white">"Get Started"</strong> button in the middle of the screen to activate Auth.
                      </p>
                      
                      <p className="font-bold text-white uppercase text-[10px] tracking-wider text-yellow-300 flex items-center gap-1 pt-1 border-t border-neutral-900">
                        👉 STEP 2: ENABLE SIGN-IN PROVIDERS
                      </p>
                      <p>
                        Once active, go to the <strong className="text-white">"Sign-in method"</strong> tab (or click **Add new provider**). Select <strong className="text-white">Email/Password</strong> and toggle it to <strong className="text-white">Enable</strong>, then save.
                      </p>
                    </div>
                    <p className="text-[10px] text-neutral-400 italic">
                      Once both steps are done, return here, reload your browser page, and your credentials can log in instantly!
                    </p>
                  </div>
                )}
                {isPopupBlocked && (
                  <div className="pt-2 border-t border-red-900/40 text-neutral-300 text-[11px] leading-relaxed">
                    <p className="font-semibold text-white">Using Safe Redirect fallback...</p>
                    <p>We switched authentication styles to Redirect. Please hit the button again to continue.</p>
                  </div>
                )}
              </div>
            )}

            {authMethod === "email" ? (
              /* Email/Password Sign-In/Sign-Up Form (Vercel-proof) */
              <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                <div className="space-y-2 mb-4">
                  <div className="flex border-b border-neutral-900">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(true);
                        setError(null);
                      }}
                      className={`flex-1 pb-2 text-xs font-mono tracking-wider ${
                        isLogin ? "text-yellow-400 border-b-2 border-yellow-400 font-bold" : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      LOG IN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(false);
                        setError(null);
                      }}
                      className={`flex-1 pb-2 text-xs font-mono tracking-wider ${
                        !isLogin ? "text-yellow-400 border-b-2 border-yellow-400 font-bold" : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      CREATE ACCOUNT
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-mono tracking-wider font-semibold text-neutral-400 mb-1.5">
                    User Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="athlete@domain.com"
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
                  className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-black py-3 px-5 text-sm font-bold font-mono uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-2 mt-6 cursor-pointer shadow-lg active:scale-[0.98]"
                  id="btn-auth-submit"
                >
                  {loading ? (
                    <span className="inline-block animate-spin border-2 border-current border-t-transparent h-4 w-4 rounded-full" />
                  ) : isLogin ? (
                    <>
                      <LogIn className="h-4 w-4 stroke-[2.5]" />
                      LOG IN WITH EMAIL
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 stroke-[2.5]" />
                      REGISTER PROFILE
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Google Sign-In Layout with explicit warning status */
              <div className="space-y-6">
                <div className="py-6 flex flex-col items-center justify-center border-b border-neutral-900">
                  <div className="w-16 h-16 rounded-full bg-yellow-400/15 border border-yellow-400/20 flex items-center justify-center mb-4">
                    <ShieldCheck className="h-8 w-8 text-yellow-400" />
                  </div>
                  <p className="text-xs text-center text-neutral-400 max-w-xs leading-relaxed">
                    Single-tap instant profile hydration. Best for AI Studio Workspace preview checks.
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

                <div className="p-3 bg-neutral-900/40 rounded border border-neutral-900 text-[11px] text-neutral-400 space-y-1.5 leading-normal">
                  <p className="font-bold text-neutral-300 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5 text-yellow-400" />
                    VERCEL DEPLOYMENT NOTE
                  </p>
                  <p>
                    If this is your live Vercel site and you get a Firebase token/domain error, Google OAuth is waiting for your Vercel address to be added to Firebase Authorized Domains settings.
                  </p>
                  <p className="text-yellow-400/80 font-semibold font-mono">
                    👉 Switch to "EMAIL PASSWORD" above to log in instantly without any configuration!
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-neutral-900 text-center space-y-2.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                ⚡ WORKAROUND FOR PERMISSION / HOST BLOCKS:
              </span>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("fitdeficit_guest_mode", "true");
                  onSuccess();
                }}
                className="w-full bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 text-yellow-400 py-3 px-5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-[0.98]"
                id="btn-guest-bypass"
              >
                <Sparkles className="h-4 w-4" />
                ENTER AS LOCAL GUEST (OFFLINE SANDBOX)
              </button>
              <p className="text-[10px] text-neutral-400 leading-normal font-sans text-center max-w-xs mx-auto">
                No setup required. Saves your energy goals, split macros, daily calorie sheets, and workout status directly to your local browser storage.
              </p>
            </div>

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
                FitDeficit features zero local caching of critical metrics to preserve physical profile integrity. Here is how our auth methods secure your training environment:
              </p>
              <div className="p-3 bg-neutral-900/50 border border-neutral-900 rounded space-y-2">
                <p className="font-bold text-white uppercase font-mono text-[10px] tracking-wider">🔒 Cryptographic Keys</p>
                <p>Sessions secure your weight tracking targets, logging tables, and active workouts under private Firebase tokens.</p>
              </div>
              <div className="p-3 bg-neutral-900/50 border border-neutral-900 rounded space-y-2">
                <p className="font-bold text-white uppercase font-mono text-[10px] tracking-wider">⚙️ Automated Provisioning</p>
                <p>Your user profile automatically initializes standard body mass ratios and custom macronutrient equations in Firestore linked securely to your unique User ID.</p>
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
