-- ============================================================
-- ICON SUPPORT — Dashboard Extendido del Súper Admin
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Crear una función RPC para obtener las empresas con sus métricas (usuarios y tickets)
CREATE OR REPLACE FUNCTION public.get_superadmin_metrics()
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  plan TEXT,
  activa BOOLEAN,
  creado_en TIMESTAMPTZ,
  payment_link TEXT,
  total_usuarios BIGINT,
  total_tickets BIGINT
) AS $$
BEGIN
  -- Validar que quien ejecuta tenga rol superadmin
  IF public.get_my_rol() != 'superadmin' THEN
    RAISE EXCEPTION 'No tienes permisos para ver métricas globales';
  END IF;

  RETURN QUERY
  SELECT 
    e.id,
    e.nombre,
    e.plan,
    e.activa,
    e.creado_en,
    e.payment_link,
    (SELECT COUNT(*) FROM public.profiles p WHERE p.empresa_id = e.id) as total_usuarios,
    (SELECT COUNT(*) FROM public.tickets t WHERE t.empresa_id = e.id) as total_tickets
  FROM public.empresas_saas e
  ORDER BY e.creado_en DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Permitir a los superadmin cambiar la contraseña de cualquier usuario sin restricciones de tenant.
-- (Reemplazando la antigua que quizás validaba empresa_id)
CREATE OR REPLACE FUNCTION public.cambiar_password_admin(
  target_user_id UUID,
  new_password TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ejecutor_rol TEXT;
  ejecutor_empresa_id UUID;
  target_empresa_id UUID;
BEGIN
  ejecutor_rol := public.get_my_rol();
  ejecutor_empresa_id := public.get_my_empresa_id();

  -- Obtener la empresa del usuario objetivo
  SELECT empresa_id INTO target_empresa_id FROM public.profiles WHERE id = target_user_id;

  -- Validar permisos
  IF ejecutor_rol = 'superadmin' THEN
    -- Superadmin puede cambiar la de cualquiera
    NULL;
  ELSIF ejecutor_rol = 'admin' AND ejecutor_empresa_id = target_empresa_id THEN
    -- Admin solo puede cambiar la de su misma empresa
    NULL;
  ELSE
    RAISE EXCEPTION 'No tienes permisos para cambiar la contraseña de este usuario';
  END IF;

  -- Ejecutar el cambio en auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

END;
$$;

-- 3. Recargar el schema de PostgREST
NOTIFY pgrst, 'reload schema';
