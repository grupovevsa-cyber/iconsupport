// ============================================================
// Edge Function: enviar-reporte-email
// Envía el reporte PDF de visita técnica al email del cliente
// Usa Resend (resend.com — 100 emails/día gratis)
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') || 'soporte@iconsupport.app'
const EMPRESA_NOMBRE = Deno.env.get('VITE_EMPRESA_NOMBRE') || 'ICON Support'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const {
      to,
      cliente_nombre,
      tecnico_nombre,
      ticket_titulo,
      ticket_id,
      pdf_url,
      empresa_nombre,
      supervisor,
    } = await req.json()

    if (!to || !pdf_url) {
      throw new Error('Faltan campos requeridos: to, pdf_url')
    }

    const folio = ticket_id ? ticket_id.substring(0, 8).toUpperCase() : 'N/D'

    // HTML del email
    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Servicio Técnico — ${EMPRESA_NOMBRE}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${EMPRESA_NOMBRE}</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Reporte de Servicio Técnico</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="color:#1e293b;font-size:16px;margin:0 0 8px;">Estimado/a <strong>${cliente_nombre || 'Cliente'}</strong>,</p>
            <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 28px;">
              Le informamos que el servicio técnico asociado a su solicitud ha sido completado satisfactoriamente.
              Adjunto encontrará el reporte detallado del trabajo realizado.
            </p>

            <!-- Detalle -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:28px;">
              <tr><td style="padding:6px 0;">
                <p style="margin:0;font-size:13px;color:#94a3b8;">Folio del ticket</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1e293b;font-family:monospace;">#${folio}</p>
              </td></tr>
              <tr><td style="padding:6px 0;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:13px;color:#94a3b8;">Servicio realizado</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:500;color:#1e293b;">${ticket_titulo || 'Servicio técnico'}</p>
              </td></tr>
              ${empresa_nombre ? `<tr><td style="padding:6px 0;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:13px;color:#94a3b8;">Empresa</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:500;color:#1e293b;">${empresa_nombre}</p>
              </td></tr>` : ''}
              ${supervisor ? `<tr><td style="padding:6px 0;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:13px;color:#94a3b8;">Supervisor / Encargado</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:500;color:#1e293b;">${supervisor}</p>
              </td></tr>` : ''}
              <tr><td style="padding:6px 0;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:13px;color:#94a3b8;">Técnico responsable</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:500;color:#1e293b;">${tecnico_nombre || 'Técnico'}</p>
              </td></tr>
            </table>

            <!-- Botón PDF -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:28px;">
                <a href="${pdf_url}" target="_blank"
                   style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                  📄 Descargar Reporte PDF
                </a>
              </td></tr>
            </table>

            <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
              Si tiene alguna pregunta sobre el servicio realizado, no dude en contactarnos.<br>
              También puede dar seguimiento a sus tickets en nuestro portal: <a href="https://iconsupport.vercel.app" style="color:#4f46e5;">iconsupport.vercel.app</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f1f5f9;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">${EMPRESA_NOMBRE} — Soporte Técnico Especializado</p>
            <p style="color:#cbd5e1;font-size:11px;margin:6px 0 0;">Este correo fue generado automáticamente, por favor no responda directamente.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    // Enviar con Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${EMPRESA_NOMBRE} <${FROM_EMAIL}>`,
        to: [to],
        subject: `Reporte de Servicio Técnico — Folio #${folio} | ${EMPRESA_NOMBRE}`,
        html: htmlBody,
      }),
    })

    const resendData = await resendRes.json()
    if (!resendRes.ok) throw new Error(resendData.message || 'Error en Resend')

    return new Response(
      JSON.stringify({ ok: true, id: resendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('enviar-reporte-email error:', err)
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
