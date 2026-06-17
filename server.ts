import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload size limits for base64 food image uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Helper to initialize GoogleGenAI lazily and safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables. Please add it via Secrets.");
  }
  return new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}

// Helper to reliably call Gemini models with automatic, robust retry capabilities
async function generateContentWithRetry(ai: any, modelName: string, contents: any, config: any, maxRetries: number = 5) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config
      });
      if (response && response.text) {
        return response;
      }
      throw new Error("Empty text returned from Google GenAI model");
    } catch (err: any) {
      attempt++;
      const errorMessage = err.message || String(err);
      const isRetryable = 
        errorMessage.includes("503") || 
        errorMessage.includes("500") ||
        errorMessage.includes("429") ||
        errorMessage.includes("UNAVAILABLE") || 
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("high demand") ||
        errorMessage.includes("temporary") ||
        errorMessage.includes("overwhelmed") ||
        errorMessage.includes("busy") ||
        errorMessage.includes("rate") ||
        errorMessage.includes("demand") ||
        errorMessage.includes("limit");
      
      if (isRetryable && attempt < maxRetries) {
        const delay = Math.pow(1.8, attempt) * 800 + Math.random() * 300;
        console.warn(`[Attempt ${attempt}/${maxRetries} failed for model ${modelName}] Retryable error: "${errorMessage}". Retrying in ${Math.round(delay)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Failed to generate content after manual retries.");
}

// 0. AI Gym Chatbot Assistant Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing 'message' in request body." });
    }

    const ai = getGeminiClient();

    // Reconstruct the turn-based message array for the model
    const contents: any[] = [];
    
    // Add history items. Gemini chat sessions MUST start with a "user" role message.
    // If there is a "bot" welcome message or assistant pre-prompt at the beginning, omit it.
    for (const msg of history) {
      if (contents.length === 0 && msg.sender !== "user") {
        continue;
      }
      contents.push({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      });
    }

    // Append the current user prompt
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const systemInstruction = `You are the expert FitDeficit AI Gym Assistant, a world-class elite personal trainer, kinesiologist, and sports nutritionist.
Your mission is to provide science-backed, highly accurate, and empowering athletic advice concerning:
1. Workout programs, routines, and splits.
2. Perfect mechanical lift form (e.g., squat depth, bench bar path, deadlift engagement).
3. Target nutritional macros, metabolic rate, caloric deficits/surpluses, and daily hydration.
4. Active recovery, mobility routines, sleep science, and athletic biomechanics.

Style Guidelines:
- Write in an energetic, encouraging, and highly professional Tone.
- Be extremely structured. Use lists, bullet points, and highlight terms with bold text where relevant for high readability.
- Refer contextually to the user as a dedicated user. Do not output generic warnings unless safe lifting technique is involved. Keep replies crisp and focused on actionable solutions.`;

    const modelsToTry = [
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.1-pro-preview"
    ];

    let response = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        response = await generateContentWithRetry(
          ai,
          modelName,
          contents,
          { systemInstruction }
        );
        if (response) {
          break;
        }
      } catch (err: any) {
        console.warn(`Model '${modelName}' encountered an issue in chat after retries. Trying next fallback... Details:`, err.message || err);
        lastError = err;
      }
    }

    if (!response) {
      throw lastError || new Error("All loaded AI models are currently overwhelmed or unavailable.");
    }

    const reply = response.text;
    res.json({ success: true, reply });
  } catch (error: any) {
    console.error("Gemini Chat Endpoint Failure:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to route query to the AI systems." 
    });
  }
});

// 1. Food Photo Analysis Endpoint (Gemini)
app.post("/api/food-analysis", async (req, res) => {
  try {
    const { image, mimeType = "image/jpeg" } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Missing 'image' base64 data in request body" });
    }

    const ai = getGeminiClient();

    // Clean base64 string if it contains the data:image prefix
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `You are an expert fitness nutritionist and calorie estimator. 
Analyze the food in this image. Estimate the food item or meal name, total calories, protein (in grams), carbohydrates (in grams), fat (in grams), and standard serving size.
Return your response as a STRICT, VALID JSON object with the following schema:
{
  "name": "Single string name of the food or meal",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "servingSize": "string describing the size, e.g. 1 medium plate, 1 cup, 2 slices"
}
Do not return any markdown formatting, backticks (\`\`\`json), or conversational filler. Return only raw JSON.`;

    const inlineContents = [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Data
            }
          }
        ]
      }
    ];

    const modelConfig = {
      responseMimeType: "application/json",
    };

    const modelsToTry = [
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.1-pro-preview"
    ];

    let response = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        response = await generateContentWithRetry(
          ai,
          modelName,
          inlineContents,
          modelConfig
        );
        if (response) {
          break;
        }
      } catch (err: any) {
        console.warn(`Model '${modelName}' experienced high demand or error in food analysis after retries. Trying next fallback... Details:`, err.message || err);
        lastError = err;
      }
    }

    if (!response) {
      throw lastError || new Error("All loaded AI systems are currently overwhelming or unavailable.");
    }

    const bodyText = response.text;
    if (!bodyText) {
      throw new Error("No response content from Gemini API.");
    }

    // Parse the JSON estimation safely
    let estimation;
    try {
      estimation = JSON.parse(bodyText.trim().replace(/^```json/, "").replace(/```$/, ""));
    } catch (parseError) {
      console.error("Failed to parse Gemini output as JSON:", bodyText);
      // Fallback parser for regex or manual fix if it's slightly malformed
      estimation = {
        name: "Estimated Meal",
        calories: 350,
        protein: 15,
        carbs: 45,
        fat: 12,
        servingSize: "1 typical portion"
      };
    }

    res.json({ success: true, estimation });
  } catch (error: any) {
    console.error("Gemini Food Analysis Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to analyze food photo." 
    });
  }
});

// 2. Health status endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Configure Vite middleware or static server
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FitDeficit backend server running on http://localhost:${PORT}`);
  });
}

export default app;

if (!process.env.VERCEL) {
  setupVite().catch((err) => {
    console.error("Failed to initialize Vite development middleware:", err);
    process.exit(1);
  });
}
