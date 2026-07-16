import { useState, useCallback } from 'react'
import type { Coordenadas } from '../types'

// ============================================================
// Hook: useGeolocation — Captura coordenadas GPS del dispositivo
// ============================================================

interface GeolocationState {
  coordenadas: Coordenadas | null
  direccion: string | null
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coordenadas: null,
    direccion: null,
    error: null,
    loading: false,
  })

  /**
   * Solicita la posición GPS actual del dispositivo.
   * Usa la API del navegador navigator.geolocation
   * y hace reverse geocoding GRATUITO con Nominatim (OpenStreetMap)
   */
  const obtenerPosicion = useCallback((): Promise<Coordenadas> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const msg = 'Tu dispositivo no soporta geolocalización.'
        setState(s => ({ ...s, error: msg, loading: false }))
        reject(new Error(msg))
        return
      }

      setState(s => ({ ...s, loading: true, error: null }))

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coordenadas: Coordenadas = {
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
            precision: position.coords.accuracy,
          }

          // Reverse geocoding con Nominatim (OpenStreetMap) — gratuito sin API key
          let direccion: string | null = null
          try {
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordenadas.latitud}&lon=${coordenadas.longitud}&zoom=18&addressdetails=1`,
              { headers: { 'Accept-Language': 'es' } }
            )
            const geo = await resp.json()
            direccion = geo.display_name || null
          } catch (_) {
            // Si falla el geocoding, continuamos sin dirección
            direccion = `${coordenadas.latitud.toFixed(5)}, ${coordenadas.longitud.toFixed(5)}`
          }

          setState({ coordenadas, direccion, error: null, loading: false })
          resolve(coordenadas)
        },
        (err) => {
          let msg = 'Error al obtener ubicación.'
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = 'Permiso de ubicación denegado. Por favor, habilítalo en la configuración de tu navegador.'
              break
            case err.POSITION_UNAVAILABLE:
              msg = 'Ubicación no disponible. Verifica tu señal GPS.'
              break
            case err.TIMEOUT:
              msg = 'Tiempo de espera agotado. Intenta de nuevo.'
              break
          }
          setState(s => ({ ...s, error: msg, loading: false }))
          reject(new Error(msg))
        },
        {
          enableHighAccuracy: true,   // GPS de alta precisión
          timeout: 15000,             // 15 segundos máximo
          maximumAge: 30000,          // Acepta posición de hasta 30s atrás
        }
      )
    })
  }, [])

  const limpiar = useCallback(() => {
    setState({ coordenadas: null, direccion: null, error: null, loading: false })
  }, [])

  return {
    ...state,
    obtenerPosicion,
    limpiar,
  }
}
