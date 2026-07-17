import React, { useState, useEffect } from 'react'
import {
  Settings, Key, MessageCircle, Mail, Building2, Globe,
  Eye, EyeOff, Save, CheckCircle2, Loader2, AlertCircle,
  Zap, Phone, Webhook, Shield, RefreshCw, Copy, ExternalLink,
  ChevronDown, ChevronUp, Info
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'

// ============================================================
// ConfiguracionPage — Panel de configuración del sistema (Admin)
// Gestión de claves API, identidad de empresa, bot y notificaciones
// ============================================================

interface AppConfig {
  id: string
  // Bot / WhatsApp
  numero_whatsapp: string
  nombre_bot: string
  mensaje_bienvenida: string
  whatsapp_token: string
  whatsapp_phone_id: string
  webhook_verify_token: string
  // IA
  gemini_api_key: string
  modo_ia_activo: boolean
  ia_system_prompt: string
  // Email
  resend_api_key: string
  from_email: string
  // Empresa
  empresa_nombre: string
  empresa_telefono: string
  empresa_email: string
  empresa_direccion: string
  empresa_logo_url: string
  portal_url: string
  // Horario
  horario_inicio: string
  horario_fin: string
  dias_habiles: number[]
}

// ── Componentes auxiliares ─────────────────────────────────

function SecretInput({
  label, value, onChange, placeholder, helpText, id,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; helpText?: string; id: string
}) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '••••••••••••••••••••'}
          className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 pr-20 font-mono"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button type="button" onClick={copy}
              className="p-1.5 text-slate-500 hover:text-brand-400 transition-colors rounded-lg hover:bg-surface-700">
              {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          )}
          <button type="button" onClick={() => setVisible(!visible)}
            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-surface-700">
            {visible ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>
      {helpText && <p className="text-[11px] text-slate-600 mt-1">{helpText}</p>}
    </div>
  )
}

function FieldInput({
  label, value, onChange, placeholder, helpText, id, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; helpText?: string; id: string; type?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      {helpText && <p className="text-[11px] text-slate-600 mt-1">{helpText}</p>}
    </div>
  )
}

function ConfigCard({
  title, subtitle, icon, badge, children, defaultOpen = false
}: {
  title: string; subtitle?: string; icon: React.ReactNode
  badge?: { label: string; color: string }
  children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-surface-900 border border-slate-800 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-surface-800/50 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {badge && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
            {badge.label}
          </span>
        )}
        {open ? <ChevronUp size={15} className="text-slate-500 shrink-0" /> : <ChevronDown size={15} className="text-slate-500 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-800 pt-4 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────
const DIAS_SEMANA = [
  { idx: 0, label: 'D' }, { idx: 1, label: 'L' }, { idx: 2, label: 'M' },
  { idx: 3, label: 'X' }, { idx: 4, label: 'J' }, { idx: 5, label: 'V' }, { idx: 6, label: 'S' },
]

const WEBHOOK_URL = 'https://nxfbagnimvvkurhlyhwg.supabase.co/functions/v1/whatsapp-webhook'

export function ConfiguracionPage() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [seccionGuardada, setSeccionGuardada] = useState<string | null>(null)

  // ── Carga ──────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from('bot_config').select('*').single()
      setConfig(data as AppConfig)
      setLoading(false)
    }
    cargar()
  }, [])

  const set = (key: keyof AppConfig) => (value: string | boolean | number[]) => {
    setConfig(prev => prev ? { ...prev, [key]: value } : prev)
  }

  // ── Guardar sección ────────────────────────────────────
  const guardarSeccion = async (campos: Partial<AppConfig>, etiqueta: string) => {
    if (!config) return
    setGuardando(true)
    const { error } = await supabase
      .from('bot_config')
      .update(campos)
      .eq('id', config.id)
    setGuardando(false)
    if (error) {
      toast.error(`Error al guardar ${etiqueta}: ${error.message}`)
    } else {
      setSeccionGuardada(etiqueta)
      toast.success(`${etiqueta} guardada correctamente.`)
      setTimeout(() => setSeccionGuardada(null), 2500)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado al portapapeles.`)
  }

  // ── Indicador de estado de credencial ─────────────────
  const credStatus = (val: string | undefined) =>
    val && val.length > 8
      ? { icon: <CheckCircle2 size={12} className="text-emerald-400" />, label: 'Configurado', color: 'bg-emerald-500/15 text-emerald-400', cls: 'text-emerald-400' }
      : { icon: <AlertCircle size={12} className="text-amber-400" />, label: 'Pendiente', color: 'bg-amber-500/15 text-amber-400', cls: 'text-amber-400' }

  if (loading || !config) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-950 pb-20">
      {/* Header */}
      <div className="border-b border-slate-800 bg-surface-900/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Settings size={18} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Configuración del Sistema</h1>
              <p className="text-xs text-slate-500">Gestión de claves API y ajustes de la plataforma</p>
            </div>
          </div>
          {guardando && (
            <div className="flex items-center gap-1.5 text-xs text-brand-400">
              <Loader2 size={12} className="animate-spin" /> Guardando...
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* ── Aviso de seguridad ─────────────────────────── */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-start gap-3">
          <Shield size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-400">Zona de Configuración Sensible</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Los valores aquí almacenados son visibles solo para administradores.
              Las claves API se guardan en la base de datos segura de Supabase con RLS activado.
              Para mayor seguridad en producción, considera usar <strong className="text-slate-400">Supabase Vault</strong>.
            </p>
          </div>
        </div>

        {/* ── Resumen de estado ──────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'WhatsApp Token', val: config.whatsapp_token },
            { label: 'Gemini API', val: config.gemini_api_key },
            { label: 'Resend (Email)', val: config.resend_api_key },
            { label: 'Phone Number ID', val: config.whatsapp_phone_id },
          ].map(({ label, val }) => {
            const st = credStatus(val)
            return (
              <div key={label} className="bg-surface-900 border border-slate-800 rounded-xl px-3 py-3">
                <div className={`flex items-center gap-1 text-[10px] font-medium ${st.cls}`}>
                  {st.icon} {st.label}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-tight">{label}</p>
              </div>
            )
          })}
        </div>

        {/* ══ 1. IDENTIDAD DE LA EMPRESA ══════════════════ */}
        <ConfigCard
          title="Identidad de la Empresa"
          subtitle="Datos que aparecen en PDFs, emails y el portal"
          icon={<Building2 size={16} className="text-brand-400" />}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldInput id="empresa_nombre" label="Nombre de la empresa"
              value={config.empresa_nombre || ''} onChange={set('empresa_nombre')}
              placeholder="ICON Support" />
            <FieldInput id="empresa_telefono" label="Teléfono de contacto"
              value={config.empresa_telefono || ''} onChange={set('empresa_telefono')}
              placeholder="+52 55 1234 5678" />
            <FieldInput id="empresa_email" label="Email de soporte"
              type="email" value={config.empresa_email || ''} onChange={set('empresa_email')}
              placeholder="soporte@empresa.com" />
            <FieldInput id="portal_url" label="URL del portal"
              value={config.portal_url || ''} onChange={set('portal_url')}
              placeholder="https://iconsupport.vercel.app" />
          </div>
          <FieldInput id="empresa_direccion" label="Dirección"
            value={config.empresa_direccion || ''} onChange={set('empresa_direccion')}
            placeholder="Av. Insurgentes Sur 1234, Ciudad de México" />
          <FieldInput id="empresa_logo_url" label="URL del logotipo (PNG/SVG)"
            value={config.empresa_logo_url || ''} onChange={set('empresa_logo_url')}
            placeholder="https://..." helpText="Usado en reportes PDF y emails al cliente." />
          <SaveBtn label="empresa" guardando={guardando} seccionGuardada={seccionGuardada}
            onClick={() => guardarSeccion({
              empresa_nombre: config.empresa_nombre,
              empresa_telefono: config.empresa_telefono,
              empresa_email: config.empresa_email,
              empresa_direccion: config.empresa_direccion,
              empresa_logo_url: config.empresa_logo_url,
              portal_url: config.portal_url,
            }, 'empresa')} />
        </ConfigCard>

        {/* ══ 2. WHATSAPP / META CLOUD API ════════════════ */}
        <ConfigCard
          title="WhatsApp Business API (Meta)"
          subtitle="Credenciales de Meta Cloud API para el chatbot"
          icon={<MessageCircle size={16} className="text-emerald-400" />}
          badge={credStatus(config.whatsapp_token)}
        >
          {/* Webhook URL para copiar */}
          <div className="bg-surface-800/60 border border-slate-700 rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Webhook size={11} /> URL del Webhook (pégala en Meta Developers)
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-brand-300 flex-1 break-all font-mono">{WEBHOOK_URL}</code>
              <button onClick={() => copyToClipboard(WEBHOOK_URL, 'URL del webhook')}
                className="p-1.5 bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors shrink-0">
                <Copy size={12} className="text-slate-400" />
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FieldInput id="numero_whatsapp" label="Número de WhatsApp Business"
              value={config.numero_whatsapp || ''} onChange={set('numero_whatsapp')}
              placeholder="+52 55 1234 5678"
              helpText="Número visible para los clientes." />
            <FieldInput id="whatsapp_phone_id" label="Phone Number ID"
              value={config.whatsapp_phone_id || ''} onChange={set('whatsapp_phone_id')}
              placeholder="1234567890123456"
              helpText="Obtenido en Meta Developers → App → WhatsApp → API Setup." />
          </div>

          <SecretInput id="whatsapp_token" label="WhatsApp Access Token (permanente)"
            value={config.whatsapp_token || ''} onChange={set('whatsapp_token')}
            helpText="Token de larga duración generado desde Meta Business Suite → Sistema de usuarios." />

          <SecretInput id="webhook_verify_token" label="Webhook Verify Token"
            value={config.webhook_verify_token || ''} onChange={set('webhook_verify_token')}
            placeholder="iconsupport_bot_2025"
            helpText="Token personalizado que usas al configurar el webhook en Meta Developers." />

          {/* Link de ayuda */}
          <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
            <ExternalLink size={11} /> Guía oficial: Meta Cloud API
          </a>

          <SaveBtn label="whatsapp" guardando={guardando} seccionGuardada={seccionGuardada}
            onClick={() => guardarSeccion({
              numero_whatsapp: config.numero_whatsapp,
              whatsapp_token: config.whatsapp_token,
              whatsapp_phone_id: config.whatsapp_phone_id,
              webhook_verify_token: config.webhook_verify_token,
            }, 'whatsapp')} />
        </ConfigCard>

        {/* ══ 3. GEMINI / BOT IA ══════════════════════════ */}
        <ConfigCard
          title="Bot-Técnico IA (Google Gemini)"
          subtitle="Configuración de la inteligencia artificial fuera de horario"
          icon={<Zap size={16} className="text-amber-400" />}
          badge={credStatus(config.gemini_api_key)}
        >
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-3 py-2.5 text-xs text-slate-400 leading-relaxed">
            <strong className="text-emerald-400">¿Cómo obtener la clave?</strong>{' '}
            Visita <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
              className="text-brand-400 underline">aistudio.google.com/apikey</a> → crea un proyecto → copia la API Key.
            El plan gratuito incluye 1,500 solicitudes/día con Gemini 2.0 Flash.
          </div>

          <SecretInput id="gemini_api_key" label="Gemini API Key"
            value={config.gemini_api_key || ''} onChange={set('gemini_api_key')}
            placeholder="AIzaSy..."
            helpText="Clave de la API de Google Gemini para el bot de IA fuera de horario." />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Horario de atención — Inicio</label>
              <input type="time" value={config.horario_inicio || '08:00'}
                onChange={e => set('horario_inicio')(e.target.value)}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Horario de atención — Fin</label>
              <input type="time" value={config.horario_fin || '18:00'}
                onChange={e => set('horario_fin')(e.target.value)}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Días hábiles (IA se activa fuera de estos días)</label>
            <div className="flex gap-2">
              {DIAS_SEMANA.map(({ idx, label }) => {
                const activo = (config.dias_habiles || []).includes(idx)
                return (
                  <button key={idx} type="button"
                    onClick={() => set('dias_habiles')(
                      activo
                        ? config.dias_habiles.filter(d => d !== idx)
                        : [...config.dias_habiles, idx].sort()
                    )}
                    className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${activo ? 'bg-brand-600 text-white shadow-glow/30' : 'bg-surface-800 text-slate-500 hover:bg-surface-700'}`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-white">Activar Bot IA</p>
              <p className="text-xs text-slate-500">Gemini responde automáticamente fuera del horario hábil</p>
            </div>
            <button type="button"
              onClick={() => set('modo_ia_activo')(!config.modo_ia_activo)}
              className={`relative w-11 h-6 rounded-full transition-colors ${config.modo_ia_activo ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${config.modo_ia_activo ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          <SaveBtn label="ia" guardando={guardando} seccionGuardada={seccionGuardada}
            onClick={() => guardarSeccion({
              gemini_api_key: config.gemini_api_key,
              horario_inicio: config.horario_inicio,
              horario_fin: config.horario_fin,
              dias_habiles: config.dias_habiles,
              modo_ia_activo: config.modo_ia_activo,
            }, 'ia')} />
        </ConfigCard>

        {/* ══ 4. EMAIL (RESEND) ════════════════════════════ */}
        <ConfigCard
          title="Notificaciones por Email (Resend)"
          subtitle="Envío de reportes PDF y alertas a clientes"
          icon={<Mail size={16} className="text-blue-400" />}
          badge={credStatus(config.resend_api_key)}
          defaultOpen={false}
        >
          <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-3 py-2.5 text-xs text-slate-400 leading-relaxed">
            <strong className="text-blue-400">¿Cómo obtener la clave?</strong>{' '}
            Regístrate en <a href="https://resend.com" target="_blank" rel="noopener noreferrer"
              className="text-brand-400 underline">resend.com</a> (100 emails/día gratis) →
            API Keys → Create API Key → copia el token.
          </div>

          <SecretInput id="resend_api_key" label="Resend API Key"
            value={config.resend_api_key || ''} onChange={set('resend_api_key')}
            placeholder="re_xxxxxxxx..."
            helpText="Usado para enviar reportes PDF por email al cliente al cerrar un ticket." />

          <FieldInput id="from_email" label='Email remitente ("De:")'
            type="email" value={config.from_email || ''} onChange={set('from_email')}
            placeholder="soporte@iconsupport.app"
            helpText="Debe ser un dominio verificado en Resend. Para pruebas puedes usar onboarding@resend.dev." />

          <SaveBtn label="email" guardando={guardando} seccionGuardada={seccionGuardada}
            onClick={() => guardarSeccion({
              resend_api_key: config.resend_api_key,
              from_email: config.from_email,
            }, 'email')} />
        </ConfigCard>

        {/* ══ 5. BOT - MENSAJE DE BIENVENIDA ══════════════ */}
        <ConfigCard
          title="Mensaje de Bienvenida del Bot"
          subtitle="Texto que ve el cliente al escribir por primera vez"
          icon={<Phone size={16} className="text-emerald-400" />}
          defaultOpen={false}
        >
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Mensaje de bienvenida{' '}
              <span className="text-slate-600">(usa *texto* para negritas, _texto_ para cursiva)</span>
            </label>
            <textarea
              value={config.mensaje_bienvenida || ''}
              onChange={e => set('mensaje_bienvenida')(e.target.value)}
              rows={8}
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none font-mono"
              placeholder="¡Hola! 👋 Bienvenido a *ICON Support*..."
            />
          </div>

          {/* Preview simulado */}
          {config.mensaje_bienvenida && (
            <div className="bg-[#0b141a] border border-slate-800 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 mb-2 flex items-center gap-1">
                <MessageCircle size={9} /> Preview WhatsApp
              </p>
              <div className="bg-[#1f2c34] rounded-xl rounded-tl-sm px-3 py-2.5 max-w-xs">
                <p className="text-sm text-white whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'system-ui' }}>
                  {config.mensaje_bienvenida
                    .split('\n').map((line: string, i: number) => (
                      <span key={i}>{line}<br /></span>
                    ))
                  }
                </p>
              </div>
            </div>
          )}

          <FieldInput id="nombre_bot" label="Nombre del Bot"
            value={config.nombre_bot || ''} onChange={set('nombre_bot')}
            placeholder="Asistente ICON Support" />

          <SaveBtn label="bienvenida" guardando={guardando} seccionGuardada={seccionGuardada}
            onClick={() => guardarSeccion({
              mensaje_bienvenida: config.mensaje_bienvenida,
              nombre_bot: config.nombre_bot,
            }, 'bienvenida')} />
        </ConfigCard>

        {/* ══ 6. PORTAL PÚBLICO ════════════════════════════ */}
        <ConfigCard
          title="Portal Público de Soporte"
          subtitle="Enlace y código QR para que invitados soliciten soporte"
          icon={<Globe size={16} className="text-indigo-400" />}
          defaultOpen={true}
        >
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="bg-surface-800 p-4 rounded-2xl flex items-center justify-center border border-slate-700">
              <div className="bg-white p-3 rounded-xl">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent((import.meta.env.VITE_APP_URL || window.location.origin) + '/solicitar-soporte')}`} alt="QR Portal" className="w-32 h-32" />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                Comparte este código QR o el siguiente enlace con tus clientes para que puedan generar tickets de soporte técnico sin necesidad de iniciar sesión.
              </p>
              
              <div className="bg-surface-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Enlace del Portal</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-brand-400 font-mono bg-surface-900 py-2 px-3 rounded-lg overflow-x-auto whitespace-nowrap">
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
                    <Copy size={16} />
                  </button>
                  <a
                    href="/solicitar-soporte"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-lg transition-colors shrink-0"
                    title="Abrir portal"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </ConfigCard>

        {/* ══ 7. INSTRUCCIONES DE DESPLIEGUE ══════════════ */}
        <ConfigCard
          title="Instrucciones de Activación"
          subtitle="Pasos para conectar el webhook con Meta"
          icon={<Info size={16} className="text-slate-400" />}
          defaultOpen={false}
        >
          <ol className="space-y-3 text-sm text-slate-400">
            {[
              { n: 1, title: 'Despliega las Edge Functions', desc: 'Ejecuta en tu terminal: supabase functions deploy whatsapp-webhook whatsapp-handler enviar-whatsapp ia-handler enviar-reporte-email' },
              { n: 2, title: 'Configura los Secrets en Supabase', desc: 'En el Dashboard de Supabase → Edge Functions → Secrets agrega: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WEBHOOK_VERIFY_TOKEN, GEMINI_API_KEY, RESEND_API_KEY, FROM_EMAIL.' },
              { n: 3, title: 'Registra el Webhook en Meta', desc: 'Ve a developers.facebook.com → Tu App → WhatsApp → Configuración → Webhooks → Editar → pega la URL del webhook y el Verify Token.' },
              { n: 4, title: 'Suscríbete a messages', desc: 'En la sección de webhooks, activa la suscripción al campo "messages".' },
              { n: 5, title: 'Prueba enviando un mensaje', desc: 'Escribe "hola" al número de WhatsApp Business desde tu celular y verifica que el bot responda.' },
            ].map(({ n, title, desc }) => (
              <li key={n} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</div>
                <div>
                  <p className="font-medium text-white text-sm">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* Comando de despliegue para copiar */}
          <div className="bg-surface-800 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-2">Comando de despliegue (copia y ejecuta en tu terminal):</p>
            <div className="flex items-start gap-2">
              <code className="text-xs text-emerald-300 flex-1 font-mono break-all leading-relaxed">
                supabase functions deploy whatsapp-webhook whatsapp-handler enviar-whatsapp ia-handler enviar-reporte-email --project-ref nxfbagnimvvkurhlyhwg
              </code>
              <button
                onClick={() => copyToClipboard(
                  'supabase functions deploy whatsapp-webhook whatsapp-handler enviar-whatsapp ia-handler enviar-reporte-email --project-ref nxfbagnimvvkurhlyhwg',
                  'Comando'
                )}
                className="p-1.5 bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors shrink-0"
              >
                <Copy size={12} className="text-slate-400" />
              </button>
            </div>
          </div>
        </ConfigCard>

      </div>
    </div>
  )
}

// ── Botón de guardado por sección ──────────────────────────
function SaveBtn({
  label, guardando, seccionGuardada, onClick
}: { label: string; guardando: boolean; seccionGuardada: string | null; onClick: () => void }) {
  const estaGuardando = guardando && seccionGuardada === null
  const guardadaEsta = seccionGuardada === label

  return (
    <button type="button" onClick={onClick}
      disabled={guardando}
      className={`flex items-center gap-2 text-sm font-semibold py-2.5 px-5 rounded-xl transition-all ${
        guardadaEsta
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-brand-600 hover:bg-brand-500 text-white disabled:bg-slate-700 disabled:cursor-not-allowed'
      }`}
    >
      {guardadaEsta
        ? <><CheckCircle2 size={15} /> Guardado</>
        : estaGuardando
          ? <><Loader2 size={15} className="animate-spin" /> Guardando...</>
          : <><Save size={15} /> Guardar</>
      }
    </button>
  )
}
