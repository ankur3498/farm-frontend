// Service for communicating with Gemini API for Dewals Farm Management Assistant in Hindi

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

const SYSTEM_PROMPT = `
You are "Dewals Farm AI" (दीवाल्स फार्म AI), an intelligent, friendly, and expert voice & chat assistant for Dewals Farmhouse Management System.

STRICT MANDATORY RULES:
1. ALWAYS RESPOND IN HINDI (हिंदी में उत्तर दें). You can use clean, natural Hindi in Devanagari script mixed with common farm terms (e.g. Attendance, Check-in, Brooder, Vaccination, Batch, Field Patch, Tag ID).
2. Keep responses concise, clear, and easy for Voice Readout (ध्वनि अनुवाद के लिए आसान और स्पष्ट उत्तर दें).
3. Always provide practical step-by-step guidance for farm managers and staff.

System Features you can guide on in Hindi:
- **Dashboard (डैशबोर्ड)**: फार्म का ओवरव्यू, लाइवस्टॉक काउंट, क्रॉप और डेली समरी।
- **Staff & Attendance (स्टाफ और उपस्थिति)**: फोटो और लोकेशन वेरिफिकेशन के साथ Check-in/Check-out, हाजिरी रिपोर्ट।
- **Work & Tasks (कार्य प्रबंधन)**: दैनिक कार्य, Poultry Care, Brooder Care, Field Patch Work, Vaccination Alerts.
- **Poultry & Brooder (पोल्ट्री और ब्रूडर)**: अंडे का उत्पादन, दाना-पानी (Feed), मृत्यु दर (Mortality), इन-ट्रांजिट चिक्स और वैक्सिनेशन अलर्ट।
- **Animals & Tagging (पशु प्रबंधन)**: Tag ID, बकरी एवं मवेशी रजिस्ट्रेशन, डिलीवरी अलर्ट, मेडिकल हिस्ट्री।
- **Field Patches (खेत के पैच)**: Landmark, Crop Size, assigned work proof और मैनेजर रिव्यू।
- **Assets & Expenses (संपत्ति और खर्चे)**: मशीनरी, फीड स्टॉक, खर्चों का रिकॉर्ड और वित्तीय बिक्री (Sales)。
`;

/**
 * Smart Local Hindi Fallback Response Generator when API is unreachable or key is unconfigured
 */
function getFallbackHindiResponse(userQuery = "", pageContext = {}) {
  const query = userQuery.toLowerCase();

  if (query.includes("poultry") || query.includes("पोल्ट्री") || query.includes("मुर्गी") || query.includes("अंडा") || query.includes("egg") || query.includes("brooder")) {
    return `🐔 **पोल्ट्री और ब्रूडर प्रबंधन:**
• **डेली रिकॉर्ड:** पोल्ट्री सेक्शन में मुर्गियों के अंडे का उत्पादन, दाना (Feed kg) और मृत्यु दर दर्ज कर सकते हैं।
• **ब्रूडर केयर:** नए चूजों का तापमान (33°C), पानी और Pre-starter दाना ट्रैक करें।
• **वैक्सीन अलर्ट:** हर बैच के लिए standard 9 वैक्सिनेशन अलर्ट्स (Ranikhet, Gumboro, Marek's) वर्क टास्क में ऑटोमेटिक दिखाई देते हैं।`;
  }

  if (query.includes("attendance") || query.includes("हाजिरी") || query.includes("उपस्थिति") || query.includes("checkin") || query.includes("staff") || query.includes("स्टाफ")) {
    return `🕒 **स्टाफ एवं उपस्थिति प्रबंधन:**
• **हाजिरी लगाना:** Attendance सेक्शन में जा कर selfie फोटो और GPS Location verification के साथ Check-in/Check-out करें।
• **स्टाफ प्रोफाइल:** नए वर्कर का रजिस्ट्रेशन मोबाइल नंबर और रोल (Manager / Staff) के साथ किया जा सकता है।
• **रिपोर्ट:** मैनेजर प्रतिदिन की टीम अटेंडेंस और टाइमिंग देख सकते हैं।`;
  }

  if (query.includes("task") || query.includes("work") || query.includes("काम") || query.includes("टास्क") || query.includes("patch") || query.includes("पैच")) {
    return `📋 **कार्य प्रबंधन (Work & Tasks):**
• **My Tasks:** वर्कर को उनके assigned work (Poultry Care, Brooder Care, Field Patch Work और Vaccine Alerts) अलग-अलग सेक्शन में साफ दिखाई देते हैं।
• **Field Patch Work:** खेत के पैच का काम (Crop, Size, Landmark) अलग से दिखेगा और काम पूरा होने पर फोटो proof सबमिट किया जा सकता है।
• **मैनेजर रिव्यू:** सबमिट किए गए काम को मैनेजर approve या decline कर सकते हैं।`;
  }

  if (query.includes("animal") || query.includes("goat") || query.includes("tag") || query.includes("पशु") || query.includes("बकरी") || query.includes("गाय")) {
    return `🐄 **पशु प्रबंधन एवं Tagging:**
• **Tag ID:** हर पशु के लिए यूनिक Tag ID के साथ रिकॉर्ड सेव करें।
• **हेल्थ अलर्ट:** डिलीवरी डेट, हीट साइकिल (Heat tracking) और वैक्सीनेशन के अलर्ट्स मिलते हैं।
• **वेट एवं ब्रीड:** बकरियों और मवेशियों का वजन और नस्ल डिटेल्स ट्रैक कर सकते हैं।`;
  }

  if (query.includes("expense") || query.includes("sale") || query.includes("खर्च") || query.includes("बिक्री") || query.includes("asset") || query.includes("सामान")) {
    return `💰 **संपत्ति एवं वित्तीय प्रबंधन:**
• **Expenses & Sales:** फार्म के दैनिक खर्चों और बिक्री (खाद, दूध, अंडे, पशु) की इनवॉइस एंट्री करें।
• **Assets Inspection:** ट्रैक्टर, मोटर और टूल्स का वीकली मेंटेनेंस चेक लिस्ट रिकॉर्ड करें।`;
  }

  return `🌾 **Dewals Farm AI सहायक में आपका स्वागत है!**
मैं आपकी Dewals Farmhouse Management में सहायता के लिए हमेशा तैयार हूँ।
आप मुझसे हिंदी में पूछ सकते हैं:
1. स्टाफ की हाजिरी और उपस्थिति दर्ज कैसे करें?
2. पोल्ट्री मुर्गियों और ब्रूडर के रिकॉर्ड कैसे रखें?
3. आज के वर्कर टास्क और वैक्सिनेशन अलर्ट कैसे देखें?
4. पशुओं (Goat & Cattle) की टैगिंग और डिलीवरी अलर्ट्स कैसे ट्रैक करें?`;
}

/**
 * Generate AI content from Gemini API in Hindi
 */
export async function getGeminiResponse(conversationHistory = [], userQuery = "", pageContext = {}) {
  try {
    if (!DEFAULT_API_KEY || DEFAULT_API_KEY.length < 15 || DEFAULT_API_KEY.startsWith("AQ.")) {
      // Use local smart Hindi engine if API key is not configured or placeholder
      return getFallbackHindiResponse(userQuery, pageContext);
    }

    const contents = [];

    conversationHistory.forEach((msg) => {
      if (msg.role === "user") {
        contents.push({
          role: "user",
          parts: [{ text: msg.text }],
        });
      } else if (msg.role === "assistant") {
        contents.push({
          role: "model",
          parts: [{ text: msg.text }],
        });
      }
    });

    let promptWithContext = userQuery;
    if (pageContext && Object.keys(pageContext).length > 0) {
      const contextInfo = [];
      if (pageContext.currentPage) contextInfo.push(`Current Page: ${pageContext.currentPage}`);
      if (pageContext.userName) contextInfo.push(`User Name: ${pageContext.userName}`);
      if (pageContext.userRole) contextInfo.push(`User Role: ${pageContext.userRole}`);

      if (contextInfo.length > 0) {
        promptWithContext = `[Context: ${contextInfo.join(" | ")}]\n\nकृपया उत्तर हिंदी में दें (Answer in Hindi):\n${userQuery}`;
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: promptWithContext }],
    });

    const requestBody = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      },
    };

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": DEFAULT_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.warn("Gemini API call failed, using smart Hindi fallback engine");
      return getFallbackHindiResponse(userQuery, pageContext);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate || !candidate.content || !candidate.content.parts) {
      return getFallbackHindiResponse(userQuery, pageContext);
    }

    const responseText = candidate.content.parts.map((p) => p.text).join("\n");
    return responseText;
  } catch (error) {
    console.warn("Error calling Gemini API, using Hindi fallback:", error.message);
    return getFallbackHindiResponse(userQuery, pageContext);
  }
}
