-- ============================================================
-- ICON SUPPORT — Base de Datos Facturación y Reportes
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Nuevos campos en empresas_saas
ALTER TABLE public.empresas_saas ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
ALTER TABLE public.empresas_saas ADD COLUMN IF NOT EXISTS monto_mensual NUMERIC(10,2) DEFAULT 30.00;

-- Establecer fecha de vencimiento inicial para las empresas existentes (+1 mes desde su creación)
UPDATE public.empresas_saas 
SET fecha_vencimiento = (creado_en + interval '1 month')::DATE 
WHERE fecha_vencimiento IS NULL;

-- 2. Crear tabla de historial de pagos
CREATE TABLE IF NOT EXISTS public.pagos_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas_saas(id) ON DELETE CASCADE,
  monto NUMERIC(10,2) NOT NULL,
  fecha_pago TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  referencia_pago TEXT,
  metodo_pago TEXT DEFAULT 'paguelo_facil',
  estado TEXT DEFAULT 'completado',
  creado_por UUID -- Usuario que registró el pago (superadmin)
);

-- Políticas RLS para historial de pagos
ALTER TABLE public.pagos_historial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "superadmin_pagos" ON public.pagos_historial;
CREATE POLICY "superadmin_pagos" ON public.pagos_historial FOR ALL USING (public.get_my_rol() = 'superadmin');

DROP POLICY IF EXISTS "admin_pagos" ON public.pagos_historial;
CREATE POLICY "admin_pagos" ON public.pagos_historial FOR SELECT USING (empresa_id = public.get_my_empresa_id());

-- 3. Crear función de informes avanzados para el Super Admin
CREATE OR REPLACE FUNCTION public.get_informes_superadmin()
RETURNS JSONB AS $$
DECLARE
  var_total_ingresos NUMERIC;
  pagos_json JSONB;
  empresas_json JSONB;
  roles_json JSONB;
BEGIN
  IF public.get_my_rol() != 'superadmin' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- 1. Ingresos globales
  SELECT COALESCE(SUM(monto), 0) INTO var_total_ingresos FROM public.pagos_historial WHERE estado = 'completado';

  -- 2. Últimos pagos
  SELECT jsonb_agg(row_to_json(p)) INTO pagos_json FROM (
    SELECT ph.id, ph.monto, ph.fecha_pago, ph.metodo_pago, ph.referencia_pago, e.nombre as empresa_nombre
    FROM public.pagos_historial ph
    JOIN public.empresas_saas e ON ph.empresa_id = e.id
    ORDER BY ph.fecha_pago DESC
    LIMIT 50
  ) p;

  -- 3. Métricas por empresa (Ingresos y Tickets)
  SELECT jsonb_agg(row_to_json(em)) INTO empresas_json FROM (
    SELECT 
      e.id, 
      e.nombre,
      (SELECT COALESCE(SUM(monto), 0) FROM public.pagos_historial WHERE empresa_id = e.id AND estado='completado') as ingresos_totales,
      (SELECT COUNT(*) FROM public.tickets WHERE empresa_id = e.id) as total_tickets
    FROM public.empresas_saas e
    ORDER BY e.creado_en DESC
  ) em;

  -- 4. Distribución de Roles por empresa
  SELECT jsonb_agg(row_to_json(r)) INTO roles_json FROM (
    SELECT 
      e.nombre as empresa_nombre,
      p.rol,
      COUNT(p.id) as total
    FROM public.profiles p
    JOIN public.empresas_saas e ON p.empresa_id = e.id
    GROUP BY e.nombre, p.rol
    ORDER BY e.nombre, p.rol
  ) r;

  RETURN jsonb_build_object(
    'total_ingresos', var_total_ingresos,
    'ultimos_pagos', COALESCE(pagos_json, '[]'::jsonb),
    'metricas_empresas', COALESCE(empresas_json, '[]'::jsonb),
    'distribucion_roles', COALESCE(roles_json, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';
