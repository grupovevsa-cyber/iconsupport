import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Asistencia, Coordenadas } from '../types'

// ============================================================
// Hook: useAsistencias — Check-in / Check-out de técnicos
// ============================================================

export function useAsistencias() {
  const [asistenciaActiva, setAsistenciaActiva] = useState<Asistencia | null>(null)
  const [historial, setHistorial] = useState<Asistencia[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Registra el Check-in del técnico */
  const checkIn = useCallback(async (
    tecnicoId: string,
    coordenadas: Coordenadas,
    direccion?: string,
    ticketId?: string,
    notas?: string
  ): Promise<Asistencia> => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('asistencias')
      .insert({
        tecnico_id: tecnicoId,
        ticket_id: ticketId || null,
        hora_entrada: new Date().toISOString(),
        latitud_entrada: coordenadas.latitud,
        longitud_entrada: coordenadas.longitud,
        direccion_entrada: direccion,
        notas: notas || null,
      })
      .select()
      .single()

    setLoading(false)

    if (err) {
      setError(err.message)
      throw new Error(err.message)
    }

    const asistencia = data as Asistencia
    setAsistenciaActiva(asistencia)
    return asistencia
  }, [])

  /** Registra el Check-out del técnico */
  const checkOut = useCallback(async (
    asistenciaId: string,
    coordenadas: Coordenadas,
    direccion?: string
  ): Promise<Asistencia> => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('asistencias')
      .update({
        hora_salida: new Date().toISOString(),
        latitud_salida: coordenadas.latitud,
        longitud_salida: coordenadas.longitud,
        direccion_salida: direccion,
      })
      .eq('id', asistenciaId)
      .select()
      .single()

    setLoading(false)

    if (err) {
      setError(err.message)
      throw new Error(err.message)
    }

    const asistencia = data as Asistencia
    setAsistenciaActiva(null)
    return asistencia
  }, [])

  /** Verifica si el técnico tiene un check-in activo (sin check-out) */
  const verificarAsistenciaActiva = useCallback(async (tecnicoId: string) => {
    const { data } = await supabase
      .from('asistencias')
      .select('*')
      .eq('tecnico_id', tecnicoId)
      .is('hora_salida', null)
      .order('hora_entrada', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setAsistenciaActiva(data as Asistencia)
    }
    return data as Asistencia | null
  }, [])

  /** Carga el historial de asistencias del técnico */
  const fetchHistorial = useCallback(async (tecnicoId: string, limite: number = 30) => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('asistencias')
      .select(`
        *,
        ticket:tickets(id, titulo, estado)
      `)
      .eq('tecnico_id', tecnicoId)
      .order('hora_entrada', { ascending: false })
      .limit(limite)

    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setHistorial((data as Asistencia[]) || [])
    }
  }, [])

  return {
    asistenciaActiva,
    historial,
    loading,
    error,
    checkIn,
    checkOut,
    verificarAsistenciaActiva,
    fetchHistorial,
  }
}
