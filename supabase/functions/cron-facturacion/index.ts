import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Inicializar cliente Supabase usando service_role_key para saltar RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Buscar empresas cuyo vencimiento sea HOY o en exactamente 7 DIAS
    const hoy = new Date()
    const hoyStr = hoy.toISOString().split('T')[0] // YYYY-MM-DD
    
    const sieteDias = new Date(hoy)
    sieteDias.setDate(sieteDias.getDate() + 7)
    const sieteDiasStr = sieteDias.toISOString().split('T')[0]

    const { data: empresas, error } = await supabaseClient
      .from('empresas_saas')
      .select(`
        id,
        nombre,
        plan,
        activa,
        fecha_vencimiento,
        monto_mensual,
        payment_link,
        profiles!inner(id, nombre, email, telefono, rol)
      `)
      .in('fecha_vencimiento', [hoyStr, sieteDiasStr])
      .eq('profiles.rol', 'admin') // Traer solo a los admins
      .eq('activa', true)

    if (error) throw error

    let notificacionesEnviadas = 0

    // 2. Procesar cada empresa
    for (const empresa of (empresas || [])) {
      const admin = empresa.profiles[0] // El administrador principal
      if (!admin) continue

      const esHoy = empresa.fecha_vencimiento === hoyStr
      const linkPago = empresa.payment_link || 'https://www.paguelofacil.com/link-default' // Asegúrate de generar el link si no existe
      
      const mensaje = esHoy 
        ? `🚨 URGENTE: El plan ${empresa.plan} de ${empresa.nombre} VENCE HOY. Por favor, realiza el pago de $${empresa.monto_mensual} para evitar la suspensión del servicio. Paga aquí: ${linkPago}`
        : `👋 Hola ${admin.nombre}, te recordamos que el plan de ${empresa.nombre} vencerá en 7 días (${sieteDiasStr}). Puedes renovarlo realizando el pago de $${empresa.monto_mensual} aquí: ${linkPago}`;

      console.log(`Enviando a ${admin.email} / ${admin.telefono}:`, mensaje)

      // Aquí puedes integrar la API de Resend para correo o Twilio/Meta para WhatsApp
      // Ejemplo seudo-código Resend:
      /*
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'facturacion@iconsupport.com',
          to: admin.email,
          subject: esHoy ? 'Vencimiento de Suscripción HOY' : 'Aviso de Renovación en 7 Días',
          text: mensaje
        })
      })
      */

      notificacionesEnviadas++
    }

    return new Response(
      JSON.stringify({ 
        message: 'Cron de facturación ejecutado', 
        notificacionesEnviadas,
        empresas_procesadas: empresas?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
