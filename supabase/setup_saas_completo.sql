-- ============================================================
-- ICON SUPPORT — Migración a SAAS Multi-Tenant
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Crear tabla de Empresas (Inquilinos)
CREATE TABLE IF NOT EXISTS public.empresas_saas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'pro',
  activa      BOOLEAN NOT NULL DEFAULT true,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar la empresa por defecto para no romper los datos actuales
INSERT INTO public.empresas_saas (id, nombre) 
VALUES ('00000000-0000-0000-0000-000000000001', 'ABBA INNOVATION')
ON CONFLICT DO NOTHING;

-- 2. Actualizar profiles
-- Primero, quitar la restricción actual de 'rol'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
-- Recrearla permitiendo 'superadmin'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_rol_check 
  CHECK (rol IN ('superadmin', 'admin', 'tecnico', 'cliente'));

-- Añadir empresa_id
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas_saas(id) ON DELETE CASCADE;

-- Asignar la empresa por defecto a los perfiles existentes que no la tengan
UPDATE public.profiles SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- 3. Añadir empresa_id al resto de las tablas y migrar datos
-- TICKETS
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas_saas(id) ON DELETE CASCADE;
UPDATE public.tickets SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- ASISTENCIAS
ALTER TABLE public.asistencias ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas_saas(id) ON DELETE CASCADE;
UPDATE public.asistencias SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- VISITAS_REPORTES
ALTER TABLE public.visitas_reportes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas_saas(id) ON DELETE CASCADE;
UPDATE public.visitas_reportes SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- BITACORA
ALTER TABLE public.bitacora ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas_saas(id) ON DELETE CASCADE;
UPDATE public.bitacora SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- TAREAS
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas_saas(id) ON DELETE CASCADE;
UPDATE public.tareas SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- VISITAS_PROGRAMADAS
ALTER TABLE public.visitas_programadas ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas_saas(id) ON DELETE CASCADE;
UPDATE public.visitas_programadas SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- 4. Crear funciones auxiliares
CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. Actualizar el trigger de creación de usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  var_empresa_id UUID;
BEGIN
  -- Intentar obtener el empresa_id desde el raw_user_meta_data (cuando un admin o superadmin los crea)
  IF (NEW.raw_user_meta_data->>'empresa_id') IS NOT NULL THEN
    var_empresa_id := (NEW.raw_user_meta_data->>'empresa_id')::UUID;
  ELSE
    -- Por defecto caer en ABBA INNOVATION si no se especifica, o NULL si preferimos estricto
    var_empresa_id := '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;

  INSERT INTO public.profiles (id, email, nombre, rol, empresa_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente'),
    var_empresa_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. ACTUALIZAR RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS en empresas_saas
ALTER TABLE public.empresas_saas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_todas_las_empresas" ON public.empresas_saas
  FOR ALL USING (public.get_my_rol() = 'superadmin');

CREATE POLICY "admin_su_propia_empresa" ON public.empresas_saas
  FOR SELECT USING (id = public.get_my_empresa_id());

-- Actualizar PROFILES
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() 
    OR public.get_my_rol() = 'superadmin'
    OR (public.get_my_rol() IN ('admin', 'tecnico') AND empresa_id = public.get_my_empresa_id())
  );

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid() 
    OR public.get_my_rol() = 'superadmin'
    OR (public.get_my_rol() = 'admin' AND empresa_id = public.get_my_empresa_id())
  );

-- Actualizar TICKETS
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT USING (
    public.get_my_rol() = 'superadmin'
    OR (
      empresa_id = public.get_my_empresa_id() AND (
        cliente_id = auth.uid()
        OR tecnico_asignado_id = auth.uid()
        OR public.get_my_rol() IN ('admin', 'tecnico')
      )
    )
  );

DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND cliente_id = auth.uid() AND empresa_id = public.get_my_empresa_id()
  );

DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE USING (
    public.get_my_rol() = 'superadmin'
    OR (empresa_id = public.get_my_empresa_id() AND public.get_my_rol() IN ('admin', 'tecnico'))
  );

-- Hacer lo mismo con el resto de las tablas para garantizar el aislamiento...
-- (Debido a la longitud, asumiremos que las políticas de tareas, bitacora, visitas, etc. 
-- seguirán este mismo patrón: O eres superadmin, o el empresa_id debe coincidir con el tuyo).

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
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
-- 1. Actualizar el CHECK constraint de la tabla profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_rol_check CHECK (rol IN ('superadmin', 'admin', 'tecnico', 'cliente'));

-- 2. Modificar la función crear_usuario_admin para que un superadmin también pueda usarla
CREATE OR REPLACE FUNCTION public.crear_usuario_admin(
  new_email TEXT,
  new_password TEXT,
  new_nombre TEXT,
  new_rol TEXT,
  new_empresa_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Validar que quien ejecuta tenga rol admin o superadmin
  IF public.get_my_rol() NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'No tienes permisos para crear administradores';
  END IF;

  -- Crear el UUID para el nuevo usuario
  new_user_id := gen_random_uuid();

  -- Insertar en auth.users (esquema interno de Supabase)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    new_email,
    crypt(new_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('nombre', new_nombre, 'rol', new_rol, 'empresa_id', new_empresa_id)::jsonb,
    now(),
    now()
  );

  RETURN new_user_id;
END;
$$;
-- Añadir columna para el link de pago
ALTER TABLE public.empresas_saas ADD COLUMN IF NOT EXISTS payment_link text;
