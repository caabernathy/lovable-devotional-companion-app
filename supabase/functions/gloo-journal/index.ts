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
    const { action, journalEntry, prompt } = await req.json();

    console.log('Journal request:', { action, hasEntry: !!journalEntry });

    const token = await getAccessToken();

    let systemPrompt = 'You are a compassionate Christian spiritual guide who helps people reflect on their faith journey through journaling. You provide thoughtful, biblically-grounded guidance that encourages deeper spiritual reflection.';
    let userPrompt = '';

    switch (action) {
      case 'reflect':
        if (!journalEntry) {
          return new Response(
            JSON.stringify({ error: 'Journal entry is required for reflection' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        userPrompt = `I've written this journal entry about my faith journey:\n\n"${journalEntry}"\n\nPlease provide thoughtful reflections that help me go deeper. Consider: 1) What spiritual themes or patterns do you notice? 2) What questions might help me reflect further? 3) Are there relevant Bible verses or spiritual practices that might resonate? Keep your response encouraging and concise (200-300 words).`;
        break;

      case 'prompt':
        userPrompt = prompt || 'Give me a meaningful journaling prompt about faith for today. Include: 1) A thought-provoking question or theme, 2) A relevant Bible verse to meditate on, 3) Guidance on what to explore in the journaling. Keep it concise (100-150 words).';
        break;

      case 'prayer':
        if (!journalEntry) {
          return new Response(
            JSON.stringify({ error: 'Journal entry is required to generate prayer' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        userPrompt = `Based on this journal entry:\n\n"${journalEntry}"\n\nWrite a heartfelt prayer that captures the essence of what I've shared. Make it personal, authentic, and grounded in Scripture. (100-150 words)`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: reflect, prompt, or prayer' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

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
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gloo API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate journal assistance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({ result, action }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in gloo-journal:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
