import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL_SECRET || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { tenantId, amount, planType } = req.body;

  if (!tenantId || !amount) {
    return res.status(400).json({ error: 'Missing tenantId or amount' });
  }

  try {
    // 1. Obtener información de la empresa
    const { data: tenant, error: tenantError } = await supabase
      .from('empresas_saas')
      .select('nombre, plan')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // 2. Configurar variables de Paguelo Fácil
    const cclw = process.env.PAGUELOFACIL_CCLW;
    const isSandbox = process.env.PAGUELOFACIL_SANDBOX === 'true';
    const baseUrl = isSandbox
      ? 'https://sandbox.paguelofacil.com/LinkDeamon.cfm'
      : 'https://secure.paguelofacil.com/LinkDeamon.cfm';

    if (!cclw) {
      return res.status(500).json({ error: 'PagueloFacil CCLW is not configured in environment variables' });
    }

    // 3. Definir la URL de retorno
    const origin = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:5173'; // Fallback para local
      
    const returnUrlRaw = `${origin}/superadmin/dashboard?payment_status=success&tenant_id=${tenantId}`;
    const returnUrlHex = Buffer.from(returnUrlRaw).toString('hex');

    // 4. Construir payload para Paguelo Fácil
    const payload = new URLSearchParams({
      CCLW: cclw,
      CMTN: amount.toString(),
      CDSC: `Suscripcion ${planType || 'mensual'} - ${tenant.nombre}`,
      Channel: 'API_CUSTOM',
      Order: tenantId,
      RETURN_URL: returnUrlHex
    });

    console.log('Enviando petición a Paguelo Fácil:', payload.toString());

    // 5. Llamar al API de Paguelo Fácil
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*'
      },
      body: payload.toString()
    });

    if (!response.ok) {
      throw new Error(`PagueloFacil responded with status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Respuesta de Paguelo Fácil:', result);

    if (!result.success || !result.data || !result.data.url) {
      return res.status(500).json({ 
        error: 'Failed to generate link from PagueloFacil', 
        details: result 
      });
    }

    const paymentLink = result.data.url;

    // 6. Guardar el link generado en la base de datos de Supabase
    const { error: updateError } = await supabase
      .from('empresas_saas')
      .update({ 
        payment_link: paymentLink,
        plan: planType || 'basic'
      })
      .eq('id', tenantId);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ success: true, paymentLink });

  } catch (error) {
    console.error('Error generating payment link:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
