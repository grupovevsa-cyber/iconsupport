import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Empresa } from '../types'

// ============================================================
// Hook: useEmpresas — CRUD de catálogo de empresas/clientes
// ============================================================

export function useEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(false)

  const fetchEmpresas = useCallback(async (query?: string) => {
    setLoading(true)
    try {
      let q = supabase.from('empresas').select('*').order('nombre')
      if (query?.trim()) {
        q = q.ilike('nombre', `%${query.trim()}%`)
      }
      const { data, error } = await q
      if (error) throw error
      setEmpresas((data as Empresa[]) || [])
    } finally {
      setLoading(false)
    }
  }, [])

  const crearEmpresa = async (nombre: string, rfc?: string, direccion?: string, telefono?: string): Promise<Empresa> => {
    const { data, error } = await supabase
      .from('empresas')
      .insert({ nombre: nombre.trim(), rfc: rfc || null, direccion: direccion || null, telefono: telefono || null })
      .select()
      .single()
    if (error) throw new Error(error.message)
    const nueva = data as Empresa
    setEmpresas(prev => [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    return nueva
  }

  return { empresas, loading, fetchEmpresas, crearEmpresa }
}
