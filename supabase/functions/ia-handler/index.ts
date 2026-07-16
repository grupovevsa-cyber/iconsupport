// ============================================================
// Edge Function: ia-handler
// Bot-Técnico IA con Google Gemini Flash 2.0
// Atiende consultas fuera de horario hábil
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY   = Deno.env.get('GEMINI_API_KEY')!

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Palabras clave que indican que el usuario quiere crear un ticket
const INTENCIONES_TICKET = [
  'crear ticket', 'abrir ticket', 'nuevo ticket', 'reportar', 'falla', 'problema grave',
  'no funciona nada', 'urgente', 'ayuda urgente', 'soporte urgente'
]

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { sesion, pregunta, config } = await req.json()
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  try {
    // 1. Obtener historial reciente (últimos 10 mensajes para contexto)
    const { data: historial } = await supabase
      .from('whatsapp_mensajes')
      .select('rol, contenido, creado_en')
      .eq('sesion_id', sesion.id)
      .order('creado_en', { ascending: false })
      .limit(10)

    const mensajesOrdenados = (historial || []).reverse()

    // 2. Construir prompt de sistema
    const systemPrompt = config.ia_system_prompt ||
      `Eres el asistente técnico virtual de ICON Support. Tu nombre es "Soporte IA". 
Ayudas a clientes con problemas de TI de forma concisa, amable y profesional en español.
Reglas:
- Responde siempre en español
- Sé conciso (máximo 3 párrafos)
- Si el problema requiere intervención física o no puedes resolverlo remotamente, 
  di exactamente: "CREAR_TICKET" al inicio de tu respuesta, seguido de tu explicación
- Siempre finaliza sugiriendo escribir "menu" para ver las opciones del menú
- No inventes información sobre precios o compromisos de la empresa
- Estás fuera del horario de atención (horario: lunes-viernes 8am-6pm)`

    // 3. Construir messages para Gemini
    const contents = [
      // Historial como contexto
      ...mensajesOrdenados.map((m: any) => ({
        role: m.rol === 'user' ? 'user' : 'model',
        parts: [{ text: m.contenido }],
      })),
      // Pregunta actual
      { role: 'user', parts: [{ text: pregunta }] },
    ]

    // 4. Llamar a Gemini
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0.4,
          topP: 0.85,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    })

    const geminiData = await geminiRes.json()

    if (!geminiRes.ok || geminiData.error) {
      throw new Error(geminiData.error?.message || 'Error en Gemini API')
    }

    let respuestaIA = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Lo siento, no pude procesar tu consulta. Por favor escribe *menu* para ver las opciones.'

    // 5. Detectar intención de crear ticket
    const debeCrearTicket =
      respuestaIA.startsWith('CREAR_TICKET') ||
      INTENCIONES_TICKET.some(kw => pregunta.toLowerCase().includes(kw))

    if (debeCrearTicket) {
      // Limpiar el marcador CREAR_TICKET del texto
      respuestaIA = respuestaIA.replace(/^CREAR_TICKET\s*/i, '')

      // Crear ticket automáticamente fuera de horario
      const { data: perfil } = await supabase
        .from('profiles')
        .select('id')
        .eq('telefono', sesion.telefono)
        .single()

      await supabase.from('tickets').insert({
        titulo: `[IA Bot] ${pregunta.substring(0, 80)}`,
        descripcion: `Ticket creado automáticamente por el Bot-IA fuera de horario.\n\nMensaje del cliente:\n${pregunta}`,
        prioridad: 'media',
        estado: 'abierto',
        categoria: 'soporte',
        cliente_id: perfil?.id || null,
        origen: 'whatsapp_ia',
      })

      respuestaIA += '\n\n🎫 *He creado un ticket de soporte automáticamente.* Un agente lo revisará en el próximo horario hábil (Lunes-Viernes 8am-6pm).'
    }

    // 6. Añadir footer estándar fuera de horario si no lo tiene
    if (!respuestaIA.includes('menu') && !debeCrearTicket) {
      respuestaIA += '\n\n_Escribe *menu* para ver las opciones del menú._'
    }

    return new Response(
      JSON.stringify({ ok: true, respuesta: respuestaIA }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('ia-handler error:', err)
    const fallback = '🤖 El asistente de IA no está disponible en este momento.\n\nEscribe *menu* para las opciones del menú o contáctanos en el horario de atención: Lunes-Viernes 8am-6pm.'
    return new Response(
      JSON.stringify({ ok: false, respuesta: fallback, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
