import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Tarea, TareaEstado } from '../types'

// ============================================================
// Hook: useTasks — CRUD de tareas asociadas a tickets
// ============================================================

export function useTasks() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Carga todas las tareas asociadas a un ticket */
  const fetchTareas = useCallback(async (ticketId: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('tareas')
        .select('*, tecnico:profiles(*)')
        .eq('ticket_id', ticketId)
        .order('creado_en', { ascending: true })

      if (err) throw err
      setTareas((data as Tarea[]) || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  /** Crea una nueva tarea */
  const crearTarea = async (
    ticketId: string,
    titulo: string,
    descripcion?: string,
    tecnicoId?: string
  ): Promise<Tarea> => {
    const { data, error: err } = await supabase
      .from('tareas')
      .insert({
        ticket_id: ticketId,
        titulo,
        descripcion: descripcion || null,
        tecnico_id: tecnicoId || null,
        estado: 'abierta'
      })
      .select('*, tecnico:profiles(*)')
      .single()

    if (err) throw new Error(err.message)
    
    // Actualizar el estado local
    setTareas(prev => [...prev, data as Tarea])
    return data as Tarea
  }

  /** Actualiza el estado de una tarea */
  const actualizarEstadoTarea = async (
    ticketId: string,
    tareaId: string,
    estado: TareaEstado
  ) => {
    const { error: err } = await supabase
      .from('tareas')
      .update({ estado })
      .eq('id', tareaId)

    if (err) throw new Error(err.message)

    // Actualizar el estado local
    setTareas(prev =>
      prev.map(t => (t.id === tareaId ? { ...t, estado } : t))
    )
  }

  /** Elimina una tarea */
  const eliminarTarea = async (ticketId: string, tareaId: string) => {
    const { error: err } = await supabase
      .from('tareas')
      .delete()
      .eq('id', tareaId)

    if (err) throw new Error(err.message)

    // Actualizar el estado local
    setTareas(prev => prev.filter(t => t.id !== tareaId))
  }

  return {
    tareas,
    loading,
    error,
    fetchTareas,
    crearTarea,
    actualizarEstadoTarea,
    eliminarTarea
  }
}
