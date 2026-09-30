import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant.js";
import { getGeminiResponse } from "../services/geminiService.js";
import {
  Sparkles,
  Bot,
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  X,
  Trash2,
  RotateCcw,
  MessageSquare,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

// Page-specific suggested questions in Hindi
const PAGE_PROMPTS = {
  "/dashboard": [
    "🌾 दीवाल्स फार्म ऑपरेशन्स की जानकारी दें",
    "📊 सिस्टम में कौन-कौन से फीचर्स सक्रिय हैं?",
    "💡 फार्म मैनेजर के लिए मुख्य दैनिक सुझाव",
  ],
  "/staff": [
    "👥 नया स्टाफ सदस्य कैसे दर्ज करें?",
    "📋 स्टाफ प्रोफाइल के लिए क्या जानकारी चाहिए?",
    "🔑 स्टाफ रोल और अनुमतियां (Permissions) कैसे काम करती हैं?",
  ],
  "/attendance": [
    "🕒 उपस्थिति (Attendance) चेक-इन कैसे काम करता है?",
    "📍 क्या हाजिरी के लिए लोकेशन वेरिफिकेशन जरूरी है?",
    "📊 आज की स्टाफ अटेंडेंस रिपोर्ट कैसे देखें?",
  ],
  "/poultry": [
    "🐔 दैनिक अंडा उत्पादन का रिकॉर्ड कैसे दर्ज करें?",
    "🌾 मुर्गियों के लिए दाने (Feed) का सही शेड्यूल क्या है?",
    "🩺 पोल्ट्री मुर्गियों में बीमारी के शुरुआती लक्षण क्या हैं?",
  ],
  "/animals": [
    "🏷️ पशु टैगिंग (Tag ID) सिस्टम कैसे काम करता है?",
    "🐄 हर मवेशी/बकरी का स्वास्थ्य रिकॉर्ड कैसे देखें?",
    "📋 डिलीवरी डेट और हीट अलर्ट्स कैसे ट्रैक करें?",
  ],
  "/my-tasks": [
    "✅ मुझे दिए गए कार्यों (Assigned Tasks) को पूरा कैसे दर्ज करें?",
    "⏰ पोल्ट्री, ब्रूडर और पैच वर्क्स कैसे देखें?",
    "📝 कार्य में फोटो और वीडियो प्रूफ कैसे अपलोड करें?",
  ],
  "/work-management": [
    "🗂️ स्टाफ को नए कार्य (Daily Work) कैसे असाइन करें?",
    "📊 टीम की वर्क प्रोग्रेस कैसे ट्रैक करें?",
    "⚡ फील्ड पैच का काम वर्कर को कैसे दें?",
  ],
  "/schedule": [
    "🗓️ साप्ताहिक कार्य शेड्यूल कैसे बनाएं?",
    "👥 वर्कर की शिफ्ट टाइमिंग कैसे असाइन करें?",
  ],
  "/assets": [
    "🧰 फार्म टूल्स और मशीनरी मेंटेनेंस का रिकॉर्ड कैसे रखें?",
    "📦 सामान (Feed Stock) और इन्वेंट्री ट्रैकिंग टिप्स",
  ],
};

const DEFAULT_PROMPTS = [
  "🌾 दीवाल्स फार्महाउस मैनेजमेंट के मुख्य फीचर्स बताएं",
  "🐔 पोल्ट्री और ब्रूडर का रिकॉर्ड प्रभावी ढंग से कैसे रखें?",
  "🕒 स्टाफ हाजिरी और लोकेशन वेरिफिकेशन कैसे दर्ज होती है?",
  "📋 आज के मुख्य फार्म मैनेजमेंट स्टेप्स बताएं",
];

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("dewals_ai_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved chat history:", e);
      }
    }
    return [
      {
        id: "welcome-1",
        role: "assistant",
        text: "नमस्ते! मैं आपका **Dewals Farm AI वॉयस और चैट असिस्टेंट** 🌾 हूँ। आप मुझसे बोलकर या लिखकर स्टाफ हाजिरी, पोल्ट्री, लाइवस्टॉक, वैक्सिनेशन या फार्म ऑपरेशन्स के बारे में **हिंदी में** कुछ भी पूछ सकते हैं!",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const location = useLocation();
  const { user } = useAuth();

  const {
    isListening,
    transcript,
    setTranscript,
    isSpeaking,
    isMuted,
    speechSupported,
    recognitionSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleMute,
  } = useVoiceAssistant();

  // Save chat history to localStorage
  useEffect(() => {
    localStorage.setItem("dewals_ai_chat_history", JSON.stringify(messages.slice(-20)));
  }, [messages]);

  // Sync transcript from speech recognition into input field
  useEffect(() => {
    if (transcript) {
      setInputQuery(transcript);
    }
  }, [transcript]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Handle message submission
  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    if (isListening) {
      stopListening();
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Add user message
    const userMsg = {
      id: `usr-${Date.now()}`,
      role: "user",
      text: query,
      time: timeStr,
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputQuery("");
    setTranscript("");
    setIsLoading(true);

    try {
      const pageContext = {
        currentPage: location.pathname,
        userName: user?.name || "Farm Manager",
        userRole: user?.role || "Staff",
      };

      // Call Gemini API service
      const aiResponseText = await getGeminiResponse(
        updatedHistory.map((m) => ({ role: m.role, text: m.text })),
        query,
        pageContext
      );

      const aiMsg = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: aiResponseText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);

      // Read aloud response if not muted
      if (!isMuted) {
        speak(aiResponseText);
      }
    } catch (error) {
      console.error("AI Assistant Error:", error);
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: "assistant",
        text: "⚠️ Sorry, I encountered an issue connecting to the AI service. Please check your internet connection or try again.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    stopSpeaking();
    const reset = [
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        text: "Chat cleared! How can I assist you with Dewals Farm operations today?",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
    setMessages(reset);
    localStorage.removeItem("dewals_ai_chat_history");
  };

  // Get current page suggestions
  const currentPrompts = PAGE_PROMPTS[location.pathname] || DEFAULT_PROMPTS;

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-50 group flex items-center gap-2.5 bg-gradient-to-r from-farm-700 via-farm-600 to-emerald-600 hover:from-farm-800 hover:to-emerald-700 text-white px-4 py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20"
          title="Open AI Voice & Chat Assistant"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="font-semibold text-sm tracking-wide hidden sm:inline">
            AI Assistant
          </span>
          <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full text-white/90 font-medium">
            Voice & Chat
          </span>
        </button>
      )}

      {/* AI Assistant Overlay Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 w-[calc(100vw-24px)] sm:w-[420px] max-h-[85vh] h-[650px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-farm-900 via-farm-800 to-emerald-900 text-white px-4 py-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-farm-600 flex items-center justify-center shadow">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-farm-900 ${
                    isListening
                      ? "bg-red-500 animate-ping"
                      : isSpeaking
                      ? "bg-amber-400 animate-bounce"
                      : "bg-emerald-400"
                  }`}
                />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                  Dewals AI असिस्टेंट
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                </h3>
                <p className="text-[11px] text-emerald-200/80 font-medium truncate max-w-[190px]">
                  {isListening
                    ? "🎙️ आपकी आवाज़ सुन रहा हूँ..."
                    : isSpeaking
                    ? "🔊 जवाब बोल रहा हूँ..."
                    : isLoading
                    ? "💭 जवाब तैयार कर रहा हूँ..."
                    : "ऑनलाइन • वॉयस एवं हिंदी तैयार"}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMute}
                className={`p-1.5 rounded-lg transition ${
                  isMuted ? "text-red-300 hover:bg-white/10" : "text-emerald-200 hover:bg-white/10"
                }`}
                title={isMuted ? "Unmute Voice Output" : "Mute Voice Output"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
                title="Clear Chat History"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
                title="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Context Bar */}
          <div className="bg-farm-50 border-b border-farm-100 px-3.5 py-1.5 flex items-center justify-between text-xs text-farm-800">
            <span className="font-medium truncate flex items-center gap-1">
              <span>📍 Location:</span>
              <span className="bg-white px-2 py-0.5 rounded border border-farm-200 text-farm-900 font-semibold">
                {location.pathname}
              </span>
            </span>
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="text-[10px] bg-red-100 hover:bg-red-200 text-red-700 px-2 py-0.5 rounded font-medium transition"
              >
                Stop Speech
              </button>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-farm-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-farm-600 text-white rounded-tr-none"
                      : "bg-white text-gray-800 border border-gray-200/80 rounded-tl-none"
                  }`}
                >
                  {/* Text Content */}
                  <div className="whitespace-pre-wrap break-words font-normal">
                    {msg.text.split("\n").map((line, idx) => {
                      // Process bold text formatted with **text**
                      const parts = line.split(/(\*\*[^*]+\*\*)/g);
                      return (
                        <p key={idx} className={idx > 0 ? "mt-1.5" : ""}>
                          {parts.map((part, pIdx) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                              return (
                                <strong key={pIdx} className="font-semibold text-farm-900">
                                  {part.slice(2, -2)}
                                </strong>
                              );
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                  </div>

                  {/* Footer metadata & speak action */}
                  <div
                    className={`mt-1.5 flex items-center justify-between gap-2 text-[10px] ${
                      msg.role === "user" ? "text-farm-100/80" : "text-gray-400"
                    }`}
                  >
                    <span>{msg.time}</span>
                    {msg.role === "assistant" && speechSupported && (
                      <button
                        onClick={() => speak(msg.text)}
                        className="hover:text-farm-700 font-medium flex items-center gap-0.5 transition"
                        title="Listen to this message"
                      >
                        <Volume2 className="w-3 h-3" /> Speak
                      </button>
                    )}
                  </div>
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-gray-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-farm-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-farm-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-farm-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-farm-500 rounded-full animate-bounce" />
                </div>
              </div>
            )}

            {/* Speech Recording Waves Animation */}
            {isListening && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center animate-pulse">
                <p className="text-xs font-semibold text-red-600 flex items-center justify-center gap-2">
                  <Mic className="w-4 h-4 text-red-500 animate-bounce" />
                  Listening to voice input... speak clearly now
                </p>
                <div className="flex justify-center items-center gap-1 mt-2">
                  <span className="w-1 h-4 bg-red-400 rounded animate-pulse" />
                  <span className="w-1 h-6 bg-red-500 rounded animate-pulse [animation-delay:0.1s]" />
                  <span className="w-1 h-3 bg-red-300 rounded animate-pulse [animation-delay:0.2s]" />
                  <span className="w-1 h-7 bg-red-600 rounded animate-pulse [animation-delay:0.15s]" />
                  <span className="w-1 h-4 bg-red-400 rounded animate-pulse [animation-delay:0.05s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="bg-white border-t border-gray-100 px-3 py-2">
            <div className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-farm-600" />
              Suggested questions for this section:
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {currentPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  className="whitespace-nowrap bg-farm-50 hover:bg-farm-100 text-farm-800 text-[11px] px-2.5 py-1 rounded-full border border-farm-200/70 transition shrink-0 font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Controls */}
          <div className="p-3 bg-white border-t border-gray-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Voice Recording Button */}
              {recognitionSupported && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`p-2.5 rounded-xl transition-all duration-200 shrink-0 ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse shadow-lg ring-4 ring-red-200"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                  title={isListening ? "Stop Voice Recording" : "Start Voice Input"}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}

              {/* Text Field */}
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  isListening
                    ? "Listening... speak now"
                    : "Ask AI about farm, staff, livestock..."
                }
                disabled={isLoading}
                className="flex-1 bg-gray-50 border border-gray-300 focus:border-farm-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-farm-600 text-xs text-gray-800 rounded-xl px-3.5 py-2.5 transition"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputQuery.trim() || isLoading}
                className="bg-farm-600 hover:bg-farm-700 disabled:opacity-40 disabled:hover:bg-farm-600 text-white p-2.5 rounded-xl transition shadow-sm shrink-0"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
