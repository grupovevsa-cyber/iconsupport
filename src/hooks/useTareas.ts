import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Tarea, TareaEstado } from '../types'

export function useTareas() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTareas = useCallback(async (tecnicoId?: string) => {
    setLoading(true)
    try {
      let query = supabase
        .from('tareas')
        .select(`*, tecnico:tecnico_id(*)`)
        .order('creado_en', { ascending: false })

      if (tecnicoId) {
        query = query.eq('tecnico_id', tecnicoId)
      }

      const { data, error } = await query
      if (error) throw error
      setTareas(data as Tarea[])
    } catch (error) {
      console.error('Error fetching tareas:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const actualizarEstadoTarea = async (id: string, estado: TareaEstado) => {
    try {
      const { error } = await supabase
        .from('tareas')
        .update({ estado })
        .eq('id', id)
      
      if (error) throw error
      setTareas(prev => prev.map(t => t.id === id ? { ...t, estado } : t))
    } catch (error) {
      console.error('Error updating estado:', error)
      throw error
    }
  }

  return { tareas, loading, fetchTareas, actualizarEstadoTarea }
}
