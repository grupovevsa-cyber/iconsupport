import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { VisitaProgramada } from '../types'
import { toast } from 'react-hot-toast'

export function useVisitasProgramadas() {
  const [visitas, setVisitas] = useState<VisitaProgramada[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVisitas = useCallback(async (filtros?: {
    tecnico_id?: string
    cliente_id?: string
    desde?: string
    hasta?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('visitas_programadas')
        .select(`
          *,
          tecnico:profiles!visitas_programadas_tecnico_id_fkey(id, nombre, avatar_url),
          cliente:profiles!visitas_programadas_cliente_id_fkey(id, nombre),
          creador:profiles!visitas_programadas_creado_por_fkey(id, nombre),
          ticket:tickets(id, titulo, numero_ticket)
        `)
        .order('fecha_inicio', { ascending: true })

      if (filtros?.tecnico_id) {
        query = query.eq('tecnico_id', filtros.tecnico_id)
      }
      if (filtros?.cliente_id) {
        query = query.eq('cliente_id', filtros.cliente_id)
      }
      if (filtros?.desde) {
        query = query.gte('fecha_inicio', filtros.desde)
      }
      if (filtros?.hasta) {
        query = query.lte('fecha_fin', filtros.hasta)
      }

      const { data, error: dbErr } = await query

      if (dbErr) throw new Error(dbErr.message)
      setVisitas((data as any) || [])
    } catch (err: any) {
      setError(err.message)
      toast.error('Error al cargar visitas programadas')
    } finally {
      setLoading(false)
    }
  }, [])

  const crearVisita = async (visita: Partial<VisitaProgramada>) => {
    try {
      // Necesitamos el ID del usuario actual para "creado_por"
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No estás autenticado')

      const { data, error } = await supabase
        .from('visitas_programadas')
        .insert({
          ...visita,
          creado_por: user.id
        })
        .select(`
          *,
          tecnico:profiles!visitas_programadas_tecnico_id_fkey(id, nombre, avatar_url),
          cliente:profiles!visitas_programadas_cliente_id_fkey(id, nombre),
          ticket:tickets(id, titulo, numero_ticket)
        `)
        .single()

      if (error) throw new Error(error.message)
      setVisitas(prev => [...prev, data as any])
      toast.success('Visita programada creada')
      return data
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
      throw err
    }
  }

  const actualizarVisita = async (id: string, actualizaciones: Partial<VisitaProgramada>) => {
    try {
      const { data, error } = await supabase
        .from('visitas_programadas')
        .update(actualizaciones)
        .eq('id', id)
        .select(`
          *,
          tecnico:profiles!visitas_programadas_tecnico_id_fkey(id, nombre, avatar_url),
          cliente:profiles!visitas_programadas_cliente_id_fkey(id, nombre),
          ticket:tickets(id, titulo, numero_ticket)
        `)
        .single()

      if (error) throw new Error(error.message)
      setVisitas(prev => prev.map(v => v.id === id ? (data as any) : v))
      toast.success('Visita actualizada')
      return data
    } catch (err: any) {
      toast.error(`Error al actualizar: ${err.message}`)
      throw err
    }
  }

  const eliminarVisita = async (id: string) => {
    try {
      const { error } = await supabase
        .from('visitas_programadas')
        .delete()
        .eq('id', id)

      if (error) throw new Error(error.message)
      setVisitas(prev => prev.filter(v => v.id !== id))
      toast.success('Visita eliminada')
    } catch (err: any) {
      toast.error(`Error al eliminar: ${err.message}`)
      throw err
    }
  }

  return {
    visitas,
    loading,
    error,
    fetchVisitas,
    crearVisita,
    actualizarVisita,
    eliminarVisita
  }
}
