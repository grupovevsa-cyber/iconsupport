import React, { useEffect, useState } from 'react'
import { useTickets } from '../../hooks/useTickets'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  FileText, Search, Filter, ChevronDown, 
  X, Save, Loader2, User, Clock, AlertCircle
} from 'lucide-react'
import type { Ticket, Profile, TicketEstado } from '../../types'
import { supabase } from '../../lib/supabaseClient'

interface InformesPageProps {
  currentUser: Profile
}

const ESTADO_COLORS = {
  abierto: 'bg-red-500/15 text-red-400 border-red-500/20',
  en_proceso: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  cerrado: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
}

const PRIORIDAD_COLORS = {
  alta: 'text-red-400',
  media: 'text-amber-400',
  baja: 'text-emerald-400',
}

export function InformesPage({ currentUser }: InformesPageProps) {
  const { tickets, loading, fetchTickets, actualizarTicket } = useTickets()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<TicketEstado | 'todos'>('todos')
  
  // Panel lateral
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null)
  const [tecnicos, setTecnicos] = useState<Profile[]>([])
  const [guardando, setGuardando] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Ticket>>({})

  useEffect(() => {
    // Filtro basado en rol
    const filtros: any = {}
    if (currentUser.rol === 'cliente') {
      filtros.clienteId = currentUser.id
    } else if (currentUser.rol === 'tecnico') {
      filtros.tecnicoId = currentUser.id
    }
    // Si es admin, filtros queda vacío y trae todos
    fetchTickets(filtros)
    
    // Cargar técnicos si es admin (para poder asignar)
    if (currentUser.rol === 'admin') {
      supabase.from('profiles').select('*').eq('rol', 'tecnico')
        .then(({ data }) => setTecnicos(data as Profile[] || []))
    }
  }, [currentUser])

  // Filtrado local adicional
  const ticketsFiltrados = tickets.filter(t => {
    const matchEstado = filtroEstado === 'todos' || t.estado === filtroEstado
    const matchBusqueda = !busqueda || 
      t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.cliente?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(t.numero_ticket).includes(busqueda)
    
    return matchEstado && matchBusqueda
  })

  // Abrir panel lateral
  const abrirPanel = (ticket: Ticket) => {
    setTicketSeleccionado(ticket)
    setEditForm({
      estado: ticket.estado,
      prioridad: ticket.prioridad,
      tecnico_asignado_id: ticket.tecnico_asignado_id,
      notas_internas: ticket.notas_internas || ''
    })
  }

  const handleGuardar = async () => {
    if (!ticketSeleccionado) return
    setGuardando(true)
    try {
      await actualizarTicket(ticketSeleccionado.id, editForm)
      setTicketSeleccionado(null) // cerrar panel
    } catch (error) {
      console.error(error)
      alert("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 animate-fade-in flex gap-6">
      
      {/* Contenido principal (Tabla) */}
      <div className={`flex-1 transition-all ${ticketSeleccionado ? 'w-2/3 hidden lg:block' : 'w-full'}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="text-brand-400" />
              Informes
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Listado histórico y seguimiento de tickets
            </p>
          </div>
        </div>

        {/* Barra de herramientas */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por TCK, título o cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-surface-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="bg-surface-800 border border-slate-700 rounded-xl pl-8 pr-8 py-2.5 text-sm text-white focus:outline-none appearance-none min-w-[160px]"
            >
              <option value="todos">Todos los estados</option>
              <option value="abierto">Abiertos</option>
              <option value="en_proceso">En proceso</option>
              <option value="cerrado">Cerrados</option>
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-surface-900 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-surface-800 text-slate-400 text-xs uppercase font-medium">
                <tr>
                  <th className="px-4 py-4">ID</th>
                  <th className="px-4 py-4">Fecha</th>
                  <th className="px-4 py-4">Asunto</th>
                  <th className="px-4 py-4">Cliente</th>
                  <th className="px-4 py-4">Técnico</th>
                  <th className="px-4 py-4">Prioridad</th>
                  <th className="px-4 py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2 text-brand-400" />
                      Cargando tickets...
                    </td>
                  </tr>
                ) : ticketsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No se encontraron tickets con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  ticketsFiltrados.map((ticket) => (
                    <tr 
                      key={ticket.id} 
                      onClick={() => abrirPanel(ticket)}
                      className={`hover:bg-surface-800 cursor-pointer transition-colors ${ticketSeleccionado?.id === ticket.id ? 'bg-surface-800/80 ring-1 ring-inset ring-brand-500/30' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-brand-400 whitespace-nowrap">
                        TCK-{String(ticket.numero_ticket || 0).padStart(5, '0')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {format(new Date(ticket.creado_en), "dd MMM, HH:mm", { locale: es })}
                      </td>
                      <td className="px-4 py-3 font-medium text-white max-w-[200px] truncate">
                        {ticket.titulo}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-slate-500" />
                          <span className="truncate max-w-[120px]">{ticket.cliente?.nombre || 'Desconocido'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="truncate max-w-[120px] block">
                          {ticket.tecnico_asignado?.nombre || <span className="text-slate-500 text-xs italic">Sin asignar</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`capitalize ${PRIORIDAD_COLORS[ticket.prioridad] || ''}`}>
                          {ticket.prioridad}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${ESTADO_COLORS[ticket.estado]}`}>
                          {ticket.estado.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Panel Lateral (Bitácora) */}
      {ticketSeleccionado && (
        <div className="w-full lg:w-1/3 bg-surface-900 border border-slate-700 rounded-2xl flex flex-col h-[calc(100vh-8rem)] animate-slide-left">
          {/* Header Panel */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-surface-800/50 rounded-t-2xl">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span className="font-mono text-brand-400">TCK-{String(ticketSeleccionado.numero_ticket || 0).padStart(5, '0')}</span>
            </h3>
            <button 
              onClick={() => setTicketSeleccionado(null)}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Formulario de Bitácora */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <p className="text-lg font-medium text-white">{ticketSeleccionado.titulo}</p>
              <p className="text-sm text-slate-400 mt-2 bg-surface-950 p-3 rounded-xl border border-slate-800">
                {ticketSeleccionado.descripcion || 'Sin descripción.'}
              </p>
            </div>

            {/* Solo admins y tecnicos pueden editar campos. El cliente ve en modo solo lectura (o casi) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Estado</label>
                <select
                  disabled={currentUser.rol === 'cliente'}
                  value={editForm.estado}
                  onChange={(e) => setEditForm({ ...editForm, estado: e.target.value as any })}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  <option value="abierto">Abierto</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="cerrado">Cerrado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Prioridad</label>
                <select
                  disabled={currentUser.rol === 'cliente'}
                  value={editForm.prioridad}
                  onChange={(e) => setEditForm({ ...editForm, prioridad: e.target.value as any })}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>

            {currentUser.rol === 'admin' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Técnico Asignado</label>
                <select
                  value={editForm.tecnico_asignado_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, tecnico_asignado_id: e.target.value || undefined })}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="">-- Sin asignar --</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock size={14} className="text-brand-400" />
                Bitácora / Notas Internas
              </label>
              <textarea
                disabled={currentUser.rol === 'cliente'}
                value={editForm.notas_internas || ''}
                onChange={(e) => setEditForm({ ...editForm, notas_internas: e.target.value })}
                placeholder={currentUser.rol === 'cliente' ? "Solo los técnicos pueden añadir notas internas." : "Escribe actualizaciones del caso..."}
                rows={6}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white disabled:opacity-50 resize-none"
              />
              {currentUser.rol !== 'cliente' && (
                 <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                   <AlertCircle size={12} /> Estas notas no son visibles para el cliente.
                 </p>
              )}
            </div>
          </div>

          {/* Footer Panel */}
          {currentUser.rol !== 'cliente' && (
            <div className="p-4 border-t border-slate-800 bg-surface-800/30 rounded-b-2xl">
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-medium py-2.5 rounded-xl transition-all shadow-glow/20"
              >
                {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {guardando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
