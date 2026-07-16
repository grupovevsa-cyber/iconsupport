import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Equipo } from '../types'

// ============================================================
// Hook: useEquipos — CRUD de catálogo de equipos
// ============================================================

export function useEquipos() {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(false)

  const fetchEquipos = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .order('nombre')
      if (error) throw error
      setEquipos((data as Equipo[]) || [])
    } finally {
      setLoading(false)
    }
  }, [])

  const crearEquipo = async (
    nombre: string,
    marca?: string,
    modelo?: string,
    descripcion?: string
  ): Promise<Equipo> => {
    const { data, error } = await supabase
      .from('equipos')
      .insert({
        nombre: nombre.trim(),
        marca: marca || null,
        modelo: modelo || null,
        descripcion: descripcion || null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    const nuevo = data as Equipo
    setEquipos(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    return nuevo
  }

  return { equipos, loading, fetchEquipos, crearEquipo }
}
