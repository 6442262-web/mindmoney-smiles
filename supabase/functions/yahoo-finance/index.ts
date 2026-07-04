import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, symbol } = await req.json();

    if (action === 'search') {
      // Search for symbols
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=8&newsCount=0&listsCount=0`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      
      if (!res.ok) {
        throw new Error(`Yahoo search failed: ${res.status}`);
      }
      
      const data = await res.json();
      const quotes = (data.quotes || []).map((q: {
        symbol: string;
        shortname?: string;
        longname?: string;
        quoteType?: string;
        exchange?: string;
      }) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType,
        exchange: q.exchange,
      }));

      return new Response(JSON.stringify({ quotes }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'quote') {
      // Get current price for a symbol
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (!res.ok) {
        throw new Error(`Yahoo quote failed: ${res.status}`);
      }

      const data = await res.json();
      const result = data.chart?.result?.[0];
      const meta = result?.meta;

      return new Response(JSON.stringify({
        symbol: meta?.symbol,
        name: meta?.shortName || meta?.longName || symbol,
        price: meta?.regularMarketPrice || 0,
        previousClose: meta?.previousClose || 0,
        currency: meta?.currency || 'USD',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Yahoo Finance error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
