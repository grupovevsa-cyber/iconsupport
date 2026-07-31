import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, User, FileText, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Profile, VisitaProgramada, Ticket, BitacoraMensaje } from '../../../types'
import { supabase } from '../../../lib/supabaseClient'
import { BitacoraCRM } from '../../../components/ui/BitacoraCRM'

interface ProgramarVisitaModalProps {
  visitaExistente?: VisitaProgramada | null
  fechaInicial?: Date
  onClose: () => void
  onGuardado: () => void
  currentUser: Profile
}

export function ProgramarVisitaModal({
  visitaExistente,
  fechaInicial,
  onClose,
  onGuardado,
  currentUser
}: ProgramarVisitaModalProps) {
  const [loading, setLoading] = useState(false)
  const [tecnicos, setTecnicos] = useState<Profile[]>([])
  const [tickets, setTickets] = useState<Partial<Ticket>[]>([])
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'detalles' | 'comunicaciones'>('detalles')
  const [mensajes, setMensajes] = useState<BitacoraMensaje[]>([])
  
  // Si no es admin, solo puede asignarse a sí mismo
  const isAdmin = currentUser.rol === 'admin'
  const isEditing = !!visitaExistente

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    fecha_inicio: '',
    hora_inicio: '09:00',
    fecha_fin: '',
    hora_fin: '10:00',
    tecnico_id: isAdmin ? '' : currentUser.id,
    ticket_id: '',
    cliente_id: '',
    estado: 'programada' as 'programada' | 'completada' | 'cancelada'
  })

  useEffect(() => {
    // Inicializar formulario
    if (visitaExistente) {
      const start = parseISO(visitaExistente.fecha_inicio)
      const end = parseISO(visitaExistente.fecha_fin)
      setForm({
        titulo: visitaExistente.titulo,
        descripcion: visitaExistente.descripcion || '',
        fecha_inicio: format(start, 'yyyy-MM-dd'),
        hora_inicio: format(start, 'HH:mm'),
        fecha_fin: format(end, 'yyyy-MM-dd'),
        hora_fin: format(end, 'HH:mm'),
        tecnico_id: visitaExistente.tecnico_id,
        ticket_id: visitaExistente.ticket_id || '',
        cliente_id: visitaExistente.cliente_id || '',
        estado: visitaExistente.estado
      })
      cargarMensajes(visitaExistente.id)
    } else if (fechaInicial) {
      const dateStr = format(fechaInicial, 'yyyy-MM-dd')
      setForm(prev => ({
        ...prev,
        fecha_inicio: dateStr,
        fecha_fin: dateStr,
      }))
    }
  }, [visitaExistente, fechaInicial])

  useEffect(() => {
    // Cargar catálogos
    async function loadData() {
      if (isAdmin) {
        const { data: t } = await supabase.from('profiles').select('*').eq('rol', 'tecnico')
        setTecnicos(t || [])
      }
      const { data: tk } = await supabase.from('tickets').select('id, titulo, numero_ticket, cliente_id').neq('estado', 'cerrado').order('creado_en', { ascending: false })
      setTickets(tk || [])
    }
    loadData()
  }, [isAdmin])

  const cargarMensajes = async (visitaId: string) => {
    try {
      const { data, error } = await supabase
        .from('bitacora')
        .select(`
          *,
          autor:autor_id ( id, nombre, rol, avatar_url )
        `)
        .eq('visita_id', visitaId)
        .order('creado_en', { ascending: true })

      if (error) throw error
      setMensajes(data as any)
    } catch (err) {
      console.error('Error cargando mensajes de la visita:', err)
    }
  }

  const handleTicketChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tid = e.target.value
    const selected = tickets.find(t => t.id === tid)
    setForm(prev => ({
      ...prev,
      ticket_id: tid,
      cliente_id: selected?.cliente_id || prev.cliente_id
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Combinar fechas y horas
      const fechaInicioIso = new Date(`${form.fecha_inicio}T${form.hora_inicio}:00`).toISOString()
      const fechaFinIso = new Date(`${form.fecha_fin}T${form.hora_fin}:00`).toISOString()

      const payload = {
        titulo: form.titulo,
        descripcion: form.descripcion,
        fecha_inicio: fechaInicioIso,
        fecha_fin: fechaFinIso,
        tecnico_id: form.tecnico_id,
        ticket_id: form.ticket_id || null,
        cliente_id: form.cliente_id || null,
        estado: form.estado
      }

      if (isEditing) {
        const { error } = await supabase.from('visitas_programadas').update(payload).eq('id', visitaExistente!.id)
        if (error) throw error
      } else {
        const { error, data } = await supabase.from('visitas_programadas').insert({
          ...payload,
          creado_por: currentUser.id
        }).select('*, tecnico:profiles!visitas_programadas_tecnico_id_fkey(telefono, nombre)').single()
        
        if (error) throw error
        
        // Enviar alerta WhatsApp al técnico
        if (data && data.tecnico?.telefono && form.tecnico_id !== currentUser.id) {
           const fechaStr = format(new Date(fechaInicioIso), "EEEE d 'de' MMMM, HH:mm", { locale: es })
           const msg = `*Nueva Visita Programada*\nHola ${data.tecnico.nombre}, se te ha programado una visita:\n\n*Motivo:* ${form.titulo}\n*Cuándo:* ${fechaStr}\n\nIngresa a ICON Support para ver los detalles.`
           await supabase.functions.invoke('enviar-whatsapp', {
             body: { to: data.tecnico.telefono, tipo: 'texto', mensaje: msg }
           }).catch(console.error) // Ignorar errores de WA si falla
        }
      }
      onGuardado()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Seguro que deseas eliminar esta cita?')) return
    setLoading(true)
    try {
      await supabase.from('visitas_programadas').delete().eq('id', visitaExistente!.id)
      onGuardado()
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="text-brand-400" size={20} />
            {isEditing ? 'Editar Visita' : 'Programar Nueva Visita'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {isEditing && (
          <div className="flex border-b border-slate-700 bg-surface-900 px-4">
            <button
              onClick={() => setActiveTab('detalles')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors mr-6 ${
                activeTab === 'detalles' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Detalles
            </button>
            <button
              onClick={() => setActiveTab('comunicaciones')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'comunicaciones' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Bitácora / CRM
            </button>
          </div>
        )}

        {activeTab === 'detalles' ? (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Título de la visita *</label>
            <input
              required
              type="text"
              value={form.titulo}
              onChange={e => setForm({...form, titulo: e.target.value})}
              placeholder="Ej: Mantenimiento preventivo, Instalación..."
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Día Inicio *</label>
              <input
                required
                type="date"
                value={form.fecha_inicio}
                onChange={e => setForm({...form, fecha_inicio: e.target.value, fecha_fin: e.target.value})}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Hora Inicio *</label>
              <input
                required
                type="time"
                value={form.hora_inicio}
                onChange={e => setForm({...form, hora_inicio: e.target.value})}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Día Fin *</label>
              <input
                required
                type="date"
                value={form.fecha_fin}
                onChange={e => setForm({...form, fecha_fin: e.target.value})}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Hora Fin *</label>
              <input
                required
                type="time"
                value={form.hora_fin}
                onChange={e => setForm({...form, hora_fin: e.target.value})}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Técnico Asignado *</label>
              <select
                required
                value={form.tecnico_id}
                onChange={e => setForm({...form, tecnico_id: e.target.value})}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Seleccionar Técnico --</option>
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Asociar a un Ticket (Opcional)</label>
            <select
              value={form.ticket_id}
              onChange={handleTicketChange}
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">-- Ninguno --</option>
              {tickets.map(t => (
                <option key={t.id} value={t.id}>TCK-{String(t.numero_ticket || 0).padStart(5, '0')} - {t.titulo}</option>
              ))}
            </select>
          </div>

          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Estado de la Cita</label>
              <select
                required
                value={form.estado}
                onChange={e => setForm({...form, estado: e.target.value as any})}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="programada">Programada</option>
                <option value="completada">Completada (Culminada)</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Descripción / Notas</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm({...form, descripcion: e.target.value})}
              rows={3}
              placeholder="Detalles adicionales para la visita..."
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>

        </form>
        ) : (
          <div className="flex-1 overflow-y-auto bg-surface-950 p-0 m-0">
            <BitacoraCRM
              visitaId={visitaExistente!.id}
              mensajes={mensajes}
              currentUser={currentUser}
              onMensajeEnviado={() => cargarMensajes(visitaExistente!.id)}
            />
          </div>
        )}

        <div className="p-4 border-t border-slate-700 bg-surface-800 rounded-b-2xl flex justify-between gap-3">
          {isEditing && (isAdmin || currentUser.id === visitaExistente?.creado_por) ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-colors"
            >
              Eliminar
            </button>
          ) : <div></div>}
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-surface-700 hover:bg-surface-600 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-glow/20 ${
                activeTab !== 'detalles' ? 'hidden' : ''
              }`}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Programar Visita'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
