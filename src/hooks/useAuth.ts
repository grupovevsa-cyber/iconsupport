import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Profile, AuthUser } from '../types'

// ============================================================
// Hook: useAuth — maneja sesión de Supabase Auth
// ============================================================

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Carga el perfil del usuario desde la tabla profiles
  const loadProfile = useCallback(async (userId: string, email: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error cargando perfil:', error)
      return null
    }

    return profile as Profile
  }, [])

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await loadProfile(session.user.id, session.user.email ?? '')
        setUser({ id: session.user.id, email: session.user.email ?? '', profile })
      }
      setLoading(false)
    })

    // Suscripción a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await loadProfile(session.user.id, session.user.email ?? '')
          setUser({ id: session.user.id, email: session.user.email ?? '', profile })
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string, nombre: string, rol: string = 'cliente') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, rol } },
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return { user, loading, signIn, signUp, signOut }
}
