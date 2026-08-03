// ============================================================
// Edge Function: enviar-whatsapp
// Helper centralizado para enviar mensajes via Meta Cloud API
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const FALLBACK_WA_TOKEN = Deno.env.get('WHATSAPP_TOKEN')!
const FALLBACK_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { to, tipo, empresa_id, ...payload } = await req.json()

    if (!to) throw new Error('Falta el campo "to" (número de WhatsApp)')

    let waToken = FALLBACK_WA_TOKEN
    let phoneId = FALLBACK_PHONE_ID

    if (empresa_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      const { data: config } = await supabase
        .from('bot_config')
        .select('whatsapp_token, whatsapp_phone_id')
        .eq('empresa_id', empresa_id)
        .single()
      
      if (config && config.whatsapp_token && config.whatsapp_phone_id) {
        waToken = config.whatsapp_token
        phoneId = config.whatsapp_phone_id
      }
    }

    const META_URL = `https://graph.facebook.com/v20.0/${phoneId}/messages`

    let body: Record<string, unknown>

    switch (tipo) {
      // ── Texto simple ────────────────────────────────────
      case 'texto':
        body = {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: payload.mensaje, preview_url: false },
        }
        break

      // ── Botones interactivos (máx 3 botones) ───────────
      case 'botones':
        body = {
          messaging_product: 'whatsapp',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            header: payload.header ? { type: 'text', text: payload.header } : undefined,
            body: { text: payload.mensaje },
            footer: payload.footer ? { text: payload.footer } : undefined,
            action: {
              buttons: (payload.botones as { id: string; titulo: string }[]).map(b => ({
                type: 'reply',
                reply: { id: b.id, title: b.titulo.substring(0, 20) },
              })),
            },
          },
        }
        break

      // ── Lista de opciones (menú) ────────────────────────
      case 'lista':
        body = {
          messaging_product: 'whatsapp',
          to,
          type: 'interactive',
          interactive: {
            type: 'list',
            header: payload.header ? { type: 'text', text: payload.header } : undefined,
            body: { text: payload.mensaje },
            footer: payload.footer ? { text: payload.footer } : undefined,
            action: {
              button: payload.boton_lista || 'Ver opciones',
              sections: payload.secciones,
            },
          },
        }
        break

      // ── Imagen con caption ──────────────────────────────
      case 'imagen':
        body = {
          messaging_product: 'whatsapp',
          to,
          type: 'image',
          image: {
            link: payload.url,
            caption: payload.caption || '',
          },
        }
        break

      // ── Documento/PDF ───────────────────────────────────
      case 'documento':
        body = {
          messaging_product: 'whatsapp',
          to,
          type: 'document',
          document: {
            link: payload.url,
            filename: payload.nombre || 'reporte.pdf',
            caption: payload.caption || '',
          },
        }
        break

      default:
        throw new Error(`Tipo de mensaje no soportado: ${tipo}`)
    }

    // Enviar a Meta
    const res = await fetch(META_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${waToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(`Meta API error: ${JSON.stringify(data)}`)
    }

    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('enviar-whatsapp error:', err.message)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
