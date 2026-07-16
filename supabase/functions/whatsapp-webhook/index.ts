// ============================================================
// Edge Function: whatsapp-webhook
// Punto de entrada principal del bot de WhatsApp
// Maneja: verificación de Meta + recepción de mensajes
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VERIFY_TOKEN = Deno.env.get('WEBHOOK_VERIFY_TOKEN') || 'iconsupport_bot_2025'

serve(async (req: Request) => {
  const url = new URL(req.url)

  // ── GET: Verificación del webhook por Meta ──────────────
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode')
    const token     = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verificado por Meta')
      return new Response(challenge, { status: 200 })
    }
    return new Response('Token inválido', { status: 403 })
  }

  // ── POST: Recepción de mensajes ─────────────────────────
  if (req.method === 'POST') {
    try {
      const body = await req.json()

      // Extraer datos del mensaje
      const entry   = body?.entry?.[0]
      const changes = entry?.changes?.[0]
      const value   = changes?.value

      // Ignorar status updates (delivered, read, etc.)
      if (!value?.messages || value.messages.length === 0) {
        return new Response('OK', { status: 200 })
      }

      const message    = value.messages[0]
      const from       = message.from        // número del remitente
      const msgId      = message.id
      const timestamp  = message.timestamp

      // Solo procesar mensajes de texto e interactivos
      let texto = ''
      if (message.type === 'text') {
        texto = message.text?.body?.trim() || ''
      } else if (message.type === 'interactive') {
        texto = message.interactive?.button_reply?.id ||
                message.interactive?.list_reply?.id || ''
      } else if (message.type === 'image') {
        texto = '__imagen__'
      } else {
        // Tipo no soportado: ignorar silenciosamente
        return new Response('OK', { status: 200 })
      }

      if (!texto) return new Response('OK', { status: 200 })

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

      // Nombre del contacto (si viene en los metadata)
      const contactName = value?.contacts?.[0]?.profile?.name || null

      // Llamar al handler principal de forma asíncrona
      // (no esperamos para responder rápido a Meta — timeout de 20s)
      EdgeRuntime.waitUntil(
        procesarMensaje(supabase, from, texto, contactName, msgId)
      )

      return new Response('OK', { status: 200 })
    } catch (err) {
      console.error('Error en webhook:', err)
      return new Response('OK', { status: 200 }) // siempre 200 para Meta
    }
  }

  return new Response('Method Not Allowed', { status: 405 })
})

// ── Procesamiento principal del mensaje ─────────────────────
async function procesarMensaje(
  supabase: any,
  telefono: string,
  texto: string,
  nombre: string | null,
  msgId: string
) {
  try {
    // 1. Obtener o crear sesión
    let { data: sesion } = await supabase
      .from('whatsapp_sesiones')
      .select('*')
      .eq('telefono', telefono)
      .single()

    if (!sesion) {
      const { data: nueva } = await supabase
        .from('whatsapp_sesiones')
        .insert({ telefono, nombre, estado: 'menu', datos_temp: {} })
        .select()
        .single()
      sesion = nueva
    } else if (nombre && !sesion.nombre) {
      await supabase.from('whatsapp_sesiones').update({ nombre }).eq('id', sesion.id)
      sesion.nombre = nombre
    }

    // 2. Actualizar último mensaje
    await supabase
      .from('whatsapp_sesiones')
      .update({ ultimo_mensaje: new Date().toISOString() })
      .eq('id', sesion.id)

    // 3. Registrar mensaje del usuario
    await supabase.from('whatsapp_mensajes').insert({
      sesion_id: sesion.id,
      rol: 'user',
      contenido: texto,
    })

    // 4. Verificar si está en horario hábil
    const config = await obtenerConfig(supabase)
    const enHorario = estaEnHorario(config)

    // 5. Llamar al handler correcto
    const { data: handlerResp, error } = await supabase.functions.invoke('whatsapp-handler', {
      body: { sesion, texto, config, enHorario },
    })

    if (error) throw error

    // 6. Registrar respuesta del bot
    if (handlerResp?.respuesta) {
      await supabase.from('whatsapp_mensajes').insert({
        sesion_id: sesion.id,
        rol: 'bot',
        contenido: typeof handlerResp.respuesta === 'string'
          ? handlerResp.respuesta
          : JSON.stringify(handlerResp.respuesta),
      })
    }
  } catch (err) {
    console.error('Error procesando mensaje:', err)
  }
}

// ── Helpers ─────────────────────────────────────────────────
async function obtenerConfig(supabase: any) {
  const { data } = await supabase.from('bot_config').select('*').single()
  return data || {}
}

function estaEnHorario(config: any): boolean {
  const ahora = new Date()
  const dia = ahora.getDay() // 0=dom, 1=lun...
  const diasHabiles: number[] = config.dias_habiles || [1, 2, 3, 4, 5]
  if (!diasHabiles.includes(dia)) return false

  const [hInicio, mInicio] = (config.horario_inicio || '08:00').split(':').map(Number)
  const [hFin, mFin]       = (config.horario_fin    || '18:00').split(':').map(Number)
  const minutosAhora  = ahora.getHours() * 60 + ahora.getMinutes()
  const minutosInicio = hInicio * 60 + mInicio
  const minutosFin    = hFin   * 60 + mFin

  return minutosAhora >= minutosInicio && minutosAhora < minutosFin
}
