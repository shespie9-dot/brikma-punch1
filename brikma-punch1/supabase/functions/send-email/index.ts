// Supabase Edge Function — envoi de courriels via Resend
//
// CONFIGURATION REQUISE dans Supabase Dashboard > Project Settings > Edge Functions > Secrets :
//   RESEND_API_KEY  → votre clé API Resend (ex: re_xxxxxxxxxxxx)
//   RESEND_FROM     → adresse expéditeur vérifiée (ex: "Brikma Construction <info@brikma.com>")
//
// LIMITATION DOMAINE Resend :
//   Si vous n'avez pas de domaine vérifié, utilisez : onboarding@resend.dev
//   (les courriels arrivent uniquement à l'adresse du compte Resend en mode test)
//   Pour envoyer à n'importe quelle adresse, vérifiez votre domaine sur resend.com/domains

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html } = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants: to, subject, html requis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY non configuré dans les secrets Supabase' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Si RESEND_FROM n'est pas défini, utilise onboarding@resend.dev (test seulement)
    const from = Deno.env.get('RESEND_FROM') || 'Brikma Construction <onboarding@resend.dev>'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: res.status }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
