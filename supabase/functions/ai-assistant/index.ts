import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';

interface AIRequestBody {
  task: 'description' | 'seo' | 'title' | 'chat' | 'lead_summary' | 'email' | 'translate' | 'recommend';
  payload: Record<string, unknown>;
}

function buildPrompt(task: string, payload: Record<string, unknown>): { system: string; user: string } {
  const p = payload;
  switch (task) {
    case 'description': {
      return {
        system:
          'You are an expert real estate copywriter. Write compelling, accurate property descriptions. 120-180 words. No markdown. Plain text.',
        user: `Write a property description for: title="${p.title ?? ''}", type=${p.type ?? ''}, purpose=${p.purpose ?? ''}, bedrooms=${p.bedrooms ?? ''}, bathrooms=${p.bathrooms ?? ''}, area=${p.area ?? ''} sqft, city=${p.city ?? ''}, locality=${p.locality ?? ''}, furnishing=${p.furnishing ?? ''}, amenities=${(p.amenities as string[] | undefined)?.join(', ') ?? ''}.`,
      };
    }
    case 'seo': {
      return {
        system:
          'You are an SEO specialist. Write a concise meta description (max 160 chars) optimized for real estate search.',
        user: `Create an SEO meta description for a property titled "${p.title ?? ''}" in ${p.locality ?? ''}, ${p.city ?? ''}. Include key selling points.`,
      };
    }
    case 'title': {
      return {
        system:
          'You are a real estate listing expert. Generate a catchy, accurate property title under 80 characters. Plain text, no quotes.',
        user: `Create a title for a ${p.purpose ?? ''} ${p.type ?? ''} with ${p.bedrooms ?? ''} BHK in ${p.locality ?? ''}, ${p.city ?? ''}.`,
      };
    }
    case 'chat': {
      return {
        system:
          "You are RealtyNow's friendly AI real estate assistant. Be concise, helpful, and accurate. If the user asks about specific listings, give general real estate advice and suggest searching on the platform. Keep replies under 120 words.",
        user: `${p.message ?? ''}${p.context ? `\nContext: ${p.context}` : ''}`,
      };
    }
    case 'lead_summary': {
      return {
        system: 'Summarize a lead for an agent in 2-3 bullet points. Plain text.',
        user: `Lead details: ${JSON.stringify(p)}`,
      };
    }
    case 'email': {
      return {
        system: 'Write a professional follow-up email to a property lead. Plain text, no subject line.',
        user: `Write an email to ${p.name ?? 'the lead'} about the property "${p.property ?? ''}".`,
      };
    }
    case 'translate': {
      return {
        system: 'Translate the text accurately. Return only the translation.',
        user: `Translate to ${p.language ?? 'Hindi'}: ${p.text ?? ''}`,
      };
    }
    case 'recommend': {
      return {
        system: "Suggest 3 property search criteria based on the user's preferences. Plain text, short bullets.",
        user: `Preferences: ${JSON.stringify(p)}`,
      };
    }
    default:
      return { system: 'You are a helpful assistant.', user: String(p.message ?? '') };
  }
}

async function callOpenRouter(system: string, user: string): Promise<string> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    // Graceful fallback when the key isn't configured yet — keeps the app working.
    return fallbackResponse(system, user);
  }
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://realtynow.demo',
      'X-Title': 'RealtyNow AI',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      max_tokens: 600,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Empty AI response');
  return content.trim();
}

function fallbackResponse(system: string, user: string): string {
  // Deterministic placeholder so the UI still works before an API key is added.
  if (system.includes('copywriter')) {
    return `This ${user.match(/type=([^,]+)/)?.[1] ?? 'property'} offers a wonderful opportunity for comfortable living. Located in ${user.match(/locality=([^,]+)/)?.[1]?.trim() ?? 'a prime area'}, it features spacious rooms, modern amenities, and excellent connectivity. A perfect home for families looking for quality and convenience.`;
  }
  if (system.includes('SEO')) {
    const title = user.match(/"([^"]+)"/)?.[1] ?? 'Property';
    return `${title} — premium real estate listing with great amenities and prime location. Book a visit today.`.slice(
      0,
      160,
    );
  }
  if (system.includes('title')) {
    const bedrooms = user.match(/(\d+)\s*BHK/)?.[1] ?? '3';
    const locality = user.match(/in ([^,]+),/)?.[1] ?? 'Prime Location';
    return `${bedrooms}BHK Apartment in ${locality} — Modern & Spacious`;
  }
  if (system.includes('real estate assistant')) {
    return "I'd be happy to help with that! You can use the search filters on RealtyNow to find properties that match your needs. Try filtering by city, budget, and bedrooms. If you'd like personalized recommendations, sign up and our AI will suggest listings based on your activity.";
  }
  return 'AI response unavailable. Please configure the OpenRouter API key to enable full AI features.';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional auth check (soft): pull user id if token present, don't block anon
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const body = (await req.json()) as AIRequestBody;
    if (!body?.task || !body?.payload) {
      return new Response(JSON.stringify({ error: 'Missing task or payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { system, user } = buildPrompt(body.task, body.payload);
    const result = await callOpenRouter(system, user);

    // Log activity (best-effort)
    if (userId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          action: `ai_${body.task}`,
          entity: 'ai',
          metadata: { task: body.task },
        })
        .then(
          () => {},
          () => {},
        );
    }

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'AI request failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
