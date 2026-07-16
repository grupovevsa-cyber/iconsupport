import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, Zap, Shield, Wifi } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

// ============================================================
// Página: Login
// ============================================================

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()

  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [form, setForm] = useState({ email: '', password: '', nombre: '', rol: 'cliente' })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError(null)

    try {
      if (modo === 'login') {
        await signIn(form.email, form.password)
        navigate('/dashboard')
      } else {
        await signUp(form.email, form.password, form.nombre, form.rol)
        setError('✅ Cuenta creada. Revisa tu email para confirmar tu cuenta.')
        setModo('login')
      }
    } catch (err: any) {
      const msg = err?.message || ''
      const msgs: Record<string, string> = {
        'Invalid login credentials': 'Email o contraseña incorrectos.',
        'Email not confirmed': 'Confirma tu email antes de ingresar.',
        'User already registered': 'Ya existe una cuenta con este email.',
        'Failed to fetch': 'Error de conexión. Verifica tu internet o los servidores.',
      }
      setError(msgs[msg] || msg || (typeof err === 'object' ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : String(err)))
    } finally {
      setCargando(false)
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen bg-surface-950 hero-pattern flex items-center justify-center p-4">
      {/* Círculos decorativos de fondo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 shadow-glow mb-4">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ICON Support</h1>
          <p className="text-slate-400 mt-1 text-sm">Sistema de Gestión de Soporte Técnico</p>
        </div>

        {/* Card */}
        <div className="bg-surface-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-card p-8">
          {/* Tabs */}
          <div className="flex bg-surface-800 rounded-xl p-1 mb-6">
            <button
              id="tab-login"
              onClick={() => { setModo('login'); setError(null) }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                modo === 'login'
                  ? 'bg-brand-600 text-white shadow-glow/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              id="tab-registro"
              onClick={() => { setModo('registro'); setError(null) }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                modo === 'registro'
                  ? 'bg-brand-600 text-white shadow-glow/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre (solo en registro) */}
            {modo === 'registro' && (
              <div className="animate-slide-up">
                <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="nombre">
                  Nombre completo
                </label>
                <input
                  id="nombre"
                  type="text"
                  required
                  value={form.nombre}
                  onChange={set('nombre')}
                  placeholder="Tu nombre completo"
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={set('email')}
                placeholder="tu@empresa.com"
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={set('password')}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>

            {/* Rol (solo en registro) */}
            {modo === 'registro' && (
              <div className="animate-slide-up">
                <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="rol">
                  Tipo de cuenta
                </label>
                <select
                  id="rol"
                  value={form.rol}
                  onChange={set('rol')}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all appearance-none"
                >
                  <option value="cliente">Cliente — Solicitar soporte</option>
                  <option value="tecnico">Técnico — Gestionar servicios</option>
                </select>
              </div>
            )}

            {/* Error / Mensaje */}
            {error && (
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm animate-slide-up ${
                error.startsWith('✅')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              id="btn-submit-auth"
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-glow/50 hover:shadow-glow mt-2"
            >
              {cargando ? (
                <><Loader2 size={18} className="animate-spin" /> Procesando...</>
              ) : modo === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
          </form>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: Shield, label: 'Seguro' },
            { icon: Wifi, label: 'Tiempo real' },
            { icon: Zap, label: 'PWA' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 p-3 bg-surface-900/50 rounded-xl border border-slate-800">
              <Icon size={16} className="text-brand-400" />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
