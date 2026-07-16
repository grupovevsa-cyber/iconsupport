import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, LogOut, History, FileText, TicketIcon, Loader2, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckInOut } from '../../components/CheckInOut'
import { ReportePDF } from '../../components/ReportePDF'
import { useAsistencias } from '../../hooks/useAsistencias'
import { supabase } from '../../lib/supabaseClient'
import type { Asistencia, Profile, Ticket } from '../../types'

// ============================================================
// Página: Asistencia del Técnico
// Check-in/Out + historial + reporte PDF
// ============================================================

interface AsistenciaPageProps {
  tecnico: Profile
}

export function AsistenciaPage({ tecnico }: AsistenciaPageProps) {
  const navigate = useNavigate()
  const { historial, fetchHistorial, asistenciaActiva } = useAsistencias()
  const [ticketsAbiertos, setTicketsAbiertos] = useState<Ticket[]>([])
  const [ticketSeleccionado, setTicketSeleccionado] = useState<string | undefined>()
  const [mostrarReporte, setMostrarReporte] = useState(false)
  const [asistenciaReporte, setAsistenciaReporte] = useState<Asistencia | null>(null)
  const [clienteReporte, setClienteReporte] = useState<Profile | null>(null)
  const [ticketReporte, setTicketReporte] = useState<Ticket | null>(null)
  const [tab, setTab] = useState<'asistencia' | 'historial'>('asistencia')

  useEffect(() => {
    fetchHistorial(tecnico.id)
    // Cargar tickets asignados al técnico que están en proceso
    supabase
      .from('tickets')
      .select('*, cliente:profiles!tickets_cliente_id_fkey(*)')
      .eq('tecnico_asignado_id', tecnico.id)
      .in('estado', ['abierto', 'en_proceso'])
      .order('creado_en', { ascending: false })
      .then(({ data }) => setTicketsAbiertos((data as Ticket[]) || []))
  }, [tecnico.id])

  const handleIniciarReporte = async (asistencia: Asistencia) => {
    // Cargar datos del ticket y cliente para el PDF
    if (!asistencia.ticket_id) return

    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, cliente:profiles!tickets_cliente_id_fkey(*)')
      .eq('id', asistencia.ticket_id)
      .single()

    if (!ticket) return

    setAsistenciaReporte(asistencia)
    setTicketReporte(ticket as Ticket)
    setClienteReporte((ticket as any).cliente as Profile)
    setMostrarReporte(true)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Control de Asistencia</h1>
        <p className="text-sm text-slate-400 mt-1">Registra tu entrada y salida de servicio técnico</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-800 rounded-xl p-1">
        <button
          id="tab-asistencia"
          onClick={() => setTab('asistencia')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === 'asistencia' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <LogIn size={15} />
          Check-in / Out
        </button>
        <button
          id="tab-historial"
          onClick={() => { setTab('historial'); fetchHistorial(tecnico.id) }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === 'historial' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History size={15} />
          Historial
        </button>
      </div>

      {/* Tab: Check-in/Out */}
      {tab === 'asistencia' && (
        <div className="space-y-5">
          {/* Selector de ticket */}
          {ticketsAbiertos.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="ticket-asistencia">
                <TicketIcon size={13} className="inline mr-1.5 text-brand-400" />
                Asociar a un ticket (opcional)
              </label>
              <select
                id="ticket-asistencia"
                value={ticketSeleccionado || ''}
                onChange={(e) => setTicketSeleccionado(e.target.value || undefined)}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 appearance-none transition-all"
              >
                <option value="">Sin ticket asociado</option>
                {ticketsAbiertos.map(t => (
                  <option key={t.id} value={t.id}>
                    #{t.id.substring(0, 8).toUpperCase()} — {t.titulo}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Componente de Check-in/Out */}
          <div className="bg-surface-900 border border-slate-800 rounded-2xl p-5">
            <CheckInOut
              tecnicoId={tecnico.id}
              ticketId={ticketSeleccionado}
              onCheckOut={(asistencia) => {
                fetchHistorial(tecnico.id)
                // Si tiene ticket, ofrecer generar reporte
                if (asistencia.ticket_id) {
                  handleIniciarReporte(asistencia)
                }
              }}
            />
          </div>

          {/* Botón reporte (si hay asistencia activa con ticket) */}
          {asistenciaActiva?.ticket_id && (
            <button
              id="btn-iniciar-reporte"
              onClick={() => handleIniciarReporte(asistenciaActiva)}
              className="w-full flex items-center justify-center gap-2 bg-surface-800 hover:bg-surface-700 text-slate-300 border border-slate-700 hover:border-brand-500/40 font-medium py-3 rounded-xl text-sm transition-all"
            >
              <FileText size={15} className="text-brand-400" />
              Preparar Reporte de Cierre
            </button>
          )}
        </div>
      )}

      {/* Tab: Historial */}
      {tab === 'historial' && (
        <div className="space-y-3">
          {historial.length === 0 ? (
            <div className="text-center py-10">
              <History size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No hay registros de asistencia aún.</p>
            </div>
          ) : (
            historial.map(asist => (
              <div
                key={asist.id}
                className="bg-surface-900 border border-slate-800 rounded-2xl p-4 animate-slide-up"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${asist.hora_salida ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                      <span className="text-xs font-medium text-slate-400">
                        {asist.hora_salida ? 'Completado' : 'En curso'}
                      </span>
                      {asist.duracion_minutos && (
                        <span className="text-xs text-slate-600">
                          · {asist.duracion_minutos} min
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {format(new Date(asist.hora_entrada), "EEEE dd 'de' MMMM", { locale: es })}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>Entrada: {format(new Date(asist.hora_entrada), "HH:mm")}</span>
                      {asist.hora_salida && (
                        <span>Salida: {format(new Date(asist.hora_salida), "HH:mm")}</span>
                      )}
                    </div>
                    {asist.ticket_id && (
                      <p className="text-xs text-brand-400/70 mt-1">
                        🎫 Ticket #{asist.ticket_id.substring(0, 8).toUpperCase()}
                      </p>
                    )}
                    {asist.direccion_entrada && (
                      <p className="text-xs text-slate-600 mt-1 truncate">
                        📍 {asist.direccion_entrada}
                      </p>
                    )}
                  </div>

                  {/* Generar reporte */}
                  {asist.hora_salida && asist.ticket_id && (
                    <button
                      id={`btn-reporte-${asist.id.substring(0, 8)}`}
                      onClick={() => handleIniciarReporte(asist)}
                      className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 px-2.5 py-1.5 rounded-lg border border-brand-500/20 transition-colors shrink-0"
                    >
                      <FileText size={12} />
                      Reporte
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Reporte PDF */}
      {mostrarReporte && ticketReporte && clienteReporte && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setMostrarReporte(false)}
        >
          <div
            className="bg-surface-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <ReportePDF
              ticket={ticketReporte}
              tecnico={tecnico}
              cliente={clienteReporte}
              asistencia={asistenciaReporte || undefined}
              onReporteCreado={(url) => {
                setTimeout(() => setMostrarReporte(false), 2000)
                fetchHistorial(tecnico.id)
              }}
            />
            <button
              id="btn-cerrar-reporte"
              onClick={() => setMostrarReporte(false)}
              className="w-full mt-4 py-2.5 bg-surface-800 hover:bg-surface-700 text-slate-400 text-sm rounded-xl border border-slate-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
