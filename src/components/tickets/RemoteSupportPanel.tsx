import React, { useState, useEffect } from 'react';
import { MonitorPlay, Copy, ExternalLink, X, Shield, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { Ticket, Profile, SesionRemota } from '../../types';
import { toast } from 'react-hot-toast';

interface RemoteSupportPanelProps {
  ticket: Ticket;
  currentUser: Profile;
  onClose: () => void;
}

export function RemoteSupportPanel({ ticket, currentUser, onClose }: RemoteSupportPanelProps) {
  const [sesion, setSesion] = useState<SesionRemota | null>(null);
  const [loading, setLoading] = useState(false);
  const [codigoConexion, setCodigoConexion] = useState('');
  const [passwordConexion, setPasswordConexion] = useState('');

  // Cargar sesión activa si existe
  const fetchSesion = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sesiones_remotas')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle(); // Usar maybeSingle para evitar errores 406 si no hay fila
    
    if (data) {
      setSesion(data as SesionRemota);
      setCodigoConexion(data.codigo_conexion || '');
      setPasswordConexion(data.password_conexion || '');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSesion();
  }, [ticket.id]);

  const solicitarSesion = async () => {
    setLoading(true);
    const nuevaSesion = {
      ticket_id: ticket.id,
      tecnico_id: currentUser.id,
      cliente_id: ticket.cliente_id,
      empresa_id: ticket.empresa_id,
      estado: 'solicitado'
    };

    const { data, error } = await supabase
      .from('sesiones_remotas')
      .insert([nuevaSesion])
      .select()
      .single();

    if (error) {
      toast.error('Error al solicitar sesión remota. (¿Ejecutaste la migración SQL?)');
    } else {
      setSesion(data as SesionRemota);
      toast.success('Solicitud enviada al cliente');
      // Intento actualizar estado_remoto en tickets
      await supabase.from('tickets').update({ estado_remoto: 'solicitado' }).eq('id', ticket.id);
    }
    setLoading(false);
  };

  const guardarCredenciales = async () => {
    if (!sesion) return;
    setLoading(true);
    const { error } = await supabase
      .from('sesiones_remotas')
      .update({
        codigo_conexion: codigoConexion,
        password_conexion: passwordConexion,
        estado: 'conectado'
      })
      .eq('id', sesion.id);

    if (error) {
      toast.error('Error al guardar credenciales');
    } else {
      toast.success('Credenciales guardadas. Listo para conectar.');
      fetchSesion();
    }
    setLoading(false);
  };

  const iniciarConexionWeb = () => {
    // Abrir VisorRemotoPage en nueva pestaña
    const url = `/admin/visor-remoto/${ticket.id}?host=${codigoConexion}&pwd=${passwordConexion}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-surface-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl w-full max-w-md animate-fade-in">
      <div className="bg-brand-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <MonitorPlay size={20} />
          <h3 className="font-bold">ICON Remote Helpdesk</h3>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="text-sm text-slate-300">
          <p>Asistencia remota utilizando <strong>Google Chrome Remote Desktop</strong>.</p>
        </div>

        {!sesion ? (
          <div className="text-center py-6">
            <Shield size={48} className="mx-auto text-slate-600 mb-3" />
            <button
              onClick={solicitarSesion}
              disabled={loading}
              className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full"
            >
              {loading ? 'Generando...' : 'Solicitar Acceso Remoto al Cliente'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-3 rounded-lg border ${sesion.estado === 'solicitado' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">
                  Estado: {sesion.estado === 'solicitado' ? 'Esperando Código del Cliente...' : 'Código Recibido / Listo'}
                </span>
                <button onClick={fetchSesion} className="hover:text-white" title="Actualizar estado">
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Código de Asistencia (12 dígitos)</label>
                <input
                  type="text"
                  value={codigoConexion}
                  onChange={(e) => setCodigoConexion(e.target.value)}
                  placeholder="Ej. 1234 5678 9012"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500 font-mono tracking-widest text-center text-lg"
                />
              </div>
              
              <button
                onClick={guardarCredenciales}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-slate-700"
              >
                Guardar Código
              </button>
            </div>

            <hr className="border-slate-800" />

            <button
              onClick={() => window.open('https://remotedesktop.google.com/support', '_blank')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
            >
              <ExternalLink size={18} />
              Abrir Google Remote Desktop
            </button>
            <p className="text-xs text-slate-500 text-center">
              Copia el código de arriba y pégalo en la página de Google para conectar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
