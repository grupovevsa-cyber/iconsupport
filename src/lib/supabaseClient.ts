import { createClient } from '@supabase/supabase-js'

// ============================================================
// Configuración del cliente Supabase
// Las variables de entorno DEBEN comenzar con VITE_ para
// que Vite las exponga al cliente (lado del navegador)
// ============================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey ||
    supabaseUrl.includes('xxxxxxxxxxx') ||
    supabaseAnonKey.includes('REEMPLAZAR')) {
  console.warn(
    '⚠️  Supabase no configurado.\n' +
    'Edita el archivo .env con tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY reales.\n' +
    'Ve a https://app.supabase.com → tu proyecto → Settings → API'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persiste la sesión en localStorage (necesario para PWA)
    persistSession: true,
    // Detecta cambios de sesión en otras pestañas
    detectSessionInUrl: true,
    // Mantiene la sesión activa automáticamente
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// ── Helpers de Storage ─────────────────────────────────────

/** Sube un archivo al bucket especificado y retorna la URL pública */
export async function uploadFile(
  bucket: 'firmas' | 'reportes' | 'avatares',
  path: string,
  file: File | Blob,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true })

  if (error) throw new Error(`Error al subir archivo: ${error.message}`)

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/** Obtiene la URL pública de un archivo en Storage */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
