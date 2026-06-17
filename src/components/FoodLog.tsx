import React, { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { FoodLogItem, UserProfile } from "../types";
import { 
  Plus, Trash2, Camera, ScanBarcode, ArrowRight, Loader2, Sparkles, 
  Apple, Flame, Cookie, Milk, Sandwich, Clock, Calendar, Check, AlertTriangle,
  X, Video
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface FoodLogProps {
  userId: string;
  profile: UserProfile;
  calorieTarget: number;
  proteinTarget: number;
}

export default function FoodLog({ userId, profile, calorieTarget, proteinTarget }: FoodLogProps) {
  const [foodLogs, setFoodLogs] = useState<FoodLogItem[]>([]);
  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  // Manual & pre-fill Form State
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("breakfast");
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState<string>("");
  const [protein, setProtein] = useState<string>("");
  const [carbs, setCarbs] = useState<string>("");
  const [fat, setFat] = useState<string>("");
  const [servingSize, setServingSize] = useState("");
  const [timeLogged, setTimeLogged] = useState("");

  // Scanner State
  const [barcode, setBarcode] = useState("");
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Gemini Photo State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showPhotoNotice, setShowPhotoNotice] = useState(false);

  // Live barcode scanner camera state
  const [showBarcodeCamera, setShowBarcodeCamera] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Live meal intake photo camera state
  const [showMealCamera, setShowMealCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Clean elements on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(err => console.log("Unmount stop scanner non-fatal:", err));
          }
        } catch (e) {
          console.log("Unmount scanner cleanup non-fatal:", e);
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startBarcodeScanner = async () => {
    setBarcodeError(null);
    setShowBarcodeCamera(true);
    
    setTimeout(async () => {
      try {
        if (html5QrCodeRef.current) {
          try { if (html5QrCodeRef.current.isScanning) await html5QrCodeRef.current.stop(); } catch (e) {}
          html5QrCodeRef.current = null;
        }

        const scanner = new Html5Qrcode("barcode-scanner-viewport");
        html5QrCodeRef.current = scanner;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 180 }
        };

        await scanner.start(
          { facingMode: "environment" },
          config,
          async (decodedText) => {
            setBarcode(decodedText);
            try {
              await scanner.stop();
            } catch (err) {
              console.log("Stop scanner failure:", err);
            }
            setShowBarcodeCamera(false);
            handleBarcodeLookup(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        console.error("Barcode camera startup failure:", err);
        setBarcodeError("Could not access environment camera for barcode decoding.");
        setShowBarcodeCamera(false);
      }
    }, 120);
  };

  const stopBarcodeScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.log("Stop barcode camera error:", err);
      }
    }
    setShowBarcodeCamera(false);
  };

  const startMealCamera = async () => {
    setCameraError(null);
    setShowMealCamera(true);
    setPhotoError(null);

    setTimeout(async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Meal camera access error:", err);
        setCameraError("Camera device access was blocked or is unavailable.");
        setShowMealCamera(false);
      }
    }, 120);
  };

  const stopMealCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowMealCamera(false);
  };

  const captureMealSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Str = canvas.toDataURL("image/jpeg");
        setPhotoPreview(base64Str);
        stopMealCamera();
        runFoodAnalysis(base64Str, "image/jpeg");
      }
    } catch (err) {
      console.error("Failed to capture meal photo:", err);
      setPhotoError("Could not render camera snapshot.");
    }
  };

  // Quick preset test barcodes to help developers testing in 1 click!
  const barcodePresets = [
    { label: "RXBAR Blueberry Bar", code: "857777005193" },
    { label: "Peanut Butter", code: "051500022793" },
    { label: "Innocent Smoothie", code: "5022496105370" }
  ];

  useEffect(() => {
    fetchFoodLogs();
    // Default logged time to current HH:MM
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setTimeLogged(`${hh}:${mm}`);
  }, [userId, dateStr]);

  const fetchFoodLogs = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "foodLogs"),
        where("userId", "==", userId),
        where("date", "==", dateStr)
      );
      const snapshot = await getDocs(q);
      const data: FoodLogItem[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as FoodLogItem);
      });
      data.sort((a, b) => a.timestamp - b.timestamp);
      setFoodLogs(data);
    } catch (err) {
      console.error("Error fetching food record:", err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Log manual entry
  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName) return;

    const calVal = Math.round(parseFloat(calories) || 0);
    const protVal = Math.round(parseFloat(protein) || 0);
    const carbVal = Math.round(parseFloat(carbs) || 0);
    const fatVal = Math.round(parseFloat(fat) || 0);

    const logEntry: Omit<FoodLogItem, "id"> = {
      userId,
      mealType,
      name: foodName,
      calories: calVal,
      protein: protVal,
      carbs: carbVal,
      fat: fatVal,
      servingSize: servingSize || "1 portion",
      timeLogged: timeLogged || "12:00",
      date: dateStr,
      timestamp: new Date(dateStr + "T" + (timeLogged || "12:00") + ":00").getTime()
    };

    try {
      await addDoc(collection(db, "foodLogs"), logEntry);
      
      // Reset targets
      setFoodName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setServingSize("");
      setPhotoFile(null);
      setPhotoPreview(null);
      setBarcode("");
      
      // Re-fetch
      await fetchFoodLogs();
    } catch (err) {
      console.error("Failed to add food log:", err);
    }
  };

  // 2. Barcode lookups
  const handleBarcodeLookup = async (codeToQuery?: string) => {
    const activeBarcode = codeToQuery || barcode;
    if (!activeBarcode) return;

    setScanningBarcode(true);
    setBarcodeError(null);

    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${activeBarcode}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const prod = data.product;
        setFoodName(prod.product_name || "Discovered Barcode Item");
        
        // OFF nutrition variables extract
        const nutriments = prod.nutriments || {};
        const cal = Math.round(Number(nutriments["energy-kcal_serving"] || nutriments["energy-kcal_100g"] || nutriments["energy-kcal"] || 0));
        const prot = Math.round(Number(nutriments.proteins_serving || nutriments.proteins_100g || nutriments.proteins || 0));
        const crb = Math.round(Number(nutriments.carbohydrates_serving || nutriments.carbohydrates_100g || nutriments.carbohydrates || 0));
        const ft = Math.round(Number(nutriments.fat_serving || nutriments.fat_100g || nutriments.fat || 0));
        const size = prod.serving_size || "1 item";

        setCalories(cal > 0 ? cal.toString() : "");
        setProtein(prot > 0 ? prot.toString() : "0");
        setCarbs(crb > 0 ? crb.toString() : "0");
        setFat(ft > 0 ? ft.toString() : "0");
        setServingSize(size);
        
        if (!codeToQuery) {
          setBarcode("");
        }
      } else {
        setBarcodeError("Barcode not discovered on Open Food Facts. Please enter manually.");
      }
    } catch (err) {
      console.error("Barcode query fail:", err);
      setBarcodeError("Network query failed. Enter calories manually below.");
    } finally {
      setScanningBarcode(false);
    }
  };

  // 3. Gemini Picture nutrition estimate
  const handlePhotoUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    setPhotoError(null);

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    // Read file base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Str = reader.result as string;
      await runFoodAnalysis(base64Str, file.type);
    };
    reader.readAsDataURL(file);
  };

  const runFoodAnalysis = async (base64Raw: string, mimeType: string) => {
    setAnalyzingPhoto(true);
    setPhotoError(null);
    setShowPhotoNotice(false);

    try {
      const res = await fetch("/api/food-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Raw, mimeType })
      });

      const data = await res.json();
      if (data.success && data.estimation) {
        const est = data.estimation;
        setFoodName(est.name || "Estimated Meal from Photo");
        setCalories((est.calories || "").toString());
        setProtein((est.protein || "0").toString());
        setCarbs((est.carbs || "0").toString());
        setFat((est.fat || "0").toString());
        setServingSize(est.servingSize || "1 portion");
        
        // Show disclosure notice
        setShowPhotoNotice(true);
      } else {
        setPhotoError(data.error || "Gemini could not categorize elements in this photo.");
      }
    } catch (err: any) {
      console.error("Photo process error:", err);
      setPhotoError("Could not connect to analysis backend server.");
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  // Log deletes
  const handleDeleteFood = async (id: string) => {
    try {
      await deleteDoc(doc(db, "foodLogs", id));
      setFoodLogs(foodLogs.filter((log) => log.id !== id));
    } catch (err) {
      console.error("Failed to delete food record:", err);
    }
  };

  // Calculations for totals
  const totalCalories = foodLogs.reduce((acc, current) => acc + current.calories, 0);
  const totalProtein = foodLogs.reduce((acc, current) => acc + current.protein, 0);
  const totalCarbs = foodLogs.reduce((acc, current) => acc + current.carbs, 0);
  const totalFat = foodLogs.reduce((acc, current) => acc + current.fat, 0);

  const remainingCalories = calorieTarget - totalCalories;
  const isDeficitCrossed = remainingCalories < 0;

  return (
    <div className="space-y-6">
      
      {/* Target status wheel dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Calorie Progress */}
        <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-3 top-3 text-neutral-800 pointer-events-none opacity-20">
            <Flame className="h-10 w-10 text-yellow-400" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-mono text-neutral-500 tracking-wider block">
              Budget Target
            </span>
            <span className="text-3xl font-mono font-extrabold text-white mt-1 block">
              {calorieTarget} <span className="text-xs font-normal text-neutral-400">kcal</span>
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-900 flex justify-between text-[11px] font-mono">
            <span className="text-neutral-400">Eaten: {totalCalories}</span>
            <span className={isDeficitCrossed ? "text-yellow-400 font-extrabold" : "text-neutral-500"}>
              {isDeficitCrossed ? "Limit Cross: +" : "Remaining: "}{Math.abs(remainingCalories)}
            </span>
          </div>
        </div>

        {/* Protein progress */}
        <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] uppercase font-mono text-neutral-500 tracking-wider block">
              Protein Target
            </span>
            <span className="text-2xl font-mono font-extrabold text-yellow-400 mt-1 block">
              {totalProtein}g <span className="text-xs font-normal text-neutral-400">/ {proteinTarget}g</span>
            </span>
          </div>
          <div className="mt-4">
            <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-yellow-400 h-full rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, (totalProtein / proteinTarget) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-neutral-500 font-mono mt-1.5 block uppercase">
              {Math.max(0, proteinTarget - totalProtein)}g remaining
            </span>
          </div>
        </div>

        {/* Carbs progress */}
        <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] uppercase font-mono text-neutral-500 tracking-wider block">
              Logged Carbohydrates
            </span>
            <span className="text-2xl font-mono font-extrabold text-white mt-1 block">
              {totalCarbs}g
            </span>
          </div>
          <div className="mt-4">
            <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-neutral-400 h-full rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, (totalCarbs / 250) * 100)}%` }} // arbitrary baseline bar
              />
            </div>
            <span className="text-[9px] text-neutral-500 font-mono mt-1.5 block">
              Active macro loading
            </span>
          </div>
        </div>

        {/* Fats progress */}
        <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] uppercase font-mono text-neutral-500 tracking-wider block">
              Logged Fats
            </span>
            <span className="text-2xl font-mono font-extrabold text-white mt-1 block">
              {totalFat}g
            </span>
          </div>
          <div className="mt-4">
            <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden block">
              <div 
                className="bg-neutral-400 h-full rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, (totalFat / 80) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-neutral-500 font-mono mt-1.5 block">
              Lipid load balance
            </span>
          </div>
        </div>

      </div>

      {/* Inputs block: Barcode & Gemini AI Photo Recon side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Gemini Food AI Estimator Section */}
        <div className="bg-black/40 border border-neutral-900 rounded p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-yellow-400 flex items-center gap-1.5">
              <Camera className="h-4 w-4" />
              GEMINI PHOTO CALORIE ESTIMATOR
            </h4>
            <p className="text-[10px] text-neutral-400 font-mono">
              Take a camera snapshot or upload a photo of your meal. Gemini AI parses the image, identifying foods, serving size, and macro calories.
            </p>
          </div>

          <div className="space-y-3">
            {showMealCamera ? (
              <div className="relative w-full aspect-video bg-black border border-neutral-800 rounded overflow-hidden flex flex-col justify-end">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 to-transparent flex justify-between items-center z-10">
                  <button
                    type="button"
                    onClick={stopMealCamera}
                    className="bg-neutral-850 hover:bg-neutral-800 text-white rounded px-3 py-1.5 text-[10px] font-mono flex items-center gap-1.5 uppercase tracking-wider border border-neutral-750 cursor-pointer"
                  >
                    <X className="h-3 w-3" /> CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={captureMealSnapshot}
                    className="bg-yellow-400 text-black hover:bg-yellow-500 rounded px-4 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 uppercase tracking-wider cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5 stroke-[2.5]" /> CAPTURE SCAN
                  </button>
                </div>
              </div>
            ) : (
              <>
                {photoPreview && (
                  <div className="relative w-full h-32 bg-neutral-950 border border-neutral-850 rounded overflow-hidden flex items-center justify-center">
                    <img src={photoPreview} alt="Preview file" className="object-cover w-full h-full opacity-60" />
                    {analyzingPhoto && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-xs text-yellow-400 font-mono">
                        <Loader2 className="h-6 w-6 animate-spin text-yellow-400 mb-1" />
                        RUNNING NUTRITION BREAKDOWN...
                      </div>
                    )}
                  </div>
                )}

                {photoError && (
                  <div className="text-[11px] font-mono text-red-400 bg-red-950/20 border border-red-950 p-2 rounded">
                    ⚠️ {photoError}
                  </div>
                )}
                
                {cameraError && (
                  <div className="text-[11px] font-mono text-red-400 bg-red-950/20 border border-red-950 p-2 rounded">
                    ⚠️ {cameraError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <label className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 p-2.5 rounded text-[11px] text-center font-mono cursor-pointer transition select-none uppercase tracking-wider text-white flex items-center justify-center gap-1">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUploadChange} 
                      className="hidden" 
                      disabled={analyzingPhoto}
                      id="input-food-photo"
                    />
                    📁 SELECT FILE
                  </label>
                  <button
                    type="button"
                    onClick={startMealCamera}
                    disabled={analyzingPhoto}
                    className="bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 text-yellow-400 p-2.5 rounded text-[11px] text-center font-mono transition select-none uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Video className="h-3.5 w-3.5" /> LIVE CAMERA
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Barcode Search lookup */}
        <div className="bg-black/40 border border-neutral-900 rounded p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-white flex items-center gap-1.5">
              <ScanBarcode className="h-4 w-4 text-neutral-400" />
              UPC BARCODE DATABASE LOOKUP
            </h4>
            <p className="text-[10px] text-neutral-400 font-mono">
              Retrieve exact manufacturer branding from Open Food Facts API. Scan your barcode using the camera, or search manually.
            </p>
          </div>

          <div className="space-y-3">
            {showBarcodeCamera ? (
              <div className="space-y-2">
                <div id="barcode-scanner-viewport" className="w-full aspect-video bg-black border border-neutral-800 rounded relative overflow-hidden animate-pulse" />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={stopBarcodeScanner}
                    className="bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 text-white font-mono text-[10px] px-3 py-1.5 rounded flex items-center gap-1.5 uppercase cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" /> STOP CAMERA SCANNER
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 857777005193"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="bg-neutral-950 border border-neutral-900 focus:border-yellow-400 text-xs py-2 px-3 outline-none rounded text-white font-mono flex-grow"
                    disabled={scanningBarcode}
                    id="input-food-barcode"
                  />
                  <button
                    type="button"
                    onClick={() => handleBarcodeLookup()}
                    className="bg-white hover:bg-neutral-200 text-black px-4 py-2 text-xs font-mono font-bold uppercase transition rounded cursor-pointer"
                    id="btn-food-barcode-submit"
                  >
                    {scanningBarcode ? "LOOKING..." : "SEARCH"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={startBarcodeScanner}
                  disabled={scanningBarcode}
                  className="w-full bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 text-yellow-400 p-2 rounded text-[11px] text-center font-mono transition select-none uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Video className="h-3.5 w-3.5" /> SCAN BARCODE WITH CAMERA
                </button>

                {barcodeError && (
                  <div className="text-[11px] font-mono text-neutral-400 bg-neutral-950 border border-neutral-900 p-2 rounded">
                    ⚠️ {barcodeError}
                  </div>
                )}

                {/* Presets */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">
                    Quick Test Presets (1-Click lookup)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {barcodePresets.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setBarcode(p.code);
                          handleBarcodeLookup(p.code);
                        }}
                        className="text-[9px] font-mono bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 hover:border-neutral-700 text-neutral-300 py-1 px-2 rounded transition cursor-pointer"
                        id={`btn-barcode-preset-${i}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Photo AI Verification notice */}
      {showPhotoNotice && (
        <div className="bg-yellow-400/5 border border-yellow-400/30 text-[11px] font-mono p-3 rounded flex items-start gap-2 text-neutral-400 animate-slide-in">
          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-white uppercase">[AI ESTIMATE NOTICE]</strong> Nutrition estimations loaded via Gemini photography or barcodes are automated approximations. We highly encourage validating individual fields in the calculator log sheet below before confirming.
          </span>
        </div>
      )}

      {/* Combined Logging Input area */}
      <div className="bg-[#121215] border border-neutral-850 p-4 md:p-6 rounded-sm space-y-4">
        <h4 className="text-xs uppercase font-mono font-extrabold text-neutral-400 flex items-center gap-1.5">
          <Apple className="h-4 w-4 text-yellow-400" />
          CALCULATOR LOG SHEET
        </h4>

        <form onSubmit={handleSubmitManual} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            
            {/* Meal type selection */}
            <div>
              <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">
                Meal Category
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 text-xs py-2 px-2.5 outline-none rounded text-white cursor-pointer"
                id="select-food-mealtype"
              >
                <option value="breakfast" className="bg-black text-white">🌅 Breakfast</option>
                <option value="lunch" className="bg-black text-white">☀️ Lunch</option>
                <option value="dinner" className="bg-black text-white">🌃 Dinner</option>
                <option value="snack" className="bg-black text-white">⚡ Snack</option>
              </select>
            </div>

            {/* Food Name */}
            <div className="sm:col-span-2">
              <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">
                Food Name / Description
              </label>
              <input
                type="text"
                placeholder="e.g. Dry Rolled Oats with Whey"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 text-xs py-2 px-3 outline-none rounded text-white"
                required
                id="input-food-name"
              />
            </div>

            {/* Serving Size */}
            <div>
              <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">
                Serving Size Description
              </label>
              <input
                type="text"
                placeholder="e.g. 1 plate, 1 scoop, 1 container"
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 text-xs py-2 px-3 outline-none rounded text-white"
                id="input-food-servingsize"
              />
            </div>

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            
            {/* Calories (kcal) */}
            <div>
              <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">
                Calories (kcal)
              </label>
              <input
                type="number"
                min="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="kcal"
                className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 text-xs py-2 px-3 outline-none rounded text-white font-mono text-center"
                required
                id="input-food-calories"
              />
            </div>

            {/* Protein */}
            <div>
              <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">
                Protein (grams)
              </label>
              <input
                type="number"
                min="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="g"
                className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 text-xs py-2 px-3 outline-none rounded text-white font-mono text-center"
                id="input-food-protein"
              />
            </div>

            {/* Carbs */}
            <div>
              <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">
                Carbs (grams)
              </label>
              <input
                type="number"
                min="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="g"
                className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 text-xs py-2 px-3 outline-none rounded text-white font-mono text-center"
                id="input-food-carbs"
              />
            </div>

            {/* Fat */}
            <div>
              <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">
                Fat (grams)
              </label>
              <input
                type="number"
                min="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="g"
                className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 text-xs py-2 px-3 outline-none rounded text-white font-mono text-center"
                id="input-food-fat"
              />
            </div>

            {/* Time */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[9px] uppercase font-mono text-neutral-500 mb-1">
                Time Logged
              </label>
              <input
                type="time"
                value={timeLogged}
                onChange={(e) => setTimeLogged(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-900 focus:border-yellow-400 text-xs py-2 px-3 outline-none rounded text-white font-mono"
                required
                id="input-food-timelogged"
              />
            </div>

          </div>

          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-2.5 font-mono text-xs font-bold uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            id="btn-food-submit-manual"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            COMMIT NUTRITION SHEET
          </button>
        </form>

      </div>

      {/* Custom Date Picker & Logs List */}
      <div className="bg-[#121215] border border-neutral-850 p-4 md:p-6 rounded-sm space-y-4">
        
        {/* Toggle logs date */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-900 pb-3">
          <h4 className="text-xs uppercase font-mono font-extrabold text-neutral-400 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-neutral-500" />
            NUTRITION REGISTER LOGS ({foodLogs.length})
          </h4>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-neutral-500 uppercase">Viewing logs for:</span>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="bg-neutral-950 border border-neutral-900 outline-none p-1.5 text-xs font-mono text-white rounded-sm"
              id="input-food-log-date-picker"
            />
          </div>
        </div>

        {/* List of food logs */}
        {loading ? (
          <div className="py-6 text-center text-xs text-neutral-500 font-mono animate-pulse uppercase">
            Fetching active food index...
          </div>
        ) : foodLogs.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-500 font-mono bg-neutral-950/40 border border-neutral-900 rounded-sm">
            NO FOOD OR MEALS LOGGED FOR {dateStr}.
          </div>
        ) : (
          <div className="space-y-2">
            {foodLogs.map((item) => {
              // Icon mapping corresponding to meal
              let MealIcon = Cookie;
              if (item.mealType === "breakfast") MealIcon = Apple;
              else if (item.mealType === "lunch") MealIcon = Sandwich;
              else if (item.mealType === "dinner") MealIcon = Milk;

              return (
                <div 
                  key={item.id} 
                  className="bg-neutral-950 border border-neutral-900 px-4 py-3 rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition hover:border-neutral-800"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="h-8 w-8 rounded-sm bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mt-0.5">
                      <MealIcon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-xs font-bold text-white leading-tight">{item.name}</span>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-sm leading-none shrink-0">
                          {item.mealType}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block uppercase">
                        Portion size: {item.servingSize} // logged at {item.timeLogged}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-neutral-900 sm:border-0">
                    <div className="flex gap-4 font-mono text-[10px] text-neutral-400 text-right uppercase">
                      <div>
                        <span className="text-white font-bold block">{item.calories} <span className="text-neutral-500 font-normal">kcal</span></span>
                        <span>Energy</span>
                      </div>
                      <div>
                        <span className="text-yellow-400 font-bold block">{item.protein}g</span>
                        <span>Protein</span>
                      </div>
                      <div>
                        <span className="block">{item.carbs}g</span>
                        <span>Carb</span>
                      </div>
                      <div>
                        <span className="block">{item.fat}g</span>
                        <span>Fat</span>
                      </div>
                    </div>

                    {item.id && (
                      <button
                        onClick={() => handleDeleteFood(item.id!)}
                        className="text-neutral-500 hover:text-red-400 p-1"
                        title="Delete log"
                        id={`btn-food-delete-${item.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
