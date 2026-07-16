import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Ticket, NuevoTicketForm, TicketEstado } from '../types'

// ============================================================
// Hook: useTickets — CRUD de tickets
// ============================================================

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Carga tickets con filtros opcionales */
  const fetchTickets = useCallback(async (filtros?: {
    estado?: TicketEstado
    clienteId?: string
    tecnicoId?: string
  }) => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('tickets')
      .select(`
        *,
        cliente:profiles!tickets_cliente_id_fkey(id, nombre, email, telefono, rol),
        tecnico_asignado:profiles!tickets_tecnico_asignado_id_fkey(id, nombre, email, telefono, rol)
      `)
      .order('creado_en', { ascending: false })

    if (filtros?.estado) query = query.eq('estado', filtros.estado)
    if (filtros?.clienteId) query = query.eq('cliente_id', filtros.clienteId)
    if (filtros?.tecnicoId) query = query.eq('tecnico_asignado_id', filtros.tecnicoId)

    const { data, error: err } = await query

    if (err) {
      setError(err.message)
    } else {
      setTickets((data as Ticket[]) || [])
    }
    setLoading(false)
  }, [])

  /** Crea un nuevo ticket */
  const crearTicket = async (
    form: NuevoTicketForm,
    clienteId?: string
  ): Promise<Ticket> => {
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
    const ticketId = crypto.randomUUID()
    const qrData = `${appUrl}/ticket/seguimiento/${ticketId}`

    const { data: inserted, error: insertErr } = await supabase
      .from('tickets')
      .insert({
        ...form,
        id: ticketId,
        cliente_id: clienteId || null,
        estado: 'abierto',
        qr_code_data: qrData
      })
      .select()

    if (insertErr) throw new Error(insertErr.message)

    const updated = (inserted && inserted.length > 0) 
      ? (inserted[0] as Ticket) 
      : ({
          ...form,
          id: ticketId,
          cliente_id: clienteId || null,
          estado: 'abierto',
          qr_code_data: qrData,
          creado_en: new Date().toISOString(),
          actualizado_en: new Date().toISOString(),
        } as unknown as Ticket)
    
    // Notificar al admin sin bloquear el flujo principal
    supabase.functions.invoke('notificar-admin', {
      body: { ticket: updated }
    }).catch(err => console.error('Error al notificar al admin:', err))

    return updated
  }

  /** Actualiza el estado de un ticket */
  const actualizarEstado = async (
    ticketId: string,
    estado: TicketEstado,
    tecnicoId?: string
  ) => {
    const update: Partial<Ticket> = { estado }
    if (tecnicoId) update.tecnico_asignado_id = tecnicoId

    const { error: err } = await supabase
      .from('tickets')
      .update(update)
      .eq('id', ticketId)

    if (err) throw new Error(err.message)
    await fetchTickets()
  }

  /** Actualiza múltiples campos de un ticket */
  const actualizarTicket = async (ticketId: string, update: Partial<Ticket>) => {
    const { error: err } = await supabase
      .from('tickets')
      .update(update)
      .eq('id', ticketId)

    if (err) throw new Error(err.message)
    await fetchTickets()
  }

  /** Asigna un técnico a un ticket */
  const asignarTecnico = async (ticketId: string, tecnicoId: string) => {
    const { error: err } = await supabase
      .from('tickets')
      .update({ tecnico_asignado_id: tecnicoId, estado: 'en_proceso' })
      .eq('id', ticketId)

    if (err) throw new Error(err.message)
    await fetchTickets()
  }

  /** Obtiene un ticket por ID con todas sus relaciones */
  const getTicket = async (id: string): Promise<Ticket | null> => {
    const { data, error: err } = await supabase
      .from('tickets')
      .select(`
        *,
        cliente:profiles!tickets_cliente_id_fkey(*),
        tecnico_asignado:profiles!tickets_tecnico_asignado_id_fkey(*),
        comentarios:comentarios_tickets(*, autor:profiles(*))
      `)
      .eq('id', id)
      .single()

    if (err) return null
    return data as Ticket
  }

  /** Agrega un comentario a un ticket */
  const agregarComentario = async (
    ticketId: string,
    autorId: string,
    mensaje: string,
    esInterno: boolean = false
  ) => {
    const { error: err } = await supabase
      .from('comentarios_tickets')
      .insert({ ticket_id: ticketId, autor_id: autorId, mensaje, es_interno: esInterno })

    if (err) throw new Error(err.message)
  }

  return {
    tickets,
    loading,
    error,
    fetchTickets,
    crearTicket,
    actualizarEstado,
    actualizarTicket,
    asignarTecnico,
    getTicket,
    agregarComentario,
  }
}
