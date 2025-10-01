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
    const { query, chatId } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Chat request:', { query, chatId });

    const token = await getAccessToken();

    const payload: any = {
      query,
      character_limit: 1000,
      sources_limit: 5,
      stream: false,
      publishers: [],
      enable_suggestions: 1,
    };

    if (chatId) {
      payload.chat_id = chatId;
    }

    const response = await fetch('https://platform.ai.gloo.com/ai/v1/message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gloo API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        chatId: data.chat_id,
        messageId: data.message_id,
        message: data.message,
        suggestions: data.suggestions || [],
        sources: data.sources || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in gloo-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
