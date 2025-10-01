import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GLOO_CLIENT_ID');
  const clientSecret = Deno.env.get('GLOO_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Gloo credentials not configured');
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch('https://platform.ai.gloo.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=api/access',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Auth error:', response.status, errorText);
    throw new Error('Failed to authenticate with Gloo AI');
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, verseReference } = await req.json();

    console.log('Generating devotional for:', { topic, verseReference });

    const token = await getAccessToken();

    const prompt = verseReference
      ? `Create an inspiring daily devotional based on ${verseReference}. Include: 1) A brief reflection on the verse's meaning, 2) How it applies to daily life, 3) A practical action step, and 4) A closing prayer. Keep it concise and encouraging (about 300-400 words).`
      : `Create an inspiring daily devotional about ${topic || 'finding peace in difficult times'}. Include: 1) A relevant Bible verse, 2) A reflection on its meaning, 3) How it applies to daily life, 4) A practical action step, and 5) A closing prayer. Keep it concise and encouraging (about 300-400 words).`;

    const response = await fetch('https://platform.ai.gloo.com/ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        messages: [
          {
            role: 'system',
            content: 'You are a thoughtful Christian devotional writer who creates inspiring, biblically-grounded daily devotionals that help people connect their faith to everyday life.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gloo API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate devotional' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const devotional = data.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({ devotional }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in gloo-devotional:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
