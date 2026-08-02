import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { DollarSign, Building2, Loader2 } from 'lucide-react'
import type { PagoHistorial } from '../../types'

export function SuperAdminInformes() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    total_ingresos: number;
    ultimos_pagos: PagoHistorial[];
    metricas_empresas: any[];
    distribucion_roles: any[];
  } | null>(null)

  useEffect(() => {
    fetchInformes()
  }, [])

  const fetchInformes = async () => {
    setLoading(true)
    const { data: res, error } = await supabase.rpc('get_informes_superadmin')
    
    if (error) {
      console.error('Error fetching reports:', error)
    } else {
      setData(res)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Cargando informes financieros...</p>
      </div>
    )
  }

  if (!data) return <div className="text-red-400 p-8">Error cargando informes. Si no has corrido el script SQL de facturación, debes hacerlo.</div>

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. KPIs Globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <DollarSign size={20} />
            <h3 className="font-medium text-sm">Ingresos Totales</h3>
          </div>
          <p className="text-3xl font-bold text-white">${data.total_ingresos?.toLocaleString() || '0'}</p>
          <p className="text-xs text-slate-500 mt-1">Histórico general</p>
        </div>
        
        <div className="bg-surface-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center gap-3 text-brand-400 mb-2">
            <Building2 size={20} />
            <h3 className="font-medium text-sm">Empresas Activas</h3>
          </div>
          <p className="text-3xl font-bold text-white">{data.metricas_empresas?.length || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Registradas en el sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Historial de Pagos (Left - 2 cols) */}
        <div className="lg:col-span-2 bg-surface-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-800">
            <h3 className="font-bold text-white">Historial de Pagos (Últimos 50)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-800 border-b border-slate-700">
                  <th className="p-4 text-xs font-medium text-slate-400">Fecha</th>
                  <th className="p-4 text-xs font-medium text-slate-400">Empresa</th>
                  <th className="p-4 text-xs font-medium text-slate-400">Monto</th>
                  <th className="p-4 text-xs font-medium text-slate-400">Método</th>
                  <th className="p-4 text-xs font-medium text-slate-400">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {data.ultimos_pagos?.map((pago) => (
                  <tr key={pago.id} className="border-b border-slate-800/50 hover:bg-surface-800/50">
                    <td className="p-4 text-sm text-slate-300">
                      {new Date(pago.fecha_pago).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm font-medium text-white">{pago.empresa_nombre}</td>
                    <td className="p-4 text-sm text-emerald-400 font-bold">${pago.monto}</td>
                    <td className="p-4 text-sm text-slate-400 capitalize">{pago.metodo_pago?.replace('_', ' ')}</td>
                    <td className="p-4 text-xs text-slate-500 font-mono">{pago.referencia_pago || '-'}</td>
                  </tr>
                ))}
                {(!data.ultimos_pagos || data.ultimos_pagos.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">No hay pagos registrados aún.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Métricas por Empresa y Roles (Right - 1 col) */}
        <div className="space-y-6">
          <div className="bg-surface-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h3 className="font-bold text-white">Ingresos por Empresa</h3>
            </div>
            <div className="p-5 space-y-4">
              {data.metricas_empresas?.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between">
                  <div className="truncate pr-4">
                    <p className="text-sm font-medium text-white truncate">{emp.nombre}</p>
                    <p className="text-xs text-slate-500">{emp.total_tickets} tickets totales</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-400">${emp.ingresos_totales || 0}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h3 className="font-bold text-white">Distribución de Usuarios</h3>
            </div>
            <div className="p-5 space-y-3">
              {data.distribucion_roles?.map((r, idx) => (
                <div key={idx} className="flex justify-between items-center bg-surface-800 p-3 rounded-xl border border-slate-700/50">
                  <div>
                    <p className="text-xs font-semibold text-slate-300">{r.empresa_nombre}</p>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5">{r.rol}</p>
                  </div>
                  <div className="bg-brand-500/10 text-brand-400 font-bold px-3 py-1 rounded-lg text-sm">
                    {r.total}
                  </div>
                </div>
              ))}
              {(!data.distribucion_roles || data.distribucion_roles.length === 0) && (
                <p className="text-sm text-slate-500 text-center">No hay usuarios registrados</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
