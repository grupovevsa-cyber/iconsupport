import React, { useEffect, useState } from 'react'
import { Building2, Plus, LogOut, CheckCircle, XCircle, AlertCircle, Settings, Users as UsersIcon, Ticket as TicketIcon, BarChart3 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import type { EmpresaSaas } from '../../types'
import { SuperAdminInformes } from './SuperAdminInformes'

export function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'empresas' | 'informes'>('empresas')
  const [empresas, setEmpresas] = useState<EmpresaSaas[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [generatingLink, setGeneratingLink] = useState<string | null>(null)
  
  // Modal de Gestionar
  const [showManageModal, setShowManageModal] = useState(false)
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<EmpresaSaas | null>(null)
  const [adminPrincipal, setAdminPrincipal] = useState<any>(null)
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [cargandoAdmin, setCargandoAdmin] = useState(false)

  // Formulario para nueva empresa y su admin
  const [form, setForm] = useState({
    empresaNombre: '',
    plan: 'pro',
    adminNombre: '',
    adminEmail: '',
    adminPassword: ''
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEmpresas()
  }, [])

  const fetchEmpresas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('empresas_saas')
      .select(`
        *,
        perfiles:profiles(count),
        tickets:tickets(count)
      `)
      .order('creado_en', { ascending: false })
    
    if (error) {
      console.error('Error fetching metrics:', error)
    }
    
    if (data) {
      const formattedData = data.map((emp: any) => ({
        ...emp,
        total_usuarios: emp.perfiles?.[0]?.count || 0,
        total_tickets: emp.tickets?.[0]?.count || 0,
      }))
      setEmpresas(formattedData)
    }
    setLoading(false)
  }

  const openManageModal = async (empresa: EmpresaSaas) => {
    setEmpresaSeleccionada(empresa)
    setShowManageModal(true)
    setAdminPrincipal(null)
    setNuevaPassword('')
    setCargandoAdmin(true)
    
    // Buscar al administrador principal (el primero que se encuentre)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('rol', 'admin')
      .limit(1)
      .single()
      
    if (data) setAdminPrincipal(data)
    setCargandoAdmin(false)
  }

  const handleActualizarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaSeleccionada) return
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('empresas_saas')
        .update({ 
          nombre: empresaSeleccionada.nombre,
          plan: empresaSeleccionada.plan,
          activa: empresaSeleccionada.activa,
          monto_mensual: empresaSeleccionada.monto_mensual,
          fecha_vencimiento: empresaSeleccionada.fecha_vencimiento
        })
        .eq('id', empresaSeleccionada.id)
      
      if (error) throw error
      alert('Empresa actualizada correctamente')
      fetchEmpresas()
      setShowManageModal(false)
    } catch (err: any) {
      console.error(err)
      alert('Error: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleCambiarPassword = async () => {
    if (!adminPrincipal || !nuevaPassword) return
    try {
      const { error } = await supabase.rpc('cambiar_password_admin', {
        target_user_id: adminPrincipal.id,
        new_password: nuevaPassword
      })
      if (error) throw error
      alert('Contraseña cambiada exitosamente')
      setNuevaPassword('')
    } catch (err: any) {
      console.error(err)
      alert('Error al cambiar contraseña: ' + err.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleCrearEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    try {
      // 1. Crear Empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas_saas')
        .insert([{ 
          nombre: form.empresaNombre, 
          plan: form.plan, 
          activa: true 
        }])
        .select()
        .single()

      if (empresaError) throw empresaError
      const nuevaEmpresaId = empresaData.id

      // 2. Crear Administrador en Auth usando edge function o RPC si está disponible.
      // Ya que no podemos llamar a sign up directamente para no cerrar la sesión del superadmin,
      // usaremos la función RPC que ya creamos en schema.sql para el admin: crear_usuario_admin
      // (Asumimos que el superadmin también tiene permisos para usar esta RPC, pero puede fallar si RLS lo bloquea.
      // Actualizaremos el RPC para permitir a superadmin).
      
      const { data: userId, error: rpcError } = await supabase.rpc('crear_usuario_admin', {
        new_email: form.adminEmail,
        new_password: form.adminPassword,
        new_nombre: form.adminNombre,
        new_rol: 'admin'
      })

      if (rpcError) throw rpcError

      // 3. Asignar el empresa_id al nuevo perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ empresa_id: nuevaEmpresaId })
        .eq('id', userId)

      if (profileError) throw profileError

      setShowNewModal(false)
      fetchEmpresas()
      alert('Empresa y Administrador creados exitosamente.')
      
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al crear la empresa')
    } finally {
      setGuardando(false)
    }
  }

  const generatePaymentLink = async (empresa: EmpresaSaas) => {
    setGeneratingLink(empresa.id)
    try {
      const response = await fetch('/api/generate-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tenantId: empresa.id, 
          amount: '30.00', 
          planType: empresa.plan 
        })
      })
      const result = await response.json()
      if (!response.ok || !result.paymentLink) throw new Error(result.error || 'Error al generar link')
      
      alert('Link de pago generado exitosamente')
      fetchEmpresas()
    } catch (err: any) {
      console.error(err)
      alert('Error al generar link: ' + err.message)
    } finally {
      setGeneratingLink(null)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Building2 className="text-brand-500" size={32} />
              SAAS Super Admin
            </h1>
            <p className="text-slate-400 mt-1">Gestión de Inquilinos (Empresas)</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </header>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-slate-800 mb-6 pb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab('empresas')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'empresas'
                ? 'text-brand-400 border-brand-400'
                : 'text-slate-400 border-transparent hover:text-white hover:border-slate-700'
            }`}
          >
            <Building2 size={16} />
            Inquilinos (Empresas)
          </button>
          <button
            onClick={() => setActiveTab('informes')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'informes'
                ? 'text-brand-400 border-brand-400'
                : 'text-slate-400 border-transparent hover:text-white hover:border-slate-700'
            }`}
          >
            <BarChart3 size={16} />
            Finanzas y Reportes
          </button>
        </div>

        {activeTab === 'empresas' ? (
          <>
            <div className="flex justify-end mb-6">
          <button 
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-glow/20"
          >
            <Plus size={18} />
            Nueva Empresa
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando empresas...</div>
        ) : (
          <div className="bg-surface-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-800 border-b border-slate-700">
                  <th className="p-4 text-sm font-medium text-slate-400">Empresa</th>
                  <th className="p-4 text-sm font-medium text-slate-400">Plan</th>
                  <th className="p-4 text-sm font-medium text-slate-400">Estado</th>
                  <th className="p-4 text-sm font-medium text-slate-400">Métricas</th>
                  <th className="p-4 text-sm font-medium text-slate-400">Pago (Paguelo Fácil)</th>
                  <th className="p-4 text-sm font-medium text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-800 hover:bg-surface-800/50">
                    <td className="p-4 text-white font-medium">{emp.nombre}</td>
                    <td className="p-4 text-slate-300 capitalize">{emp.plan}</td>
                    <td className="p-4">
                      {emp.activa ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle size={12} /> Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">
                          <XCircle size={12} /> Inactiva
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5" title="Total Usuarios">
                          <UsersIcon size={14} className="text-slate-500" />
                          <span className="font-semibold text-white">{emp.total_usuarios || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Total Tickets">
                          <TicketIcon size={14} className="text-slate-500" />
                          <span className="font-semibold text-white">{emp.total_tickets || 0}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {emp.payment_link ? (
                        <div className="flex items-center gap-2">
                          <a href={emp.payment_link} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline text-xs truncate max-w-[150px] inline-block">
                            {emp.payment_link}
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(emp.payment_link!)
                              alert('Link copiado al portapapeles')
                            }}
                            className="p-1 hover:bg-surface-700 rounded text-slate-400 transition-colors"
                            title="Copiar Link"
                          >
                            📋
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => generatePaymentLink(emp)}
                          disabled={generatingLink === emp.id}
                          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {generatingLink === emp.id ? 'Generando...' : 'Generar Link'}
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => openManageModal(emp)}
                        className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition-colors"
                      >
                        <Settings size={14} /> Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
                {empresas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      No hay empresas registradas aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
          </>
        ) : (
          <SuperAdminInformes />
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative animate-scale-in">
            <h2 className="text-xl font-bold text-white mb-6">Alta de Nueva Empresa</h2>
            
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-red-400 shrink-0" size={18} />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleCrearEmpresa} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre de la Empresa</label>
                <input
                  required
                  type="text"
                  value={form.empresaNombre}
                  onChange={(e) => setForm({...form, empresaNombre: e.target.value})}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                  placeholder="Ej. ACME Corp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Plan</label>
                <select
                  value={form.plan}
                  onChange={(e) => setForm({...form, plan: e.target.value})}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="pro">Pro ($30/mes - Ilimitado)</option>
                  <option value="basic">Básico</option>
                </select>
              </div>

              <div className="border-t border-slate-800 my-4 pt-4">
                <h3 className="text-sm font-semibold text-brand-400 mb-4">Datos del Primer Administrador</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Nombre Completo</label>
                    <input
                      required
                      type="text"
                      value={form.adminNombre}
                      onChange={(e) => setForm({...form, adminNombre: e.target.value})}
                      className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Correo Electrónico (Login)</label>
                    <input
                      required
                      type="email"
                      value={form.adminEmail}
                      onChange={(e) => setForm({...form, adminEmail: e.target.value})}
                      className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Contraseña</label>
                    <input
                      required
                      type="password"
                      minLength={6}
                      value={form.adminPassword}
                      onChange={(e) => setForm({...form, adminPassword: e.target.value})}
                      className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 bg-surface-800 hover:bg-surface-700 text-white py-2.5 rounded-xl font-medium transition-colors border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors shadow-glow/20"
                >
                  {guardando ? 'Creando...' : 'Crear Empresa y Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManageModal && empresaSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative animate-scale-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-1">Gestionar Empresa</h2>
            <p className="text-sm text-slate-400 mb-6">Detalles y configuración del Inquilino (Tenant)</p>
            
            <form onSubmit={handleActualizarEmpresa} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
                <input
                  required
                  type="text"
                  value={empresaSeleccionada.nombre}
                  onChange={(e) => setEmpresaSeleccionada({...empresaSeleccionada, nombre: e.target.value})}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Plan</label>
                <select
                  value={empresaSeleccionada.plan}
                  onChange={(e) => setEmpresaSeleccionada({...empresaSeleccionada, plan: e.target.value})}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="pro">Pro</option>
                  <option value="basic">Básico</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Monto Mensual ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={empresaSeleccionada.monto_mensual || ''}
                    onChange={(e) => setEmpresaSeleccionada({...empresaSeleccionada, monto_mensual: parseFloat(e.target.value)})}
                    className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Fecha Vencimiento</label>
                  <input
                    type="date"
                    value={empresaSeleccionada.fecha_vencimiento ? empresaSeleccionada.fecha_vencimiento.split('T')[0] : ''}
                    onChange={(e) => setEmpresaSeleccionada({...empresaSeleccionada, fecha_vencimiento: e.target.value})}
                    className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface-800 border border-slate-700 rounded-xl hover:bg-surface-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={empresaSeleccionada.activa}
                    onChange={(e) => setEmpresaSeleccionada({...empresaSeleccionada, activa: e.target.checked})}
                    className="w-5 h-5 rounded bg-surface-900 border-slate-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-800"
                  />
                  <div>
                    <span className="text-sm font-medium text-white block">Empresa Activa</span>
                    <span className="text-xs text-slate-400 block">Si se desactiva, nadie de esta empresa podrá iniciar sesión.</span>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white py-2 rounded-xl font-medium transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>

            <div className="border-t border-slate-800 my-6 pt-6">
              <h3 className="text-sm font-semibold text-brand-400 mb-4 flex items-center gap-2">
                <UsersIcon size={16} /> Administrador de la Cuenta
              </h3>
              
              {cargandoAdmin ? (
                <div className="text-sm text-slate-400">Cargando datos...</div>
              ) : adminPrincipal ? (
                <div className="space-y-4">
                  <div className="bg-surface-800 border border-slate-700 p-4 rounded-xl">
                    <p className="text-sm text-slate-400 mb-1">Nombre: <span className="text-white font-medium ml-1">{adminPrincipal.nombre}</span></p>
                    <p className="text-sm text-slate-400">Correo: <span className="text-white font-medium ml-1">{adminPrincipal.email}</span></p>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Nueva contraseña"
                      value={nuevaPassword}
                      onChange={(e) => setNuevaPassword(e.target.value)}
                      className="flex-1 bg-surface-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                    />
                    <button
                      onClick={handleCambiarPassword}
                      disabled={!nuevaPassword}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-yellow-400/80 bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20">
                  No se encontró ningún administrador principal para esta empresa.
                </div>
              )}
            </div>

            <button
              onClick={() => setShowManageModal(false)}
              className="mt-6 w-full bg-surface-800 hover:bg-surface-700 text-white py-2 rounded-xl font-medium transition-colors border border-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
