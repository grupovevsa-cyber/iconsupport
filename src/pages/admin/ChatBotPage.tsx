import React, { useState, useEffect, useRef } from 'react'
import {
  MessageCircle, Settings, BarChart3, Wifi, WifiOff, Clock,
  User, Bot, Send, RefreshCw, Save, ToggleLeft, ToggleRight,
  Phone, CheckCircle2, AlertCircle, Loader2, Zap, Calendar,
  MessageSquare, Ticket, ChevronRight
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'react-hot-toast'
import { useWAConversaciones, useBotConfig } from '../../hooks/useWABot'
import type { WASesion, WAMensaje } from '../../hooks/useWABot'

// ============================================================
// ChatBotPage — Panel de administración del Bot de WhatsApp
// ============================================================

type TabType = 'conversaciones' | 'configuracion' | 'estadisticas'

// ── Util: color de estado del bot ─────────────────────────
function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    menu: 'bg-slate-700 text-slate-300',
    crear_ticket_titulo: 'bg-blue-500/20 text-blue-400',
    crear_ticket_desc: 'bg-blue-500/20 text-blue-400',
    crear_ticket_prioridad: 'bg-blue-500/20 text-blue-400',
    seguimiento: 'bg-amber-500/20 text-amber-400',
    servicio_desc: 'bg-red-500/20 text-red-400',
    tarea_tecnico: 'bg-purple-500/20 text-purple-400',
    tarea_desc: 'bg-purple-500/20 text-purple-400',
    ia_libre: 'bg-emerald-500/20 text-emerald-400',
  }
  return map[estado] || 'bg-slate-700 text-slate-300'
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// ── Componente principal ───────────────────────────────────
export function ChatBotPage() {
  const [tab, setTab] = useState<TabType>('conversaciones')
  const { sesiones, loading: loadingSesiones, fetchMensajes } = useWAConversaciones()
  const { config, loading: loadingConfig, guardando, guardarConfig } = useBotConfig()

  // ── Estado conversaciones ──────────────────────────────
  const [sesionActiva, setSesionActiva] = useState<WASesion | null>(null)
  const [mensajes, setMensajes] = useState<WAMensaje[]>([])
  const [loadingMensajes, setLoadingMensajes] = useState(false)
  const mensajesEndRef = useRef<HTMLDivElement>(null)

  // ── Estado configuración ───────────────────────────────
  const [formConfig, setFormConfig] = useState({
    nombre_bot: '',
    numero_whatsapp: '',
    mensaje_bienvenida: '',
    horario_inicio: '08:00',
    horario_fin: '18:00',
    dias_habiles: [1, 2, 3, 4, 5] as number[],
    modo_ia_activo: true,
    ia_system_prompt: '',
  })

  useEffect(() => {
    if (config) {
      setFormConfig({
        nombre_bot: config.nombre_bot,
        numero_whatsapp: config.numero_whatsapp,
        mensaje_bienvenida: config.mensaje_bienvenida,
        horario_inicio: config.horario_inicio,
        horario_fin: config.horario_fin,
        dias_habiles: config.dias_habiles,
        modo_ia_activo: config.modo_ia_activo,
        ia_system_prompt: config.ia_system_prompt,
      })
    }
  }, [config])

  // ── Cargar mensajes de sesión activa ───────────────────
  const handleSeleccionarSesion = async (sesion: WASesion) => {
    setSesionActiva(sesion)
    setLoadingMensajes(true)
    const msgs = await fetchMensajes(sesion.id)
    setMensajes(msgs)
    setLoadingMensajes(false)
    setTimeout(() => mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  // ── Guardar config ─────────────────────────────────────
  const handleGuardarConfig = async () => {
    const ok = await guardarConfig(formConfig)
    if (ok) toast.success('Configuración guardada correctamente.')
    else toast.error('Error al guardar la configuración.')
  }

  // ── Estadísticas simples ───────────────────────────────
  const stats = {
    totalSesiones: sesiones.length,
    activas: sesiones.filter(s => {
      const diff = Date.now() - new Date(s.ultimo_mensaje).getTime()
      return diff < 1000 * 60 * 30 // activas en últimos 30min
    }).length,
    enIA: sesiones.filter(s => s.estado === 'ia_libre').length,
    enCreacion: sesiones.filter(s => s.estado.startsWith('crear_ticket')).length,
  }

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-surface-900/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <MessageCircle size={18} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Bot WhatsApp</h1>
              <p className="text-xs text-slate-500">{config?.nombre_bot || 'Asistente ICON Support'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${config?.modo_ia_activo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
              <Zap size={10} />
              {config?.modo_ia_activo ? 'IA Activa' : 'IA Desactivada'}
            </div>
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400">
              <Phone size={10} />
              {config?.numero_whatsapp || 'Sin número'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0">
          {[
            { id: 'conversaciones', label: 'Conversaciones', icon: MessageSquare },
            { id: 'configuracion', label: 'Configuración', icon: Settings },
            { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as TabType)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                tab === id
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ══════════ TAB: CONVERSACIONES ════════════════════ */}
        {tab === 'conversaciones' && (
          <div className="flex gap-4 h-[calc(100vh-180px)]">
            {/* Lista de sesiones */}
            <div className="w-80 shrink-0 bg-surface-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Conversaciones</p>
                <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">
                  {sesiones.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingSesiones ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 size={20} className="animate-spin text-brand-400" />
                  </div>
                ) : sesiones.length === 0 ? (
                  <div className="text-center py-12 text-slate-600">
                    <MessageCircle size={32} className="mx-auto mb-2" />
                    <p className="text-sm">Sin conversaciones aún</p>
                  </div>
                ) : sesiones.map(sesion => {
                  const activa = Date.now() - new Date(sesion.ultimo_mensaje).getTime() < 1800000
                  return (
                    <button
                      key={sesion.id}
                      onClick={() => handleSeleccionarSesion(sesion)}
                      className={`w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-surface-800 transition-colors ${sesionActiva?.id === sesion.id ? 'bg-surface-800' : ''}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-surface-700 flex items-center justify-center shrink-0">
                            <User size={15} className="text-slate-400" />
                          </div>
                          {activa && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-surface-900" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">
                            {sesion.nombre || sesion.telefono}
                          </p>
                          <p className="text-xs text-slate-500 truncate">+{sesion.telefono}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${estadoBadge(sesion.estado)}`}>
                              {sesion.estado.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-600">
                              {formatDistanceToNow(new Date(sesion.ultimo_mensaje), { addSuffix: true, locale: es })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Vista de mensajes */}
            <div className="flex-1 bg-surface-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
              {!sesionActiva ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle size={40} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Selecciona una conversación</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header conversación */}
                  <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center">
                      <User size={14} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{sesionActiva.nombre || 'Usuario'}</p>
                      <p className="text-xs text-slate-500">+{sesionActiva.telefono}</p>
                    </div>
                    <div className={`ml-auto text-xs px-2 py-1 rounded-full ${estadoBadge(sesionActiva.estado)}`}>
                      {sesionActiva.estado.replace(/_/g, ' ')}
                    </div>
                  </div>

                  {/* Mensajes */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loadingMensajes ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 size={20} className="animate-spin text-brand-400" />
                      </div>
                    ) : mensajes.map(msg => (
                      <div key={msg.id} className={`flex ${msg.rol === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`flex items-end gap-2 max-w-[80%] ${msg.rol === 'user' ? '' : 'flex-row-reverse'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.rol === 'user' ? 'bg-slate-700' : 'bg-brand-500/20'}`}>
                            {msg.rol === 'user'
                              ? <User size={11} className="text-slate-400" />
                              : <Bot size={11} className="text-brand-400" />
                            }
                          </div>
                          <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                            msg.rol === 'user'
                              ? 'bg-surface-800 text-slate-200 rounded-tl-sm'
                              : 'bg-brand-600/20 border border-brand-500/20 text-slate-200 rounded-tr-sm'
                          }`}>
                            {msg.contenido}
                            <p className="text-[10px] text-slate-500 mt-1">
                              {format(new Date(msg.creado_en), 'HH:mm', { locale: es })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={mensajesEndRef} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════ TAB: CONFIGURACIÓN ═════════════════════ */}
        {tab === 'configuracion' && (
          <div className="max-w-2xl space-y-5">
            {loadingConfig ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={24} className="animate-spin text-brand-400" />
              </div>
            ) : (
              <>
                {/* Info del webhook */}
                <div className="bg-brand-500/5 border border-brand-500/20 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-brand-400 mb-2 flex items-center gap-1.5">
                    <Zap size={12} /> URL del Webhook (configúrala en Meta Developers)
                  </p>
                  <code className="text-xs text-slate-300 bg-surface-900 px-3 py-2 rounded-lg block break-all">
                    https://nxfbagnimvvkurhlyhwg.supabase.co/functions/v1/whatsapp-webhook
                  </code>
                </div>

                {/* Identidad del bot */}
                <ConfigSection title="Identidad del Bot" icon={<Bot size={14} className="text-brand-400" />}>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Nombre del Bot</label>
                    <input
                      value={formConfig.nombre_bot}
                      onChange={e => setFormConfig(p => ({ ...p, nombre_bot: e.target.value }))}
                      className="field-input"
                      placeholder="Asistente ICON Support"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Número de WhatsApp Business</label>
                    <input
                      value={formConfig.numero_whatsapp}
                      onChange={e => setFormConfig(p => ({ ...p, numero_whatsapp: e.target.value }))}
                      className="field-input"
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                </ConfigSection>

                {/* Mensaje de bienvenida */}
                <ConfigSection title="Mensaje de Bienvenida" icon={<MessageSquare size={14} className="text-brand-400" />}>
                  <textarea
                    value={formConfig.mensaje_bienvenida}
                    onChange={e => setFormConfig(p => ({ ...p, mensaje_bienvenida: e.target.value }))}
                    rows={6}
                    className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none font-mono"
                    placeholder="¡Hola! 👋 Bienvenido a ICON Support..."
                  />
                  <p className="text-xs text-slate-600">Usa *texto* para negritas y _texto_ para cursiva (formato WhatsApp).</p>
                </ConfigSection>

                {/* Horario de atención */}
                <ConfigSection title="Horario de Atención" icon={<Clock size={14} className="text-brand-400" />}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Inicio</label>
                      <input type="time" value={formConfig.horario_inicio}
                        onChange={e => setFormConfig(p => ({ ...p, horario_inicio: e.target.value }))}
                        className="field-input" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Fin</label>
                      <input type="time" value={formConfig.horario_fin}
                        onChange={e => setFormConfig(p => ({ ...p, horario_fin: e.target.value }))}
                        className="field-input" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">Días Hábiles</label>
                    <div className="flex gap-2">
                      {DIAS_SEMANA.map((dia, idx) => {
                        const activo = formConfig.dias_habiles.includes(idx)
                        return (
                          <button key={idx}
                            onClick={() => setFormConfig(p => ({
                              ...p,
                              dias_habiles: activo
                                ? p.dias_habiles.filter(d => d !== idx)
                                : [...p.dias_habiles, idx].sort()
                            }))}
                            className={`w-10 h-10 rounded-xl text-xs font-medium transition-all ${activo ? 'bg-brand-600 text-white' : 'bg-surface-800 text-slate-500 hover:bg-surface-700'}`}
                          >
                            {dia}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </ConfigSection>

                {/* Bot-IA */}
                <ConfigSection title="Bot-Técnico IA (Gemini)" icon={<Zap size={14} className="text-emerald-400" />}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">Activar Bot IA fuera de horario</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Gemini responde automáticamente cuando no hay agentes disponibles
                      </p>
                    </div>
                    <button onClick={() => setFormConfig(p => ({ ...p, modo_ia_activo: !p.modo_ia_activo }))}>
                      {formConfig.modo_ia_activo
                        ? <ToggleRight size={32} className="text-emerald-400" />
                        : <ToggleLeft size={32} className="text-slate-600" />
                      }
                    </button>
                  </div>
                  {formConfig.modo_ia_activo && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Prompt del Sistema (instrucciones para la IA)</label>
                      <textarea
                        value={formConfig.ia_system_prompt}
                        onChange={e => setFormConfig(p => ({ ...p, ia_system_prompt: e.target.value }))}
                        rows={5}
                        className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none font-mono text-xs"
                        placeholder="Eres el asistente técnico de ICON Support..."
                      />
                    </div>
                  )}
                </ConfigSection>

                <button onClick={handleGuardarConfig} disabled={guardando}
                  className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-all text-sm">
                  {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {guardando ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ══════════ TAB: ESTADÍSTICAS ══════════════════════ */}
        {tab === 'estadisticas' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total conversaciones', value: stats.totalSesiones, icon: MessageCircle, color: 'brand' },
                { label: 'Activas (30 min)', value: stats.activas, icon: Wifi, color: 'emerald' },
                { label: 'En modo IA', value: stats.enIA, icon: Zap, color: 'amber' },
                { label: 'Creando ticket', value: stats.enCreacion, icon: Ticket, color: 'purple' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-surface-900 border border-slate-800 rounded-2xl p-5">
                  <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-${color}-500/10`}>
                    <Icon size={18} className={`text-${color}-400`} />
                  </div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Sesiones recientes como tabla */}
            <div className="bg-surface-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">Sesiones Recientes</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-800">
                      <th className="text-left px-5 py-3">Contacto</th>
                      <th className="text-left px-3 py-3">Estado</th>
                      <th className="text-left px-3 py-3">Último mensaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sesiones.slice(0, 20).map(s => (
                      <tr key={s.id} className="border-b border-slate-800/50 hover:bg-surface-800 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-white font-medium">{s.nombre || 'Sin nombre'}</p>
                          <p className="text-xs text-slate-500">+{s.telefono}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge(s.estado)}`}>
                            {s.estado.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-400">
                          {formatDistanceToNow(new Date(s.ultimo_mensaje), { addSuffix: true, locale: es })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────
function ConfigSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-surface-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
        {icon} {title}
      </h3>
      {children}
    </div>
  )
}
