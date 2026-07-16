import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Clock, User, Tag, AlertCircle, CheckCircle2,
  Loader2, MessageSquare, Zap, Timer, CheckSquare, Trash2, Plus, Circle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'react-hot-toast'
import { useTickets } from '../../hooks/useTickets'
import { useAuth } from '../../hooks/useAuth'
import { useTasks } from '../../hooks/useTasks'
import { QRTicket } from '../../components/QRTicket'
import { supabase } from '../../lib/supabaseClient'
import type { Ticket, TareaEstado, Profile } from '../../types'

// ============================================================
// Página: Seguimiento de Ticket (pública o autenticada)
// Accesible via QR code
// ============================================================

const ESTADO_CONFIG = {
  abierto:    { label: 'Abierto',     color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: AlertCircle },
  en_proceso: { label: 'En Proceso',  color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: Timer },
  cerrado:    { label: 'Cerrado',     color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
}

const PRIORIDAD_CONFIG = {
  alta:   { label: 'Alta',   color: 'text-red-400',   dot: 'bg-red-400' },
  media:  { label: 'Media',  color: 'text-amber-400', dot: 'bg-amber-400' },
  baja:   { label: 'Baja',   color: 'text-emerald-400', dot: 'bg-emerald-400' },
}

export function SeguimientoPage() {
  const { id } = useParams<{ id: string }>()
  const { getTicket } = useTickets()
  const { user } = useAuth()
  const { tareas, fetchTareas, crearTarea, actualizarEstadoTarea, eliminarTarea } = useTasks()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [cargando, setCargando] = useState(true)

  // Formulario de Tareas
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevaDesc, setNuevaDesc] = useState('')
  const [tecnicoAsignadoId, setTecnicoAsignadoId] = useState('')
  const [tecnicos, setTecnicos] = useState<Profile[]>([])
  const [guardandoTarea, setGuardandoTarea] = useState(false)

  useEffect(() => {
    if (!id) return
    getTicket(id).then(t => {
      setTicket(t)
      setCargando(false)
      // Si el ticket tiene técnico asignado, pre-seleccionarlo
      if (t?.tecnico_asignado_id) {
        setTecnicoAsignadoId(t.tecnico_asignado_id)
      }
    })
    fetchTareas(id)
  }, [id])

  useEffect(() => {
    if (user?.profile?.rol === 'admin' || user?.profile?.rol === 'tecnico') {
      supabase.from('profiles').select('*').eq('rol', 'tecnico')
        .then(({ data }) => setTecnicos((data as Profile[]) || []))
    }
  }, [user])

  const handleCrearTarea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoTitulo.trim() || !id) return
    setGuardandoTarea(true)
    try {
      await crearTarea(id, nuevoTitulo.trim(), nuevaDesc.trim(), tecnicoAsignadoId || undefined)
      setNuevoTitulo('')
      setNuevaDesc('')
      toast.success('Tarea agregada correctamente.')
    } catch (err: any) {
      toast.error('Error al crear tarea: ' + err.message)
    } finally {
      setGuardandoTarea(false)
    }
  }

  const handleActualizarEstado = async (tareaId: string, estado: TareaEstado) => {
    if (!id) return
    try {
      await actualizarEstadoTarea(id, tareaId, estado)
      toast.success('Estado de la tarea actualizado.')
    } catch (err: any) {
      toast.error('Error al actualizar estado: ' + err.message)
    }
  }

  const handleEliminar = async (tareaId: string) => {
    if (!id || !window.confirm('¿Seguro que deseas eliminar esta tarea?')) return
    try {
      await eliminarTarea(id, tareaId)
      toast.success('Tarea eliminada.')
    } catch (err: any) {
      toast.error('Error al eliminar tarea: ' + err.message)
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 size={24} className="animate-spin text-brand-400" />
          <span>Cargando información del ticket...</span>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Ticket no encontrado</h2>
          <p className="text-slate-400 text-sm">El ticket que buscas no existe o no tienes acceso.</p>
        </div>
      </div>
    )
  }

  const estadoCfg = ESTADO_CONFIG[ticket.estado]
  const prioridadCfg = PRIORIDAD_CONFIG[ticket.prioridad]
  const EstadoIcon = estadoCfg.icon

  return (
    <div className="min-h-screen bg-surface-950 hero-pattern">
      {/* Navbar simple */}
      <nav className="border-b border-slate-800 bg-surface-900/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm">ICON Support</span>
          <span className="text-slate-600 text-sm">— Seguimiento de Ticket</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
        {/* Estado principal */}
        <div className={`rounded-2xl p-5 border ${estadoCfg.bg} ${estadoCfg.border}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${estadoCfg.bg} border ${estadoCfg.border}`}>
                <EstadoIcon size={20} className={estadoCfg.color} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Estado actual</p>
                <p className={`text-lg font-bold ${estadoCfg.color}`}>{estadoCfg.label}</p>
              </div>
            </div>
            {/* Prioridad */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${prioridadCfg.dot}`} />
              <span className={`text-xs font-semibold ${prioridadCfg.color}`}>
                Prioridad {prioridadCfg.label}
              </span>
            </div>
          </div>
        </div>

        {/* Título y descripción */}
        <div className="bg-surface-900 rounded-2xl border border-slate-800 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center shrink-0">
              <Tag size={15} className="text-brand-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">{ticket.titulo}</h1>
              <p className="text-xs text-slate-500 mt-1 capitalize">
                Categoría: {ticket.categoria || 'General'}
              </p>
            </div>
          </div>
          {ticket.descripcion && (
            <p className="text-sm text-slate-300 leading-relaxed bg-surface-800/50 rounded-xl p-3 border border-slate-800">
              {ticket.descripcion}
            </p>
          )}
        </div>

        {/* Información de la visita */}
        <div className="bg-surface-900 rounded-2xl border border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Información</h2>

          <div className="grid grid-cols-1 gap-3">
            {/* Cliente */}
            {ticket.cliente && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center">
                  <User size={14} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">Cliente</p>
                  <p className="text-sm text-white font-medium">{ticket.cliente.nombre}</p>
                </div>
              </div>
            )}

            {/* Técnico asignado */}
            {ticket.tecnico_asignado && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <Zap size={14} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">Técnico asignado</p>
                  <p className="text-sm text-white font-medium">{ticket.tecnico_asignado.nombre}</p>
                </div>
              </div>
            )}

            {/* Fecha de creación */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center">
                <Clock size={14} className="text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Creado</p>
                <p className="text-sm text-white font-medium">
                  {format(new Date(ticket.creado_en), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tareas del Ticket */}
        <div className="bg-surface-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare size={14} className="text-brand-400" />
              Tareas y Actividades
            </h2>
            <span className="text-xs bg-surface-800 text-slate-400 px-2.5 py-0.5 rounded-full font-semibold">
              {tareas.filter(t => t.estado === 'completada').length} / {tareas.length} completadas
            </span>
          </div>

          {/* Lista de Tareas */}
          {tareas.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No hay tareas creadas para este ticket.</p>
          ) : (
            <div className="space-y-3">
              {tareas.map(tarea => {
                const isCompleted = tarea.estado === 'completada';
                const isClosed = tarea.estado === 'cerrada';
                return (
                  <div
                    key={tarea.id}
                    className={`flex items-start justify-between gap-3 p-3 rounded-xl border ${
                      isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/10'
                        : isClosed
                        ? 'bg-slate-900 border-slate-800/40 opacity-60'
                        : 'bg-surface-800/40 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Estado Icon */}
                      <div className="mt-0.5 shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : isClosed ? (
                          <Circle size={16} className="text-slate-600 fill-slate-800" />
                        ) : (
                          <Circle size={16} className="text-amber-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${isCompleted ? 'text-emerald-300 line-through' : isClosed ? 'text-slate-500 line-through' : 'text-white'}`}>
                          {tarea.titulo}
                        </p>
                        {tarea.descripcion && (
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{tarea.descripcion}</p>
                        )}
                        {tarea.tecnico && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full w-fit">
                            <span className="font-semibold">Técnico:</span> {tarea.tecnico.nombre}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acciones para Técnicos y Admins */}
                    {(user?.profile?.rol === 'admin' || user?.profile?.rol === 'tecnico') && ticket.estado !== 'cerrado' && (
                      <div className="flex items-center gap-1 shrink-0">
                        {tarea.estado !== 'completada' && (
                          <button
                            onClick={() => handleActualizarEstado(tarea.id, 'completada')}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded-lg transition-colors border border-emerald-500/20"
                            title="Completar"
                          >
                            <CheckCircle2 size={13} />
                          </button>
                        )}
                        {tarea.estado !== 'abierta' && (
                          <button
                            onClick={() => handleActualizarEstado(tarea.id, 'abierta')}
                            className="p-1.5 text-amber-400 hover:text-amber-300 bg-amber-500/10 rounded-lg transition-colors border border-amber-500/20"
                            title="Reabrir"
                          >
                            <Timer size={13} />
                          </button>
                        )}
                        {tarea.estado !== 'cerrada' && (
                          <button
                            onClick={() => handleActualizarEstado(tarea.id, 'cerrada')}
                            className="p-1.5 text-slate-400 hover:text-slate-300 bg-slate-800 rounded-lg transition-colors border border-slate-700"
                            title="Cerrar"
                          >
                            <Circle size={13} />
                          </button>
                        )}
                        {user?.profile?.rol === 'admin' && (
                          <button
                            onClick={() => handleEliminar(tarea.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Formulario de creación (solo Admin/Técnico y ticket abierto/proceso) */}
          {(user?.profile?.rol === 'admin' || user?.profile?.rol === 'tecnico') && ticket.estado !== 'cerrado' && (
            <form onSubmit={handleCrearTarea} className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nueva Tarea</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Título de la tarea... (Ej. Reemplazar cable de red)"
                  value={nuevoTitulo}
                  onChange={e => setNuevoTitulo(e.target.value)}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                
                <select
                  value={tecnicoAsignadoId}
                  onChange={e => setTecnicoAsignadoId(e.target.value)}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none"
                >
                  <option value="">Asignar a técnico (opcional)...</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                placeholder="Descripción opcional..."
                value={nuevaDesc}
                onChange={e => setNuevaDesc(e.target.value)}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />

              <button
                type="submit"
                disabled={guardandoTarea}
                className="btn-primary w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold"
              >
                {guardandoTarea ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={13} />
                    Agregar Tarea
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Comentarios */}
        {ticket.comentarios && ticket.comentarios.filter(c => !c.es_interno).length > 0 && (
          <div className="bg-surface-900 rounded-2xl border border-slate-800 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare size={14} />
              Actualizaciones
            </h2>
            <div className="space-y-3">
              {ticket.comentarios
                .filter(c => !c.es_interno)
                .map(comentario => (
                  <div key={comentario.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-brand-400">
                        {comentario.autor?.nombre.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 bg-surface-800/60 rounded-xl p-3 border border-slate-800">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-300">
                          {comentario.autor?.nombre || 'Sistema'}
                        </span>
                        <span className="text-xs text-slate-600">
                          {format(new Date(comentario.creado_en), "dd/MM HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{comentario.mensaje}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* QR del ticket */}
        <div className="bg-surface-900 rounded-2xl border border-slate-800 p-5">
          <QRTicket
            ticketId={ticket.id}
            qrData={ticket.qr_code_data}
            titulo={ticket.titulo}
            size={160}
          />
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-700 pb-4">
          {import.meta.env.VITE_EMPRESA_NOMBRE || 'ICON Support'} — Sistema de Soporte Técnico
        </div>
      </div>
    </div>
  )
}

