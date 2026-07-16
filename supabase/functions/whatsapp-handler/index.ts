// ============================================================
// Edge Function: whatsapp-handler
// Máquina de estados: procesa el mensaje y decide la respuesta
// Estados: menu | crear_ticket_titulo | crear_ticket_desc |
//          crear_ticket_prioridad | seguimiento | servicio |
//          tarea_tecnico | tarea_desc | ia_libre
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { sesion, texto, config, enHorario } = await req.json()
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)
  const telefono = sesion.telefono

  try {
    let respuesta: string
    let nuevoEstado = sesion.estado
    let nuevosDatos = { ...sesion.datos_temp }

    const t = texto.trim()
    const tLow = t.toLowerCase()

    // ── Comando global: reiniciar o ir al menú ──────────────
    if (['menu', 'inicio', 'hola', 'hi', '00', 'reiniciar'].some(c => tLow === c)) {
      nuevoEstado = 'menu'
      nuevosDatos = {}
    }

    // ── Máquina de estados ──────────────────────────────────
    switch (nuevoEstado) {

      // ── MENÚ PRINCIPAL ─────────────────────────────────────
      case 'menu': {
        // Si fuera de horario y IA activa → modo libre
        if (!enHorario && config.modo_ia_activo) {
          nuevoEstado = 'ia_libre'
          const iaResp = await invocarIA(supabase, sesion, t, config)
          respuesta = iaResp
          break
        }

        const nombreUsuario = sesion.nombre ? `, *${sesion.nombre}*` : ''
        respuesta = config.mensaje_bienvenida ||
          `¡Hola${nombreUsuario}! 👋 Bienvenido a *ICON Support*. ¿En qué puedo ayudarte?\n\n` +
          `*1️⃣* Crear ticket de soporte\n` +
          `*2️⃣* Dar seguimiento a un ticket\n` +
          `*3️⃣* Solicitar servicio técnico urgente\n` +
          `*4️⃣* Asignar tarea a técnico\n` +
          `*0️⃣* Hablar con un agente\n\n` +
          `Escribe el número de tu opción ✍️`

        switch (t) {
          case '1': nuevoEstado = 'crear_ticket_titulo'; respuesta = '📋 *Crear Ticket de Soporte*\n\nPor favor escribe el *título* o tema principal del problema:'; break
          case '2': nuevoEstado = 'seguimiento'; respuesta = '🔍 *Seguimiento de Ticket*\n\nEscribe el *número de folio* de tu ticket (ej: ABC12345) o tu *correo electrónico* para buscarlo:'; break
          case '3': nuevoEstado = 'servicio_desc'; respuesta = '🚨 *Solicitar Servicio Técnico*\n\nDescribe el problema técnico que necesitas atender *con urgencia*:'; break
          case '4': nuevoEstado = 'tarea_tecnico'; respuesta = '📌 *Asignar Tarea a Técnico*\n\nEscribe el *nombre o número* del técnico (o escribe "cualquiera" para asignar al disponible):'; break
          case '0': nuevoEstado = 'menu'; respuesta = '👤 En este momento un agente estará disponible en breve. También puedes escribirnos al portal: https://iconsupport.vercel.app\n\nEscribe *menu* para volver.'; break
          default:
            // No reconocido: reenviar el menú
            break
        }
        break
      }

      // ── CREAR TICKET: Paso 1 — Título ──────────────────────
      case 'crear_ticket_titulo': {
        if (t.length < 5) {
          respuesta = '⚠️ El título es muy corto. Por favor describe mejor el problema (mín. 5 caracteres):'
        } else {
          nuevosDatos.titulo = t
          nuevoEstado = 'crear_ticket_desc'
          respuesta = `✅ Título: _"${t}"_\n\nAhora describe el problema con más detalle:`
        }
        break
      }

      // ── CREAR TICKET: Paso 2 — Descripción ─────────────────
      case 'crear_ticket_desc': {
        nuevosDatos.descripcion = t
        nuevoEstado = 'crear_ticket_prioridad'
        respuesta = '🎯 ¿Cuál es la *prioridad* del problema?\n\n*1* Alta — Sistema caído, no puedo trabajar\n*2* Media — Funciona parcialmente\n*3* Baja — Consulta o mejora'
        break
      }

      // ── CREAR TICKET: Paso 3 — Prioridad y Creación ────────
      case 'crear_ticket_prioridad': {
        const prioridadMap: Record<string, string> = { '1': 'alta', '2': 'media', '3': 'baja' }
        const prioridad = prioridadMap[t] || 'media'

        // Buscar cliente por teléfono
        const { data: perfil } = await supabase
          .from('profiles')
          .select('id, nombre')
          .eq('telefono', telefono)
          .single()

        const { data: ticket, error } = await supabase
          .from('tickets')
          .insert({
            titulo: nuevosDatos.titulo,
            descripcion: nuevosDatos.descripcion,
            prioridad,
            estado: 'abierto',
            categoria: 'soporte',
            cliente_id: perfil?.id || null,
            origen: 'whatsapp',
          })
          .select('id')
          .single()

        if (error || !ticket) {
          respuesta = '❌ Hubo un error al crear el ticket. Por favor intenta nuevamente escribiendo *menu*.'
        } else {
          const folio = ticket.id.substring(0, 8).toUpperCase()
          respuesta =
            `✅ *¡Ticket creado exitosamente!*\n\n` +
            `📋 *Folio:* \`${folio}\`\n` +
            `📝 *Tema:* ${nuevosDatos.titulo}\n` +
            `🎯 *Prioridad:* ${prioridad.charAt(0).toUpperCase() + prioridad.slice(1)}\n\n` +
            `Guarda tu folio para dar seguimiento. Un agente te contactará pronto.\n\n` +
            `Escribe *menu* para volver al inicio o *2* para ver el estado de este ticket.`
          nuevoEstado = 'menu'
          nuevosDatos = {}
        }
        break
      }

      // ── SEGUIMIENTO ─────────────────────────────────────────
      case 'seguimiento': {
        let ticket = null

        // Buscar por folio (primeros 8 chars del UUID)
        if (t.length === 8 && /^[A-Za-z0-9]+$/.test(t)) {
          const { data } = await supabase
            .from('tickets')
            .select('id, titulo, estado, prioridad, creado_en, tecnico:profiles!tickets_tecnico_asignado_id_fkey(nombre)')
            .ilike('id', `${t}%`)
            .single()
          ticket = data
        }

        // Buscar por email del cliente
        if (!ticket && t.includes('@')) {
          const { data: perfil } = await supabase.from('profiles').select('id').eq('email', t).single()
          if (perfil) {
            const { data } = await supabase
              .from('tickets')
              .select('id, titulo, estado, prioridad, creado_en')
              .eq('cliente_id', perfil.id)
              .order('creado_en', { ascending: false })
              .limit(3)
            if (data && data.length > 0) {
              const lista = data.map((tk: any) =>
                `• *${tk.id.substring(0, 8).toUpperCase()}* — ${tk.titulo.substring(0, 30)} (${estadoEmoji(tk.estado)} ${tk.estado})`
              ).join('\n')
              respuesta = `📋 *Tus últimos tickets:*\n\n${lista}\n\nEscribe el folio para más detalle o *menu* para volver.`
              nuevoEstado = 'menu'
              break
            }
          }
        }

        if (ticket) {
          const tecnicoNombre = (ticket as any).tecnico?.nombre || 'Sin asignar'
          respuesta =
            `📋 *Detalle del Ticket*\n\n` +
            `🔖 Folio: \`${ticket.id.substring(0, 8).toUpperCase()}\`\n` +
            `📝 Tema: ${ticket.titulo}\n` +
            `${estadoEmoji(ticket.estado)} Estado: *${ticket.estado.replace('_', ' ')}*\n` +
            `🎯 Prioridad: ${ticket.prioridad}\n` +
            `👨‍🔧 Técnico: ${tecnicoNombre}\n` +
            `📅 Creado: ${new Date(ticket.creado_en).toLocaleDateString('es-MX')}\n\n` +
            `Escribe *menu* para volver al inicio.`
          nuevoEstado = 'menu'
        } else {
          respuesta = '❌ No encontré ningún ticket con ese folio o correo. Verifica el dato e intenta nuevamente, o escribe *menu* para volver.'
        }
        break
      }

      // ── SERVICIO TÉCNICO URGENTE ────────────────────────────
      case 'servicio_desc': {
        // Buscar cliente
        const { data: perfil } = await supabase
          .from('profiles').select('id').eq('telefono', telefono).single()

        const { data: ticket } = await supabase
          .from('tickets')
          .insert({
            titulo: `[URGENTE] Servicio técnico desde WhatsApp`,
            descripcion: t,
            prioridad: 'alta',
            estado: 'abierto',
            categoria: 'servicio_tecnico',
            cliente_id: perfil?.id || null,
            origen: 'whatsapp',
          })
          .select('id')
          .single()

        const folio = ticket?.id.substring(0, 8).toUpperCase() || 'ERROR'
        respuesta =
          `🚨 *¡Solicitud de servicio recibida!*\n\n` +
          `📋 Folio: \`${folio}\`\n` +
          `⚡ Prioridad: *ALTA*\n\n` +
          `Un técnico se pondrá en contacto contigo a la brevedad posible.\n\n` +
          `Escribe *menu* para volver.`
        nuevoEstado = 'menu'
        nuevosDatos = {}
        break
      }

      // ── ASIGNAR TAREA: Paso 1 — Técnico ────────────────────
      case 'tarea_tecnico': {
        if (tLow === 'cualquiera') {
          nuevosDatos.tecnico_nombre = 'cualquiera'
          nuevosDatos.tecnico_id = null
        } else {
          const { data: tecnico } = await supabase
            .from('profiles')
            .select('id, nombre')
            .eq('rol', 'tecnico')
            .ilike('nombre', `%${t}%`)
            .single()

          if (!tecnico) {
            respuesta = `❌ No encontré un técnico con ese nombre. Escribe "cualquiera" para asignar al próximo disponible, o intenta con otro nombre:`
            break
          }
          nuevosDatos.tecnico_id = tecnico.id
          nuevosDatos.tecnico_nombre = tecnico.nombre
        }
        nuevoEstado = 'tarea_desc'
        respuesta = `✅ Técnico: *${nuevosDatos.tecnico_nombre}*\n\nAhora describe la tarea que debe realizarse:`
        break
      }

      // ── ASIGNAR TAREA: Paso 2 — Descripción ────────────────
      case 'tarea_desc': {
        // Buscar ticket activo del cliente
        const { data: perfil } = await supabase
          .from('profiles').select('id').eq('telefono', telefono).single()

        let ticketId = null
        if (perfil) {
          const { data: tk } = await supabase
            .from('tickets')
            .select('id')
            .eq('cliente_id', perfil.id)
            .in('estado', ['abierto', 'en_proceso'])
            .order('creado_en', { ascending: false })
            .limit(1)
            .single()
          ticketId = tk?.id || null
        }

        const { data: tarea } = await supabase
          .from('tareas')
          .insert({
            titulo: t.substring(0, 100),
            descripcion: t,
            tecnico_id: nuevosDatos.tecnico_id || null,
            ticket_id: ticketId,
            estado: 'abierta',
          })
          .select('id')
          .single()

        respuesta =
          `✅ *¡Tarea creada exitosamente!*\n\n` +
          `👨‍🔧 Asignada a: *${nuevosDatos.tecnico_nombre}*\n` +
          `📝 Tarea: ${t.substring(0, 80)}\n\n` +
          `El técnico recibirá la notificación. Escribe *menu* para volver.`
        nuevoEstado = 'menu'
        nuevosDatos = {}
        break
      }

      // ── MODO IA LIBRE (fuera de horario) ────────────────────
      case 'ia_libre': {
        if (!enHorario && config.modo_ia_activo) {
          respuesta = await invocarIA(supabase, sesion, t, config)
        } else {
          nuevoEstado = 'menu'
          respuesta = config.mensaje_bienvenida || '¡Hola! ¿En qué puedo ayudarte?'
        }
        break
      }

      default: {
        nuevoEstado = 'menu'
        respuesta = config.mensaje_bienvenida || '¡Hola! Escribe *menu* para ver las opciones disponibles.'
      }
    }

    // ── Guardar nuevo estado ────────────────────────────────
    await supabase
      .from('whatsapp_sesiones')
      .update({ estado: nuevoEstado, datos_temp: nuevosDatos })
      .eq('id', sesion.id)

    // ── Enviar respuesta por WhatsApp ───────────────────────
    await supabase.functions.invoke('enviar-whatsapp', {
      body: { to: telefono, tipo: 'texto', mensaje: respuesta },
    })

    return new Response(
      JSON.stringify({ ok: true, respuesta, nuevoEstado }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('whatsapp-handler error:', err)
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ── Invocar IA (Gemini Flash) ───────────────────────────────
async function invocarIA(supabase: any, sesion: any, texto: string, config: any): Promise<string> {
  try {
    const { data: respIA } = await supabase.functions.invoke('ia-handler', {
      body: { sesion, pregunta: texto, config },
    })
    return respIA?.respuesta || '🤖 El asistente de IA no está disponible en este momento. Escribe *menu* para ver las opciones.'
  } catch {
    return '🤖 Estoy en modo fuera de horario. Tu mensaje fue registrado. Escribe *menu* para las opciones del menú o espera el horario de atención.'
  }
}

// ── Emoji por estado ────────────────────────────────────────
function estadoEmoji(estado: string): string {
  const map: Record<string, string> = { abierto: '🔴', en_proceso: '🟡', cerrado: '🟢' }
  return map[estado] || '⚪'
}
