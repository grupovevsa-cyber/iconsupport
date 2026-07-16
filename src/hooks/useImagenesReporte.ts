import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { ImagenReporte } from '../types'

// ============================================================
// Hook: useImagenesReporte — Subida y gestión de fotos en Supabase Storage
// ============================================================

const BUCKET = 'fotos-reportes'

export function useImagenesReporte() {
  const [imagenes, setImagenes] = useState<ImagenReporte[]>([])
  const [subiendo, setSubiendo] = useState(false)

  const fetchImagenes = useCallback(async (reporteId: string) => {
    const { data, error } = await supabase
      .from('imagenes_reporte')
      .select('*')
      .eq('reporte_id', reporteId)
      .order('orden')
    if (!error) setImagenes((data as ImagenReporte[]) || [])
  }, [])

  /**
   * Sube una imagen al bucket de Supabase Storage y registra la URL en la BD.
   * Si no hay reporteId aún, devuelve {url, path} para guardarlo después.
   */
  const subirImagen = async (
    file: File,
    reporteId: string | null,
    descripcion?: string,
    orden?: number
  ): Promise<{ url: string; path: string }> => {
    setSubiendo(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${reporteId ?? 'temp'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadErr) throw new Error(uploadErr.message)

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const url = urlData.publicUrl

      if (reporteId) {
        const { data, error: dbErr } = await supabase
          .from('imagenes_reporte')
          .insert({ reporte_id: reporteId, url, descripcion: descripcion || null, orden: orden ?? imagenes.length })
          .select()
          .single()
        if (dbErr) throw new Error(dbErr.message)
        setImagenes(prev => [...prev, data as ImagenReporte])
      }

      return { url, path }
    } finally {
      setSubiendo(false)
    }
  }

  /** Guarda una imagen temporal (sin reporteId) a la BD una vez que el reporte fue creado */
  const registrarImagen = async (reporteId: string, url: string, descripcion?: string, orden?: number) => {
    const { data, error } = await supabase
      .from('imagenes_reporte')
      .insert({ reporte_id: reporteId, url, descripcion: descripcion || null, orden: orden ?? 0 })
      .select()
      .single()
    if (error) throw new Error(error.message)
    setImagenes(prev => [...prev, data as ImagenReporte])
    return data as ImagenReporte
  }

  const actualizarDescripcion = async (imagenId: string, descripcion: string) => {
    await supabase.from('imagenes_reporte').update({ descripcion }).eq('id', imagenId)
    setImagenes(prev => prev.map(i => i.id === imagenId ? { ...i, descripcion } : i))
  }

  const eliminarImagen = async (imagenId: string, path?: string) => {
    if (path) await supabase.storage.from(BUCKET).remove([path])
    await supabase.from('imagenes_reporte').delete().eq('id', imagenId)
    setImagenes(prev => prev.filter(i => i.id !== imagenId))
  }

  return { imagenes, subiendo, fetchImagenes, subirImagen, registrarImagen, actualizarDescripcion, eliminarImagen }
}
