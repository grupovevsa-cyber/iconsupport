// ============================================================
// Edge Function: enviar-whatsapp
// Helper centralizado para enviar mensajes via Meta Cloud API
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const WA_TOKEN    = Deno.env.get('WHATSAPP_TOKEN')!
const PHONE_ID    = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
const META_URL    = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { to, tipo, ...payload } = await req.json()

    if (!to) throw new Error('Falta el campo "to" (número de WhatsApp)')

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
        Authorization: `Bearer ${WA_TOKEN}`,
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
