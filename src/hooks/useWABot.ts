import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface WASesion {
  id: string
  telefono: string
  nombre?: string
  estado: string
  datos_temp: Record<string, unknown>
  ultimo_mensaje: string
  creado_en: string
  cliente_id?: string
}

export interface WAMensaje {
  id: string
  sesion_id: string
  rol: 'user' | 'bot'
  contenido: string
  creado_en: string
}

export interface BotConfig {
  id: string
  numero_whatsapp: string
  nombre_bot: string
  mensaje_bienvenida: string
  horario_inicio: string
  horario_fin: string
  dias_habiles: number[]
  modo_ia_activo: boolean
  ia_system_prompt: string
}

// ── useWAConversaciones ────────────────────────────────────
export function useWAConversaciones() {
  const [sesiones, setSesiones] = useState<WASesion[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSesiones = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('whatsapp_sesiones')
      .select('*')
      .order('ultimo_mensaje', { ascending: false })
    setSesiones((data as WASesion[]) || [])
    setLoading(false)
  }, [])

  const fetchMensajes = async (sesionId: string): Promise<WAMensaje[]> => {
    const { data } = await supabase
      .from('whatsapp_mensajes')
      .select('*')
      .eq('sesion_id', sesionId)
      .order('creado_en', { ascending: true })
    return (data as WAMensaje[]) || []
  }

  // Suscripción en tiempo real
  useEffect(() => {
    fetchSesiones()
    const channel = supabase
      .channel('whatsapp_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_sesiones' }, () => {
        fetchSesiones()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchSesiones])

  return { sesiones, loading, fetchSesiones, fetchMensajes }
}

// ── useBotConfig ───────────────────────────────────────────
export function useBotConfig() {
  const [config, setConfig] = useState<BotConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('bot_config').select('*').single()
    setConfig(data as BotConfig)
    setLoading(false)
  }, [])

  const guardarConfig = async (updates: Partial<BotConfig>) => {
    if (!config) return
    setGuardando(true)
    const { data, error } = await supabase
      .from('bot_config')
      .update(updates)
      .eq('id', config.id)
      .select()
      .single()
    if (!error) setConfig(data as BotConfig)
    setGuardando(false)
    return !error
  }

  useEffect(() => { fetchConfig() }, [fetchConfig])

  return { config, loading, guardando, fetchConfig, guardarConfig }
}
