import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Trash2, Dumbbell, ShieldAlert, CheckCircle, RefreshCw, Bot, User, ArrowRight } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: number;
}

const SUGGESTIONS = [
  "How do I prevent lower back strain during Romanian deadlifts?",
  "Suggest a high-protein post-workout meal on a caloric deficit.",
  "Which is better for quads: standard barbell squat or goblet squat?",
  "Explain the aerobic benefits of maintaining Zone 2 cardio."
];

export default function AIChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("fitdeficit_chat_history");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved chat history", e);
      }
    } else {
      // Set default friendly system greeting
      setMessages([
        {
          id: "welcome",
          sender: "bot",
          text: "Welcome! I am your FitDeficit AI Gym Assistant. I specialize in kinesiology, mechanical lift form, active mobility, and target sports nutrition.\n\nWhether you need to optimize your workout splits, dissect exercise mechanics, or program macronutrient recovery, I am here to assist. What are we optimizing today?",
          timestamp: Date.now()
        }
      ]);
    }
  }, []);

  // Save chat history to localStorage dynamically
  const saveHistory = (msgs: Message[]) => {
    localStorage.setItem("fitdeficit_chat_history", JSON.stringify(msgs));
  };

  // Scroll to bottom on updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setErrorText(null);
    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: "user",
      text,
      timestamp: Date.now()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveHistory(updatedMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: text,
          history: messages // Pass existing session history for multi-turn capability
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to retrieve reply from AI servers.");
      }

      const botMsg: Message = {
        id: Math.random().toString(36).substring(7),
        sender: "bot",
        text: data.reply,
        timestamp: Date.now()
      };

      const finalMessages = [...updatedMessages, botMsg];
      setMessages(finalMessages);
      saveHistory(finalMessages);
    } catch (err: any) {
      console.error("AI Communication error:", err);
      setErrorText(err.message || "Network error. Please confirm your main systems are online.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    const confirmation = window.confirm("Are you sure you want to completely wipe your session conversation logs?");
    if (!confirmation) return;
    
    const originalGreeting: Message[] = [
      {
        id: "welcome",
        sender: "bot",
        text: "Session restarted. How can I optimize your kinesiologist form metrics or nutritional goals today?",
        timestamp: Date.now()
      }
    ];
    setMessages(originalGreeting);
    saveHistory(originalGreeting);
    setErrorText(null);
  };

  return (
    <div className="bg-[#121215] border border-neutral-800 rounded-lg p-5 flex flex-col h-[580px] space-y-4">
      {/* Header block */}
      <div className="border-b border-neutral-900 pb-3 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="text-sm uppercase font-mono font-extrabold text-neutral-300 flex items-center gap-1.5 leading-none">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            FITDEFICIT AI GYM ASSISTANT
          </h3>
          <p className="text-[10px] text-neutral-500 font-mono mt-1 uppercase">
            Interactive system for lifting form, nutritional science, and split biology.
          </p>
        </div>

        <button
          onClick={handleClearHistory}
          className="text-[10px] font-mono hover:text-red-400 transition bg-neutral-950 border border-neutral-900 rounded px-2.5 py-1.5 text-neutral-500 flex items-center gap-1.5 select-none cursor-pointer"
          title="Reset conversation logs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          CLEAR HISTORY
        </button>
      </div>

      {/* Main chat log messages frame */}
      <div className="flex-1 overflow-y-auto bg-neutral-950 border border-neutral-900 rounded p-4 space-y-4 max-h-[380px] relative scrollbar-thin">
        {messages.map((msg) => {
          const isBot = msg.sender === "bot";
          return (
            <div 
              key={msg.id} 
              className={`flex gap-3 max-w-[85%] ${isBot ? "mr-auto" : "ml-auto flex-row-reverse"}`}
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                isBot 
                  ? "bg-yellow-400/5 border-yellow-400/20 text-yellow-400" 
                  : "bg-neutral-900 border-neutral-800 text-neutral-300"
              }`}>
                {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>

              <div className={`p-3 rounded-lg text-xs leading-relaxed space-y-2 whitespace-pre-line ${
                isBot 
                  ? "bg-[#18181a] border border-neutral-850 text-neutral-200" 
                  : "bg-yellow-400 text-black font-medium"
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center">
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-yellow-400/5 border border-yellow-400/20 text-yellow-400 shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-[#18181a] border border-neutral-850 p-3 rounded-lg text-xs text-neutral-400 font-mono flex items-center gap-2">
              <RefreshCw className="h-3 w-3 animate-spin text-yellow-400" />
              FitDeficit AI is heavy lifting thoughts...
            </div>
          </div>
        )}

        {errorText && (
          <div className="bg-red-950/20 border border-red-900/50 p-3 rounded text-red-400 text-[11px] font-mono flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>ERROR: {errorText}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length <= 1 && (
        <div className="space-y-1.5">
          <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">
            Suggested Prompts for Muscle Mechanics
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SUGGESTIONS.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(sug)}
                disabled={isLoading}
                className="text-left bg-[#151518] hover:bg-[#1b1b20] border border-neutral-900 p-2.5 rounded-sm text-[10px] text-neutral-300 font-sans flex items-center justify-between gap-2 transition select-none cursor-pointer group"
              >
                <span className="line-clamp-1">{sug}</span>
                <ArrowRight className="h-3 w-3 text-neutral-500 group-hover:text-yellow-400 transition shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat bottom input bar */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputValue);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask AI personal trainer about form cues, exercises, or macro science..."
          disabled={isLoading}
          className="flex-1 bg-neutral-950 border border-neutral-850 rounded px-3 py-2.5 text-xs text-neutral-200 font-mono placeholder-neutral-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 disabled:opacity-50"
        />
        
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-black px-4 rounded transition flex items-center justify-center font-bold select-none cursor-pointer shrink-0"
          title="Submit Prompt"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
