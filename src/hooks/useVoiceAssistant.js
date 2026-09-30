import { useState, useEffect, useRef, useCallback } from "react";

export function useVoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem("dewals_ai_muted") === "true";
  });
  const [speechSupported, setSpeechSupported] = useState(true);
  const [recognitionSupported, setRecognitionSupported] = useState(true);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis || null);

  // Initialize Speech Recognition for Hindi (hi-IN)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "hi-IN"; // Set Hindi speech input recognition

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Check Text-to-Speech support & pre-fetch voices
  useEffect(() => {
    if (!window.speechSynthesis) {
      setSpeechSupported(false);
    } else {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }, []);

  // Start listening to voice input
  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript("");
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.warn("Could not start recognition:", e);
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.warn("Could not stop recognition:", e);
    }
  }, []);

  // Speak text output in Hindi
  const speak = useCallback(
    (text) => {
      if (!synthRef.current || isMuted || !text) return;

      // Clean text from markdown syntax for better speech output
      const cleanText = text
        .replace(/[*_#`~]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/^[•\-\*]\s+/gm, "");

      // Cancel ongoing speech
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.95; // Clear pace for Hindi
      utterance.pitch = 1.0;
      utterance.lang = "hi-IN"; // Set Hindi speech synthesis language

      // Select Hindi voice if available
      const voices = synthRef.current.getVoices();
      const preferredVoice =
        voices.find((v) => v.lang === "hi-IN" || v.lang === "hi_IN" || v.lang.startsWith("hi")) ||
        voices.find((v) => v.name.toLowerCase().includes("hindi") || v.name.toLowerCase().includes("hi-in")) ||
        voices.find((v) => v.lang.startsWith("en-IN"));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current.speak(utterance);
    },
    [isMuted]
  );

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Toggle Mute setting
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem("dewals_ai_muted", String(next));
      if (next) {
        stopSpeaking();
      }
      return next;
    });
  }, [stopSpeaking]);

  return {
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
  };
}
