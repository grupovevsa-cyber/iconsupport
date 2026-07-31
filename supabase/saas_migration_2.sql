-- ============================================================
-- ICON SUPPORT — Finalización de SAAS Multi-Tenant (Aislamiento)
-- ============================================================

-- 1. TRIGGER PARA AUTORRELLENAR empresa_id AL INSERTAR
-- Esto evita tener que modificar el frontend en cada formulario de creación.
CREATE OR REPLACE FUNCTION public.set_empresa_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.get_my_empresa_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar el trigger a todas las tablas del inquilino
DROP TRIGGER IF EXISTS trigger_set_empresa_id_tickets ON public.tickets;
CREATE TRIGGER trigger_set_empresa_id_tickets BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id_on_insert();

DROP TRIGGER IF EXISTS trigger_set_empresa_id_asistencias ON public.asistencias;
CREATE TRIGGER trigger_set_empresa_id_asistencias BEFORE INSERT ON public.asistencias FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id_on_insert();

DROP TRIGGER IF EXISTS trigger_set_empresa_id_visitas_reportes ON public.visitas_reportes;
CREATE TRIGGER trigger_set_empresa_id_visitas_reportes BEFORE INSERT ON public.visitas_reportes FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id_on_insert();

DROP TRIGGER IF EXISTS trigger_set_empresa_id_bitacora ON public.bitacora;
CREATE TRIGGER trigger_set_empresa_id_bitacora BEFORE INSERT ON public.bitacora FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id_on_insert();

DROP TRIGGER IF EXISTS trigger_set_empresa_id_tareas ON public.tareas;
CREATE TRIGGER trigger_set_empresa_id_tareas BEFORE INSERT ON public.tareas FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id_on_insert();

DROP TRIGGER IF EXISTS trigger_set_empresa_id_visitas_prog ON public.visitas_programadas;
CREATE TRIGGER trigger_set_empresa_id_visitas_prog BEFORE INSERT ON public.visitas_programadas FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id_on_insert();

-- ============================================================
-- 2. POLÍTICAS RLS RESTANTES PARA AISLAMIENTO TOTAL
-- ============================================================

-- ASISTENCIAS
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asistencias_select" ON public.asistencias;
CREATE POLICY "asistencias_select" ON public.asistencias
  FOR SELECT USING (public.get_my_rol() = 'superadmin' OR empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "asistencias_insert" ON public.asistencias;
CREATE POLICY "asistencias_insert" ON public.asistencias
  FOR INSERT WITH CHECK (empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "asistencias_update" ON public.asistencias;
CREATE POLICY "asistencias_update" ON public.asistencias
  FOR UPDATE USING (public.get_my_rol() = 'superadmin' OR (empresa_id = public.get_my_empresa_id() AND public.get_my_rol() IN ('admin', 'tecnico')));

-- VISITAS_REPORTES
ALTER TABLE public.visitas_reportes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "visitas_reportes_select" ON public.visitas_reportes;
CREATE POLICY "visitas_reportes_select" ON public.visitas_reportes
  FOR SELECT USING (public.get_my_rol() = 'superadmin' OR empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "visitas_reportes_insert" ON public.visitas_reportes;
CREATE POLICY "visitas_reportes_insert" ON public.visitas_reportes
  FOR INSERT WITH CHECK (empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "visitas_reportes_update" ON public.visitas_reportes;
CREATE POLICY "visitas_reportes_update" ON public.visitas_reportes
  FOR UPDATE USING (public.get_my_rol() = 'superadmin' OR (empresa_id = public.get_my_empresa_id() AND public.get_my_rol() IN ('admin', 'tecnico')));

-- BITACORA
ALTER TABLE public.bitacora ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bitacora_select" ON public.bitacora;
CREATE POLICY "bitacora_select" ON public.bitacora
  FOR SELECT USING (public.get_my_rol() = 'superadmin' OR empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "bitacora_insert" ON public.bitacora;
CREATE POLICY "bitacora_insert" ON public.bitacora
  FOR INSERT WITH CHECK (empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "bitacora_update" ON public.bitacora;
CREATE POLICY "bitacora_update" ON public.bitacora
  FOR UPDATE USING (public.get_my_rol() = 'superadmin' OR (empresa_id = public.get_my_empresa_id() AND public.get_my_rol() IN ('admin', 'tecnico')));

-- TAREAS
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tareas_select" ON public.tareas;
CREATE POLICY "tareas_select" ON public.tareas
  FOR SELECT USING (public.get_my_rol() = 'superadmin' OR empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "tareas_insert" ON public.tareas;
CREATE POLICY "tareas_insert" ON public.tareas
  FOR INSERT WITH CHECK (empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "tareas_update" ON public.tareas;
CREATE POLICY "tareas_update" ON public.tareas
  FOR UPDATE USING (public.get_my_rol() = 'superadmin' OR (empresa_id = public.get_my_empresa_id() AND public.get_my_rol() IN ('admin', 'tecnico')));

-- VISITAS_PROGRAMADAS
ALTER TABLE public.visitas_programadas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "visitas_prog_select" ON public.visitas_programadas;
CREATE POLICY "visitas_prog_select" ON public.visitas_programadas
  FOR SELECT USING (public.get_my_rol() = 'superadmin' OR empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "visitas_prog_insert" ON public.visitas_programadas;
CREATE POLICY "visitas_prog_insert" ON public.visitas_programadas
  FOR INSERT WITH CHECK (empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "visitas_prog_update" ON public.visitas_programadas;
CREATE POLICY "visitas_prog_update" ON public.visitas_programadas
  FOR UPDATE USING (public.get_my_rol() = 'superadmin' OR (empresa_id = public.get_my_empresa_id() AND public.get_my_rol() IN ('admin', 'tecnico')));

-- Arreglar tickets_insert policy para que un admin o técnico también puedan crear tickets para clientes
DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT WITH CHECK (
    empresa_id = public.get_my_empresa_id()
  );
