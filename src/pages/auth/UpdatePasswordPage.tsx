import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'

export const UpdatePasswordPage = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [validToken, setValidToken] = useState(true)

  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Verificar si estamos en una sesión de recuperación
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setValidToken(false)
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: string, session: any) => {
        if (event === 'PASSWORD_RECOVERY') {
          setValidToken(true)
        } else if (!session) {
          setValidToken(false)
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setCargando(true)

    try {
      await updatePassword(password)
      setError('✅ Contraseña actualizada con éxito.')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña.')
    } finally {
      setCargando(false)
    }
  }

  if (!validToken) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <div className="w-full max-w-md z-10 animate-fade-in text-center p-8 bg-surface-900 border border-slate-800 rounded-2xl shadow-xl">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Enlace inválido o expirado</h2>
          <p className="text-slate-400 mb-6">Por favor solicita un nuevo enlace de recuperación de contraseña en la página de inicio de sesión.</p>
          <button
            onClick={() => navigate('/login')}
            className="text-brand-400 hover:text-brand-300 font-bold transition-colors"
          >
            Volver al Inicio de Sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Decorativo */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md z-10 animate-fade-in">
        <div className="bg-surface-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-8 backdrop-blur-xl relative">
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-glow mb-6">
              <Zap size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Nueva Contraseña
            </h1>
            <p className="text-sm text-slate-400">
              Por favor ingresa tu nueva contraseña
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="password">
                Nueva Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="confirm_password">
                Confirmar Contraseña
              </label>
              <input
                id="confirm_password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>

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
              type="submit"
              disabled={cargando || error.startsWith('✅')}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-glow/50 hover:shadow-glow mt-2"
            >
              {cargando ? (
                <><Loader2 size={18} className="animate-spin" /> Procesando...</>
              ) : 'Actualizar Contraseña'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
