import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import { Icon } from 'leaflet'
import {
  MapPin, LogIn, LogOut, Clock, Navigation,
  AlertCircle, CheckCircle2, Loader2, Timer
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAsistencias } from '../hooks/useAsistencias'
import type { Asistencia } from '../types'

// Icono de marcador personalizado (evita el bug de Leaflet con Vite)
const markerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// ============================================================
// Componente: CheckInOut
// Control de asistencia con geolocalización y mapa Leaflet
// ============================================================

interface CheckInOutProps {
  tecnicoId: string
  ticketId?: string
  onCheckIn?: (asistencia: Asistencia) => void
  onCheckOut?: (asistencia: Asistencia) => void
}

export function CheckInOut({ tecnicoId, ticketId, onCheckIn, onCheckOut }: CheckInOutProps) {
  const geo = useGeolocation()
  const asist = useAsistencias()
  const [notas, setNotas] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState<string>('')

  // Verificar si hay asistencia activa al montar
  useEffect(() => {
    asist.verificarAsistenciaActiva(tecnicoId)
  }, [tecnicoId])

  // Temporizador: muestra tiempo desde el check-in
  useEffect(() => {
    if (!asist.asistenciaActiva) {
      setTiempoTranscurrido('')
      return
    }

    const inicio = new Date(asist.asistenciaActiva.hora_entrada).getTime()
    const tick = setInterval(() => {
      const diff = Math.floor((Date.now() - inicio) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setTiempoTranscurrido(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      )
    }, 1000)

    return () => clearInterval(tick)
  }, [asist.asistenciaActiva])

  const mostrarMensaje = (tipo: 'ok' | 'error', texto: string) => {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 4000)
  }

  const handleCheckIn = async () => {
    setProcesando(true)
    try {
      const coords = await geo.obtenerPosicion()
      const nueva = await asist.checkIn(
        tecnicoId, coords, geo.direccion || undefined, ticketId, notas || undefined
      )
      mostrarMensaje('ok', '✅ Check-in registrado correctamente')
      setNotas('')
      onCheckIn?.(nueva)
    } catch (err: any) {
      mostrarMensaje('error', err.message || 'Error al registrar check-in')
    } finally {
      setProcesando(false)
    }
  }

  const handleCheckOut = async () => {
    if (!asist.asistenciaActiva) return
    setProcesando(true)
    try {
      const coords = await geo.obtenerPosicion()
      const actualizada = await asist.checkOut(
        asist.asistenciaActiva.id, coords, geo.direccion || undefined
      )
      mostrarMensaje('ok', '✅ Check-out registrado. ¡Buen trabajo!')
      onCheckOut?.(actualizada)
    } catch (err: any) {
      mostrarMensaje('error', err.message || 'Error al registrar check-out')
    } finally {
      setProcesando(false)
    }
  }

  const tieneAsistencia = !!asist.asistenciaActiva
  const mapCenter: [number, number] = geo.coordenadas
    ? [geo.coordenadas.latitud, geo.coordenadas.longitud]
    : asist.asistenciaActiva?.latitud_entrada
    ? [asist.asistenciaActiva.latitud_entrada, asist.asistenciaActiva.longitud_entrada!]
    : [10.4806, -66.9036]  // Caracas por defecto

  const mostrarMapa = geo.coordenadas || asist.asistenciaActiva?.latitud_entrada

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Estado actual */}
      <div className={`rounded-2xl p-4 border transition-all duration-300 ${
        tieneAsistencia
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-surface-800 border-slate-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              tieneAsistencia ? 'bg-emerald-400' : 'bg-slate-600'
            }`} />
            <div>
              <p className="font-semibold text-white">
                {tieneAsistencia ? 'Sesión Activa' : 'Sin sesión activa'}
              </p>
              {tieneAsistencia && asist.asistenciaActiva && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Inicio: {format(new Date(asist.asistenciaActiva.hora_entrada), "dd/MM HH:mm", { locale: es })}
                </p>
              )}
            </div>
          </div>

          {/* Temporizador */}
          {tieneAsistencia && tiempoTranscurrido && (
            <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded-xl">
              <Timer size={14} className="text-emerald-400" />
              <span className="font-mono text-emerald-300 text-sm font-bold">
                {tiempoTranscurrido}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mapa Leaflet */}
      {mostrarMapa && (
        <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-card animate-fade-in">
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-800/80 border-b border-slate-700">
            <MapPin size={14} className="text-brand-400" />
            <span className="text-xs text-slate-400 font-medium">Ubicación registrada</span>
          </div>
          <MapContainer
            center={mapCenter}
            zoom={16}
            style={{ height: '220px', width: '100%' }}
            scrollWheelZoom={false}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={mapCenter} icon={markerIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>📍 Punto de Check-in</strong>
                  <br />
                  {geo.direccion || asist.asistenciaActiva?.direccion_entrada || 'Ubicación capturada'}
                  {geo.coordenadas && (
                    <div className="mt-1 text-xs text-gray-500 font-mono">
                      {geo.coordenadas.latitud.toFixed(5)}, {geo.coordenadas.longitud.toFixed(5)}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
            {geo.coordenadas?.precision && (
              <Circle
                center={mapCenter}
                radius={geo.coordenadas.precision}
                pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.1 }}
              />
            )}
          </MapContainer>
          {/* Dirección */}
          {(geo.direccion || asist.asistenciaActiva?.direccion_entrada) && (
            <div className="px-3 py-2 bg-surface-800/50 text-xs text-slate-500 flex items-start gap-1.5">
              <Navigation size={11} className="mt-0.5 shrink-0 text-brand-500" />
              <span className="line-clamp-2">
                {geo.direccion || asist.asistenciaActiva?.direccion_entrada}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Notas (solo al hacer check-in) */}
      {!tieneAsistencia && (
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Notas de la visita (opcional)
          </label>
          <textarea
            id="checkin-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: Visita a cliente para revisar servidor..."
            rows={2}
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 resize-none transition-all"
          />
        </div>
      )}

      {/* Mensaje de feedback */}
      {mensaje && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-slide-up ${
          mensaje.tipo === 'ok'
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            : 'bg-red-500/15 text-red-400 border border-red-500/30'
        }`}>
          {mensaje.tipo === 'ok'
            ? <CheckCircle2 size={16} />
            : <AlertCircle size={16} />
          }
          {mensaje.texto}
        </div>
      )}

      {/* Error de geolocalización */}
      {geo.error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-slide-up">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{geo.error}</span>
        </div>
      )}

      {/* Botones de acción */}
      <div className="grid grid-cols-1 gap-3">
        {!tieneAsistencia ? (
          <button
            id="btn-check-in"
            onClick={handleCheckIn}
            disabled={procesando || geo.loading}
            className="flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-glow/50 hover:shadow-glow text-sm"
          >
            {procesando || geo.loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {geo.loading ? 'Obteniendo GPS...' : 'Registrando...'}
              </>
            ) : (
              <>
                <LogIn size={18} />
                Check-In — Registrar Entrada
              </>
            )}
          </button>
        ) : (
          <button
            id="btn-check-out"
            onClick={handleCheckOut}
            disabled={procesando || geo.loading}
            className="flex items-center justify-center gap-2 w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 text-sm"
          >
            {procesando || geo.loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {geo.loading ? 'Obteniendo GPS...' : 'Registrando salida...'}
              </>
            ) : (
              <>
                <LogOut size={18} />
                Check-Out — Registrar Salida
              </>
            )}
          </button>
        )}
      </div>

      {/* Info GPS */}
      {geo.coordenadas && (
        <div className="flex items-center gap-4 text-xs text-slate-500 font-mono bg-surface-900/50 rounded-lg px-3 py-2">
          <span>📡 {geo.coordenadas.latitud.toFixed(6)}, {geo.coordenadas.longitud.toFixed(6)}</span>
          {geo.coordenadas.precision && (
            <span>±{Math.round(geo.coordenadas.precision)}m</span>
          )}
        </div>
      )}
    </div>
  )
}

export default CheckInOut
