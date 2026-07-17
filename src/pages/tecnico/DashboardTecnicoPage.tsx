import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TicketIcon, Filter, Search, ChevronDown,
  AlertCircle, Timer, CheckCircle2, Loader2, Eye, Users, FileText,
  Globe, Copy, ExternalLink, X
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { QRTicket } from '../../components/QRTicket'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTickets } from '../../hooks/useTickets'
import { useTareas } from '../../hooks/useTareas'
import { supabase } from '../../lib/supabaseClient'
import type { Ticket, TicketEstado, Profile } from '../../types'

// ============================================================
// Dashboard de Técnico / Admin
// ============================================================

const ESTADO_CONFIG = {
  abierto:    { label: 'Abierto',    color: 'text-red-400',    badge: 'bg-red-500/15 text-red-400 border-red-500/20' },
  abierta:    { label: 'Abierta',    color: 'text-red-400',    badge: 'bg-red-500/15 text-red-400 border-red-500/20' },
  en_proceso: { label: 'En Proceso', color: 'text-amber-400',  badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  completada: { label: 'Completada', color: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  cerrado:    { label: 'Cerrado',    color: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  cerrada:    { label: 'Cerrada',    color: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
}

const PRIORIDAD_DOT = {
  alta:  'bg-red-400',
  media: 'bg-amber-400',
  baja:  'bg-emerald-400',
}

interface DashboardTecnicoProps {
  currentUser: Profile
}

export function DashboardTecnicoPage({ currentUser }: DashboardTecnicoProps) {
  const navigate = useNavigate()
  const { tickets, loading, fetchTickets, actualizarEstado, asignarTecnico, actualizarTicket } = useTickets()
  const [filtroEstado, setFiltroEstado] = useState<TicketEstado | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [tecnicos, setTecnicos] = useState<Profile[]>([])
  const [clientes, setClientes] = useState<Profile[]>([])
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null)
  
  // Tareas
  const { tareas, fetchTareas } = useTareas()
  const [verTareas, setVerTareas] = useState(false)
  const [mostrarPortalQR, setMostrarPortalQR] = useState(false)

  // Cargar tickets y técnicos
  useEffect(() => {
    const filtro = currentUser.rol === 'tecnico'
      ? { tecnicoId: currentUser.id, incluirSinAsignar: true }
      : undefined
    fetchTickets(filtro)
    fetchTareas(currentUser.rol === 'tecnico' ? currentUser.id : undefined)
  }, [currentUser])

  useEffect(() => {
    if (currentUser.rol === 'admin') {
      supabase.from('profiles').select('*').eq('rol', 'tecnico')
        .then(({ data }) => setTecnicos((data as Profile[]) || []))
      supabase.from('profiles').select('*').eq('rol', 'cliente')
        .then(({ data }) => setClientes((data as Profile[]) || []))
    }
  }, [currentUser.rol])

  // Filtros
  const ticketsFiltrados = tickets.filter(t => {
    const matchEstado = filtroEstado === 'todos' || t.estado === filtroEstado
    const matchBusqueda = !busqueda || 
      t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.cliente?.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return matchEstado && matchBusqueda
  })

  // Estadísticas
  const stats = {
    total: tickets.length,
    abiertos: tickets.filter(t => t.estado === 'abierto').length,
    en_proceso: tickets.filter(t => t.estado === 'en_proceso').length,
    cerrados: tickets.filter(t => t.estado === 'cerrado').length,
  }

  const STATS = [
    { key: 'total',      label: 'Total',      icon: TicketIcon, value: stats.total,      color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-700' },
    { key: 'abiertos',   label: 'Abiertos',   icon: AlertCircle, value: stats.abiertos,   color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
    { key: 'en_proceso', label: 'En Proceso', icon: Timer,       value: stats.en_proceso, color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
    { key: 'cerrados',   label: 'Cerrados',   icon: CheckCircle2, value: stats.cerrados, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {currentUser.rol === 'admin' ? 'Panel de Administración' : 'Mis Tickets Asignados'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Bienvenido, <span className="text-brand-400 font-medium">{currentUser.nombre}</span>
          </p>
        </div>
        {currentUser.rol === 'admin' && (
          <button
            onClick={() => setMostrarPortalQR(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-glow shadow-indigo-600/20 self-start"
          >
            <Globe size={15} />
            Compartir Portal QR
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map(({ key, label, icon: Icon, value, color, bg, border }) => (
          <button
            key={key}
            id={`stat-${key}`}
            onClick={() => setFiltroEstado(key === 'total' ? 'todos' : key as TicketEstado)}
            className={`${bg} border ${border} rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              (key === 'total' && filtroEstado === 'todos') || filtroEstado === key
                ? 'ring-2 ring-offset-2 ring-offset-surface-950 ring-brand-500/50'
                : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </button>
        ))}
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="busqueda-tickets"
            type="text"
            placeholder="Buscar por título o cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-surface-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Filtro estado */}
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <select
            id="filtro-estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as any)}
            className="bg-surface-800 border border-slate-700 rounded-xl pl-8 pr-8 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 appearance-none transition-all min-w-[160px]"
          >
            <option value="todos">Todos los estados</option>
            <option value="abierto">Abiertos</option>
            <option value="en_proceso">En proceso</option>
            <option value="cerrado">Cerrados</option>
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
        <button
          onClick={() => setVerTareas(false)}
          className={`pb-2 text-sm font-medium transition-colors ${!verTareas ? 'text-brand-400 border-b-2 border-brand-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Tickets ({ticketsFiltrados.length})
        </button>
        <button
          onClick={() => setVerTareas(true)}
          className={`pb-2 text-sm font-medium transition-colors ${verTareas ? 'text-brand-400 border-b-2 border-brand-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Tareas Independientes ({tareas.length})
        </button>
      </div>

      {/* Lista de tickets/tareas */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-brand-400" />
        </div>
      ) : ticketsFiltrados.length === 0 ? (
        <div className="text-center py-16">
          <TicketIcon size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No hay elementos {filtroEstado !== 'todos' ? `con estado "${filtroEstado}"` : ''}</p>
          <p className="text-sm text-slate-600 mt-1">
            {busqueda ? 'Intenta con otro término de búsqueda.' : 'Los nuevos elementos aparecerán aquí.'}
          </p>
        </div>
      ) : verTareas ? (
        <div className="space-y-3">
          {tareas.map(tarea => {
            const estadoCfg = ESTADO_CONFIG[tarea.estado] || ESTADO_CONFIG.abierto
            return (
              <div key={tarea.id} className="bg-surface-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 hover:shadow-card animate-slide-up">
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${PRIORIDAD_DOT[tarea.prioridad as keyof typeof PRIORIDAD_DOT] || PRIORIDAD_DOT.baja}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-white text-sm leading-tight truncate">{tarea.titulo}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 ${estadoCfg.badge}`}>{estadoCfg.label}</span>
                    </div>
                    {tarea.descripcion && <p className="text-xs text-slate-500 mb-2 truncate">{tarea.descripcion}</p>}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Timer size={11} /> {format(new Date(tarea.creado_en), "dd MMM, HH:mm", { locale: es })}</span>
                      {tarea.ticket_id && <span className="text-brand-400">Atado al Ticket: {tarea.ticket_id.substring(0,8).toUpperCase()}</span>}
                    </div>
                    {/* Acciones */}
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800">
                      {tarea.estado !== 'completada' && (['tecnico', 'admin'] as string[]).includes(currentUser.rol) && (
                        <button onClick={() => navigate(`/tecnico/tarea/${tarea.id}`)} className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors">
                          <CheckCircle2 size={11} /> Completar Tarea
                        </button>
                      )}
                      {tarea.pdf_url && (
                        <a href={tarea.pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors">
                          <FileText size={11} /> Ver Certificado PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {ticketsFiltrados.map(ticket => {
            const estadoCfg = ESTADO_CONFIG[ticket.estado]
            return (
              <div
                key={ticket.id}
                id={`ticket-row-${ticket.id.substring(0, 8)}`}
                className="bg-surface-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 hover:shadow-card animate-slide-up"
              >
                <div className="flex items-start gap-3">
                  {/* Prioridad dot */}
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${PRIORIDAD_DOT[ticket.prioridad]}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-white text-sm leading-tight truncate">
                        {ticket.titulo}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 ${estadoCfg.badge}`}>
                        {estadoCfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      {ticket.cliente ? (
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          {ticket.cliente.nombre}
                        </span>
                      ) : (ticket.contacto_nombre ? (
                        <span className="flex items-center gap-1 text-indigo-400 bg-indigo-500/10 px-2 rounded">
                          <Users size={11} />
                          {ticket.contacto_nombre} {ticket.contacto_empresa ? `(${ticket.contacto_empresa})` : ''} - Invitado
                        </span>
                      ) : null)}
                      <span className="capitalize">📁 {ticket.categoria || 'General'}</span>
                      <span className="flex items-center gap-1">
                        <Timer size={11} />
                        {format(new Date(ticket.creado_en), "dd MMM, HH:mm", { locale: es })}
                      </span>
                    </div>

                    {/* Lista de Tareas del Ticket */}
                    {ticket.tareas && ticket.tareas.length > 0 && (
                      <div className="mt-3 p-3 bg-surface-950/40 border border-slate-800 rounded-xl space-y-2">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Tareas asociadas ({ticket.tareas.length})</span>
                        <div className="space-y-1.5">
                          {ticket.tareas.map(tarea => {
                            const completada = tarea.estado === 'completada'
                            return (
                              <div key={tarea.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-800/30 last:border-b-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${completada ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                  <span className={`text-xs truncate ${completada ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                    {tarea.titulo}
                                  </span>
                                </div>
                                
                                {completada ? (
                                  <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">Completada</span>
                                ) : (
                                  <button
                                    onClick={() => navigate(`/tecnico/tarea/${tarea.id}`)}
                                    className="text-[10px] text-brand-400 hover:text-brand-300 font-semibold bg-brand-500/10 hover:bg-brand-500/20 px-2.5 py-1 rounded-full transition-colors"
                                  >
                                    Realizar →
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Acciones rápidas (Admin y Técnico) */}
                    {ticket.estado !== 'cerrado' && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800">
                        {/* ── Acciones de ADMIN ── */}
                        {currentUser.rol === 'admin' && (
                          <>
                            {/* Asignar técnico */}
                            {tecnicos.length > 0 && (
                              <select
                                id={`asignar-tecnico-${ticket.id.substring(0, 8)}`}
                                defaultValue={ticket.tecnico_asignado_id || ''}
                                onChange={async (e) => {
                                  if (e.target.value) {
                                    await asignarTecnico(ticket.id, e.target.value)
                                  }
                                }}
                                className="bg-surface-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none"
                              >
                                <option value="">Asignar técnico...</option>
                                {tecnicos.map(t => (
                                  <option key={t.id} value={t.id}>{t.nombre}</option>
                                ))}
                              </select>
                            )}

                            {/* Asignar cliente */}
                            {clientes.length > 0 && (
                              <select
                                id={`asignar-cliente-${ticket.id.substring(0, 8)}`}
                                defaultValue={ticket.cliente_id || ''}
                                onChange={async (e) => {
                                  if (e.target.value && actualizarTicket) {
                                    await actualizarTicket(ticket.id, { cliente_id: e.target.value })
                                  }
                                }}
                                className="bg-surface-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none max-w-[140px] truncate"
                              >
                                <option value="">Asignar cliente...</option>
                                {clientes.map(c => (
                                  <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                              </select>
                            )}
                          </>
                        )}

                        {/* ── Acciones de TÉCNICO sin asignar (Tomar Ticket) ── */}
                        {currentUser.rol === 'tecnico' && !ticket.tecnico_asignado_id && (
                          <button
                            onClick={async () => {
                              await asignarTecnico(ticket.id, currentUser.id)
                              toast.success('Ticket asignado correctamente.')
                            }}
                            className="bg-brand-600 hover:bg-brand-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                          >
                            🙋‍♂️ Tomar Ticket
                          </button>
                        )}

                        {/* ── Acciones compartidas (Admin, o Técnico asignado) ── */}
                        {(currentUser.rol === 'admin' || (currentUser.rol === 'tecnico' && ticket.tecnico_asignado_id === currentUser.id)) && (
                          <>
                            {/* Cambiar estado */}
                            <select
                              id={`cambiar-estado-${ticket.id.substring(0, 8)}`}
                              value={ticket.estado}
                              onChange={async (e) => {
                                await actualizarEstado(ticket.id, e.target.value as TicketEstado)
                              }}
                              className="bg-surface-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none"
                            >
                              <option value="abierto">Abierto</option>
                              <option value="en_proceso">En Proceso</option>
                              <option value="cerrado">Cerrado</option>
                            </select>

                            <button
                              id={`ver-ticket-${ticket.id.substring(0, 8)}`}
                              onClick={() => setTicketSeleccionado(ticket)}
                              className="flex items-center gap-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                            >
                              <Eye size={11} />
                              Ver QR
                            </button>

                            <button
                              onClick={() => navigate(`/${currentUser.rol}/nueva-tarea?ticket_id=${ticket.id}`)}
                              className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                            >
                              + Tarea
                            </button>

                            {/* Generar Reporte */}
                            <button
                              id={`generar-reporte-${ticket.id.substring(0, 8)}`}
                              onClick={() => navigate(`/tecnico/reporte/${ticket.id}`)}
                              className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                            >
                              <FileText size={11} />
                              Reporte
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal QR del ticket (Admin) */}
      {ticketSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setTicketSeleccionado(null)}
        >
          <div
            className="bg-surface-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-white text-center mb-1 text-sm">QR del Ticket</h3>
            <p className="text-xs text-slate-500 text-center mb-5 truncate">{ticketSeleccionado.titulo}</p>
            <div className="flex flex-col items-center gap-4">
              <QRTicket
                ticketId={ticketSeleccionado.id}
                qrData={ticketSeleccionado.qr_code_data}
                size={180}
              />
            </div>
            <button
              id="btn-cerrar-modal-qr"
              onClick={() => setTicketSeleccionado(null)}
              className="w-full mt-5 py-2.5 bg-surface-800 hover:bg-surface-700 text-slate-300 text-sm font-medium rounded-xl border border-slate-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal Portal QR Público (Admin) */}
      {mostrarPortalQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setMostrarPortalQR(false)}
        >
          <div
            className="bg-surface-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base">Portal Público de Soporte</h3>
              <button
                onClick={() => setMostrarPortalQR(false)}
                className="p-1 text-slate-500 hover:text-white rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Comparte este código QR o enlace con tus clientes para que puedan registrar tickets de soporte técnico libremente sin necesidad de iniciar sesión.
            </p>

            <div className="flex flex-col items-center gap-5">
              <div className="bg-white p-3 rounded-2xl border border-slate-700">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent((import.meta.env.VITE_APP_URL || window.location.origin) + '/solicitar-soporte')}`}
                  alt="QR Portal Público"
                  className="w-36 h-36"
                />
              </div>

              <div className="w-full bg-surface-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Enlace de acceso libre</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[11px] text-brand-400 font-mono bg-surface-900 py-1.5 px-2.5 rounded-lg overflow-x-auto whitespace-nowrap">
                    {(import.meta.env.VITE_APP_URL || window.location.origin) + '/solicitar-soporte'}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText((import.meta.env.VITE_APP_URL || window.location.origin) + '/solicitar-soporte')
                      toast.success('Enlace copiado al portapapeles')
                    }}
                    className="p-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-lg transition-colors shrink-0"
                    title="Copiar enlace"
                  >
                    <Copy size={14} />
                  </button>
                  <a
                    href="/solicitar-soporte"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-lg transition-colors shrink-0"
                    title="Abrir portal"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>

            <button
              onClick={() => setMostrarPortalQR(false)}
              className="w-full mt-6 py-2.5 bg-surface-800 hover:bg-surface-700 text-slate-300 text-sm font-medium rounded-xl border border-slate-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
