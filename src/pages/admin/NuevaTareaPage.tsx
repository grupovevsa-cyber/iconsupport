import React, { useState, useEffect } from 'react'
import { Plus, Save, ArrowLeft, Loader2, CheckCircle2, ClipboardList } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import type { Profile, Ticket } from '../../types'
import { useAuth } from '../../hooks/useAuth'

export function NuevaTareaPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [tecnicos, setTecnicos] = useState<Profile[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])

  // Formulario
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tecnicoId, setTecnicoId] = useState('')
  const [ticketId, setTicketId] = useState('')

  useEffect(() => {
    const init = async () => {
      // Cargar técnicos
      const { data: techData } = await supabase
        .from('profiles')
        .select('*')
        .eq('rol', 'tecnico')
      
      // Cargar tickets abiertos/en_progreso para asociar la tarea (opcional)
      const { data: ticketData } = await supabase
        .from('tickets')
        .select('*')
        .in('estado', ['abierto', 'en_progreso'])
        .order('creado_en', { ascending: false })

      if (techData) setTecnicos(techData as Profile[])
      if (ticketData) setTickets(ticketData as Ticket[])
      setCargando(false)
    }
    init()
  }, [])

  const handleCrearTarea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !tecnicoId) {
      toast.error('El título y el técnico son obligatorios.')
      return
    }

    setGuardando(true)
    try {
      const { error } = await supabase
        .from('tareas')
        .insert({
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          tecnico_id: tecnicoId,
          ticket_id: ticketId || null,
          estado: 'abierta'
        })

      if (error) throw error

      toast.success('Tarea asignada correctamente al técnico.')
      navigate('/admin/dashboard') // O donde prefieras redirigir
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-brand-500 w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/dashboard" className="p-2 hover:bg-surface-800 rounded-full transition-colors">
          <ArrowLeft className="text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="text-brand-400" />
            Asignar Nueva Tarea
          </h1>
          <p className="text-slate-400 text-sm mt-1">Crea una tarea directa y asígnala a un técnico en campo.</p>
        </div>
      </div>

      <form onSubmit={handleCrearTarea} className="bg-surface-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        
        {/* Título de la tarea */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Título de la Tarea</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            placeholder="Ej. Realizar mantenimiento preventivo de equipos"
            required
          />
        </div>

        {/* Técnico Asignado */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Técnico Asignado</label>
          <select
            value={tecnicoId}
            onChange={(e) => setTecnicoId(e.target.value)}
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500"
            required
          >
            <option value="">Selecciona un técnico...</option>
            {tecnicos.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Descripción (Opcional)</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 h-28 resize-none"
            placeholder="Detalles adicionales sobre lo que el técnico debe realizar..."
          />
        </div>

        {/* Asociar a Ticket (Opcional) */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Asociar a un Ticket Abierto (Opcional)</label>
          <select
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500"
          >
            <option value="">Ninguno (Tarea independiente)</option>
            {tickets.map(t => (
              <option key={t.id} value={t.id}>Ticket #{t.numero_ticket || t.id.split('-')[0]} - {t.asunto}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={guardando}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50"
        >
          {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Crear y Asignar Tarea
        </button>
      </form>
    </div>
  )
}
