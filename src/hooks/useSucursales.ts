import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Sucursal } from '../types'

// ============================================================
// Hook: useSucursales — CRUD de sucursales/locales por empresa
// ============================================================

export function useSucursales() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSucursales = useCallback(async (empresaId?: string) => {
    setLoading(true)
    try {
      let q = supabase.from('sucursales').select('*, empresa:empresas(id, nombre)').order('nombre')
      if (empresaId) q = q.eq('empresa_id', empresaId)
      const { data, error } = await q
      if (error) throw error
      setSucursales((data as Sucursal[]) || [])
    } finally {
      setLoading(false)
    }
  }, [])

  const crearSucursal = async (
    empresaId: string,
    nombre: string,
    direccion?: string,
    telefono?: string
  ): Promise<Sucursal> => {
    const { data, error } = await supabase
      .from('sucursales')
      .insert({ empresa_id: empresaId, nombre: nombre.trim(), direccion: direccion || null, telefono: telefono || null })
      .select('*, empresa:empresas(id, nombre)')
      .single()
    if (error) throw new Error(error.message)
    const nueva = data as Sucursal
    setSucursales(prev => [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    return nueva
  }

  return { sucursales, loading, fetchSucursales, crearSucursal }
}
