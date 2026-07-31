import { supabase } from './supabase';
import i18n from './i18n/i18n';

export type AITask =
  | 'chat'
  | 'parse_search'
  | 'recommend'
  | 'description'
  | 'title'
  | 'seo'
  | 'lead_summary'
  | 'translate'
  | 'market_insights'
  | 'email';

export interface AIRequest {
  task: AITask;
  payload: Record<string, unknown>;
}

export interface AIResponse {
  result: string;
  error?: string;
}

export interface ParsedSearchFilter {
  city?: string;
  locality?: string;
  purpose?: 'Sale' | 'Rent';
  bedrooms?: number;
  max_price?: number;
  property_type?: string;
  amenities?: string[];
}

function getSystemAndUserPrompt(task: AITask, payload: Record<string, unknown>): { system: string; user: string } {
  const p = payload;
  const currentLangCode = localStorage.getItem('realtynow_language') || i18n.language || 'en';
  const langNames: Record<string, string> = {
    hi: 'Hindi (हिंदी)',
    te: 'Telugu (తెలుగు)',
    ta: 'Tamil (தமிழ்)',
    kn: 'Kannada (ಕನ್ನಡ)',
    ml: 'Malayalam (മലയാളം)',
    mr: 'Marathi (मराठी)',
    bn: 'Bengali (বাংলা)',
    gu: 'Gujarati (ગુજરાતી)',
    pa: 'Punjabi (ਪੰਜਾਬੀ)',
    en: 'English',
  };
  const targetLang = langNames[currentLangCode] || 'English';
  const langSuffix =
    currentLangCode !== 'en' && task !== 'parse_search'
      ? ` IMPORTANT INSTRUCTION: You MUST write your ENTIRE response in ${targetLang} language.`
      : '';

  switch (task) {
    case 'parse_search':
      return {
        system:
          'You are an AI real estate search parser for India. Extract search parameters into raw JSON with fields: city (string), locality (string), purpose ("Sale" or "Rent"), bedrooms (number), max_price (number in INR), property_type (string). Return ONLY valid JSON, no markdown code blocks.',
        user: `Parse this natural language property search query into JSON: "${p.query ?? p.q ?? ''}"`,
      };

    case 'market_insights':
      return {
        system: `You are an Indian real estate market analyst. Generate concise market insights for a city/locality. Include average price per sqft, 1-year appreciation estimate, top infrastructure advantages, and rental yield percentage. Bullet points under 150 words.${langSuffix}`,
        user: `Generate market insights for: locality="${p.locality ?? ''}", city="${p.city ?? ''}", property_type="${p.type ?? ''}".`,
      };

    case 'description':
      return {
        system: `You are an expert real estate copywriter. Write a compelling, accurate property description. 120-180 words. Plain text without markdown formatting or bullet points.${langSuffix}`,
        user: `Write a property description for: title="${p.title ?? ''}", type=${p.type ?? ''}, purpose=${p.purpose ?? ''}, bedrooms=${p.bedrooms ?? ''}, bathrooms=${p.bathrooms ?? ''}, area=${p.area ?? ''} sqft, city=${p.city ?? ''}, locality=${p.locality ?? ''}, furnishing=${p.furnishing ?? ''}, amenities=${Array.isArray(p.amenities) ? p.amenities.join(', ') : (p.amenities ?? '')}.`,
      };

    case 'seo':
      return {
        system: `You are an SEO specialist. Write a concise, click-worthy meta description under 160 characters optimized for real estate search. Plain text only.${langSuffix}`,
        user: `Create an SEO meta description for property titled "${p.title ?? ''}" in ${p.locality ?? ''}, ${p.city ?? ''}.`,
      };

    case 'title':
      return {
        system: `You are a real estate listing expert. Generate a catchy, professional property title under 80 characters. Plain text, no quotes.${langSuffix}`,
        user: `Create a listing title for a ${p.purpose ?? ''} ${p.type ?? ''} with ${p.bedrooms ?? ''} BHK in ${p.locality ?? ''}, ${p.city ?? ''}.`,
      };

    case 'lead_summary':
      return {
        system: `You are a CRM AI assistant. Summarize this real estate customer inquiry in 2-3 actionable bullet points for an agent.${langSuffix}`,
        user: `Customer Enquiry: ${JSON.stringify(p)}`,
      };

    case 'email':
      return {
        system: `Write a warm, professional follow-up email to a real estate lead. Plain text without subject line.${langSuffix}`,
        user: `Write an email to ${p.name ?? 'the client'} regarding property "${p.property ?? ''}".`,
      };

    case 'recommend':
      return {
        system: `You are an AI property matchmaker in India. Recommend 3 suitable localities or property configurations based on the user preferences. 3 bullet points, concise text.${langSuffix}`,
        user: `User search preferences: ${String(p.message ?? p.q ?? JSON.stringify(p))}`,
      };

    case 'translate':
      return {
        system:
          'Translate the real estate text accurately into the requested Indian language. Return only the translated text.',
        user: `Translate the following text into ${p.language ?? targetLang}: "${p.text ?? ''}"`,
      };

    case 'chat':
    default:
      return {
        system: `You are RealtyNow's intelligent AI real estate assistant in India. Be concise, friendly, helpful, and accurate. Provide actionable real estate guidance on buying, renting, pricing trends, localities, documentation, and property services. Keep replies under 120 words.${langSuffix}`,
        user: `${p.message ?? p.q ?? JSON.stringify(p)}${p.context ? `\nContext: ${p.context}` : ''}`,
      };
  }
}

export async function callAI(task: AITask, payload: Record<string, unknown>): Promise<string> {
  const customKey = (import.meta.env.VITE_AI_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY) as string | undefined;

  // Direct OpenRouter client-side call if key is present
  if (customKey && customKey.trim().length > 0) {
    try {
      const { system, user } = getSystemAndUserPrompt(task, payload);
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customKey.trim()}`,
          'HTTP-Referer': 'https://realtynow.in',
          'X-Title': 'RealtyNow AI',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.7,
          max_tokens: 600,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content === 'string' && content.trim()) {
          return content.trim();
        }
      }
    } catch {
      /* Fallback to Edge function */
    }
  }

  // Edge Function fallback
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const response = await fetch(`${supabaseUrl}/functions/v1/ai-agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? supabaseKey}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({ task, payload }),
  });

  if (!response.ok) {
    return fallbackAIResponse(task, payload);
  }

  const data = (await response.json()) as AIResponse;
  return data.result || fallbackAIResponse(task, payload);
}

function fallbackAIResponse(task: AITask, payload: Record<string, unknown>): string {
  const currentLangCode = localStorage.getItem('realtynow_language') || i18n.language || 'en';
  const isHindi = currentLangCode === 'hi';
  const isTelugu = currentLangCode === 'te';
  const isTamil = currentLangCode === 'ta';

  switch (task) {
    case 'parse_search':
      return JSON.stringify({ purpose: 'Sale', max_price: 10000000 });
    case 'market_insights':
      if (isHindi)
        return '• औसत दर: ₹6,500 - ₹9,200 प्रति वर्ग फुट\n• वार्षिक मूल्य वृद्धि: 12% - 15%\n• किराया उपज: 3.8% प्रति वर्ष';
      if (isTelugu)
        return '• సగటు ధర: చదరపు అడుగుకి ₹6,500 - ₹9,200\n• వార్షిక పెరుగుదల: 12% - 15%\n• అద్దె ఆదాయం: సంవత్సరానికి 3.8%';
      if (isTamil)
        return '• சராசரி விலை: ச.அடிக்கு ₹6,500 - ₹9,200\n• ஆண்டு உயர்வு: 12% - 15%\n• வாடகை வருவாய்: ஆண்டுக்கு 3.8%';
      return '• Avg Rate: ₹6,500 - ₹9,200 per sqft\n• 1-Year Appreciation: 12% - 15%\n• Rental Yield: 3.8% per annum';
    case 'recommend':
      if (isHindi)
        return '1. गचीबोवली / हाईटेक सिटी: आईटी हब और उत्कृष्ट कनेक्टिविटी\n2. कोंडापुर: परिवारों के लिए प्रीमियम गेटेड सोसायटी\n3. तेल्लापुर: तेजी से बढ़ती निवेश संपत्ति';
      if (isTelugu)
        return '1. గచ్చిబౌలి / హైటెక్ సిటీ: ఐటీ హబ్ మరియు అద్భుతమైన రోడ్డు నెట్‌వర్క్\n2. కొండాపూర్: కుటుంబాలకు ప్రీమియం గేటెడ్ విల్లాలు\n3. తెల్లాపూర్: వేగంగా పెరుగుతున్న రియల్ ఎస్టేట్ ప్రాంతం';
      return '1. Gachibowli / HITEC City: IT hub with excellent road network\n2. Kondapur: Premium gated communities for families\n3. Tellapur: Rapidly appreciating investment area';
    case 'chat':
    default:
      if (isHindi)
        return 'नमस्ते! मैं RealtyNow एआई सहायक हूँ। मैं आपकी संपत्ति खोजने, बाजार दरों, लोन गणना और साइट विजिट बुकिंग में मदद कर सकता हूँ।';
      if (isTelugu)
        return 'నమస్కారం! నేను RealtyNow AI సహాయకుడిని. మీకు అనుకూలమైన ఆస్తిని వెతకడంలో, మార్కెట్ ధరలు తెలుసుకోవడంలో మరియు సైట్ విజిట్ బుక్ చేయడంలో సహాయపడతాను.';
      if (isTamil)
        return 'வணக்கம்! நான் RealtyNow AI உதவியாளன். சிறந்த வீடுகளை கண்டறியவும், சந்தை விலைகளை அறியவும் உங்களுக்கு உதவுகிறேன்.';
      return "Hello! I'm RealtyNow's AI property assistant. I can help you search properties, compare market rates, calculate loan EMIs, and schedule site visits across India.";
  }
}
