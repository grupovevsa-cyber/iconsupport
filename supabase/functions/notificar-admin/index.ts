import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ticket } = await req.json()
    if (!ticket) {
      throw new Error('Falta el ticket')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Obtener configuración del bot (para sacar teléfono y correo de la empresa)
    const { data: config } = await supabase.from('bot_config').select('*').limit(1).single()
    if (!config) throw new Error('No se encontró configuración')

    const numeroAdmin = config.empresa_telefono
    const emailAdmin = config.empresa_email
    
    // Obtener detalles del cliente
    const { data: cliente } = await supabase.from('profiles').select('nombre, email').eq('id', ticket.cliente_id).single()
    const nombreCliente = cliente?.nombre || 'Desconocido'

    const mensajeAdmin = `🚨 *NUEVO TICKET RECBIDO* 🚨\n\n` +
      `*ID:* TCK-${String(ticket.numero_ticket).padStart(5, '0')}\n` +
      `*Asunto:* ${ticket.titulo}\n` +
      `*Cliente:* ${nombreCliente}\n` +
      `*Prioridad:* ${ticket.prioridad.toUpperCase()}\n\n` +
      `*Descripción:*\n${ticket.descripcion || '-'}\n\n` +
      `📌 *Ver ticket:* ${config.portal_url}/admin/dashboard`

    // 1. Notificar por WhatsApp usando la Edge Function 'enviar-whatsapp'
    if (numeroAdmin) {
      const adminPhone = numeroAdmin.replace(/\D/g, '')
      if (adminPhone.length > 8) {
        // Enviar vía WhatsApp (invocamos de forma segura pasando el mismo token auth)
        await supabase.functions.invoke('enviar-whatsapp', {
          body: {
            to: adminPhone,
            message: mensajeAdmin
          }
        })
      }
    }

    // 2. Notificar por Email usando la Edge Function 'enviar-reporte-email'
    if (emailAdmin) {
      await supabase.functions.invoke('enviar-reporte-email', {
        body: {
          to: emailAdmin,
          subject: `Nuevo Ticket Creado: TCK-${String(ticket.numero_ticket).padStart(5, '0')}`,
          text: mensajeAdmin,
          html: `<p><strong>Nuevo Ticket Recibido</strong></p>
                 <p><strong>ID:</strong> TCK-${String(ticket.numero_ticket).padStart(5, '0')}</p>
                 <p><strong>Asunto:</strong> ${ticket.titulo}</p>
                 <p><strong>Cliente:</strong> ${nombreCliente}</p>
                 <p><strong>Prioridad:</strong> ${ticket.prioridad.toUpperCase()}</p>
                 <p><strong>Descripción:</strong><br/>${ticket.descripcion || '-'}</p>
                 <br/><a href="${config.portal_url}/admin/dashboard">Ver en ICON Support</a>`
        }
      })
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Administrador notificado' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
