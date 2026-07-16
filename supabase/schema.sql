-- ============================================================
-- ICON SUPPORT — Schema SQL para Supabase / PostgreSQL
-- Ejecutar este script en el SQL Editor de Supabase
-- ============================================================

-- Habilitar la extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLA: profiles (perfiles de usuario)
--    Vinculada a auth.users de Supabase Auth
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  rol         TEXT NOT NULL DEFAULT 'cliente'
                CHECK (rol IN ('admin', 'tecnico', 'cliente')),
  avatar_url  TEXT,
  telefono    TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice en rol para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_profiles_rol ON public.profiles(rol);

-- Trigger: actualizar actualizado_en automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: crear perfil automáticamente al registrarse en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auth_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 2. TABLA: tickets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo                TEXT NOT NULL,
  descripcion           TEXT,
  estado                TEXT NOT NULL DEFAULT 'abierto'
                          CHECK (estado IN ('abierto', 'en_proceso', 'cerrado')),
  prioridad             TEXT NOT NULL DEFAULT 'media'
                          CHECK (prioridad IN ('baja', 'media', 'alta')),
  categoria             TEXT DEFAULT 'general',
  cliente_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tecnico_asignado_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  qr_code_data          TEXT,           -- URL del ticket de seguimiento
  notas_internas        TEXT,           -- Solo visibles para técnicos/admin
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para filtros comunes
CREATE INDEX IF NOT EXISTS idx_tickets_estado      ON public.tickets(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_cliente_id  ON public.tickets(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tecnico_id  ON public.tickets(tecnico_asignado_id);
CREATE INDEX IF NOT EXISTS idx_tickets_prioridad   ON public.tickets(prioridad);

CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 3. TABLA: asistencias (Check-in / Check-out de técnicos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.asistencias (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tecnico_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticket_id           UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  -- Check-in
  hora_entrada        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitud_entrada     DOUBLE PRECISION,
  longitud_entrada    DOUBLE PRECISION,
  direccion_entrada   TEXT,
  -- Check-out
  hora_salida         TIMESTAMPTZ,
  latitud_salida      DOUBLE PRECISION,
  longitud_salida     DOUBLE PRECISION,
  direccion_salida    TEXT,
  -- Metadata
  notas               TEXT,
  duracion_minutos    INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN hora_salida IS NOT NULL
      THEN EXTRACT(EPOCH FROM (hora_salida - hora_entrada))::INTEGER / 60
      ELSE NULL
    END
  ) STORED,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asistencias_tecnico_id ON public.asistencias(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_ticket_id  ON public.asistencias(ticket_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha      ON public.asistencias(hora_entrada);


-- ============================================================
-- 4. TABLA: visitas_reportes (Reporte de cierre con firma y PDF)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visitas_reportes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id           UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  asistencia_id       UUID REFERENCES public.asistencias(id) ON DELETE SET NULL,
  tecnico_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Contenido del reporte
  resumen_trabajo     TEXT NOT NULL,
  materiales_usados   TEXT,
  horas_trabajadas    DECIMAL(5,2),
  -- Archivos en Supabase Storage
  firma_cliente_url   TEXT,             -- Path en bucket 'firmas'
  pdf_reporte_url     TEXT,             -- Path en bucket 'reportes'
  -- Estado
  enviado_email       BOOLEAN DEFAULT FALSE,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reportes_ticket_id  ON public.visitas_reportes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_reportes_tecnico_id ON public.visitas_reportes(tecnico_id);


-- ============================================================
-- 5. TABLA: comentarios_tickets (historial de actividad)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comentarios_tickets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  autor_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mensaje     TEXT NOT NULL,
  es_interno  BOOLEAN DEFAULT FALSE,   -- TRUE = solo visible para staff
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comentarios_ticket_id ON public.comentarios_tickets(ticket_id);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas_reportes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_tickets ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────
-- Helper: función para obtener el rol del usuario actual
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_rol()
RETURNS TEXT AS $$
  SELECT rol FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ────────────────────────────────────────────────
-- Políticas: PROFILES
-- ────────────────────────────────────────────────
-- Lectura: cada usuario ve su propio perfil; admin/tecnico ven todos
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR public.get_my_rol() IN ('admin', 'tecnico')
  );

-- Inserción: manejada por el trigger (SECURITY DEFINER)
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Actualización: propio perfil o admin
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid() OR public.get_my_rol() = 'admin'
  );


-- ────────────────────────────────────────────────
-- Políticas: TICKETS
-- ────────────────────────────────────────────────
-- Lectura: cliente ve sus tickets; técnico ve los asignados + todos si admin
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT USING (
    cliente_id = auth.uid()
    OR tecnico_asignado_id = auth.uid()
    OR public.get_my_rol() IN ('admin', 'tecnico')
  );

-- Creación: cualquier usuario autenticado puede crear tickets
CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND cliente_id = auth.uid()
  );

-- Actualización: técnico asignado o admin
CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE USING (
    tecnico_asignado_id = auth.uid()
    OR public.get_my_rol() = 'admin'
  );

-- Eliminación: solo admin
CREATE POLICY "tickets_delete" ON public.tickets
  FOR DELETE USING (public.get_my_rol() = 'admin');


-- ────────────────────────────────────────────────
-- Políticas: ASISTENCIAS
-- ────────────────────────────────────────────────
CREATE POLICY "asistencias_select" ON public.asistencias
  FOR SELECT USING (
    tecnico_id = auth.uid()
    OR public.get_my_rol() = 'admin'
  );

CREATE POLICY "asistencias_insert" ON public.asistencias
  FOR INSERT WITH CHECK (
    tecnico_id = auth.uid()
    AND public.get_my_rol() IN ('tecnico', 'admin')
  );

CREATE POLICY "asistencias_update" ON public.asistencias
  FOR UPDATE USING (
    tecnico_id = auth.uid()
    OR public.get_my_rol() = 'admin'
  );


-- ────────────────────────────────────────────────
-- Políticas: VISITAS_REPORTES
-- ────────────────────────────────────────────────
CREATE POLICY "reportes_select" ON public.visitas_reportes
  FOR SELECT USING (
    tecnico_id = auth.uid()
    OR public.get_my_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id AND t.cliente_id = auth.uid()
    )
  );

CREATE POLICY "reportes_insert" ON public.visitas_reportes
  FOR INSERT WITH CHECK (
    tecnico_id = auth.uid()
    AND public.get_my_rol() IN ('tecnico', 'admin')
  );

CREATE POLICY "reportes_update" ON public.visitas_reportes
  FOR UPDATE USING (
    tecnico_id = auth.uid()
    OR public.get_my_rol() = 'admin'
  );


-- ────────────────────────────────────────────────
-- Políticas: COMENTARIOS
-- ────────────────────────────────────────────────
CREATE POLICY "comentarios_select" ON public.comentarios_tickets
  FOR SELECT USING (
    -- Comentarios públicos: todos los involucrados en el ticket
    (NOT es_interno AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
        AND (t.cliente_id = auth.uid() OR t.tecnico_asignado_id = auth.uid())
    ))
    -- Comentarios internos: solo staff
    OR (es_interno AND public.get_my_rol() IN ('admin', 'tecnico'))
    OR public.get_my_rol() = 'admin'
  );

CREATE POLICY "comentarios_insert" ON public.comentarios_tickets
  FOR INSERT WITH CHECK (
    autor_id = auth.uid()
    AND auth.uid() IS NOT NULL
  );


-- ============================================================
-- STORAGE: Buckets (ejecutar también desde el SQL Editor)
-- ============================================================

-- Bucket para firmas de clientes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'firmas',
  'firmas',
  true,
  5242880,  -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket para PDFs de reportes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reportes',
  'reportes',
  true,
  20971520,  -- 20 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket para avatares de usuario
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatares',
  'avatares',
  true,
  2097152,   -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage: técnicos y admin pueden subir firmas y reportes
CREATE POLICY "storage_firmas_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'firmas'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "storage_firmas_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'firmas');

CREATE POLICY "storage_reportes_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reportes'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "storage_reportes_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'reportes');

CREATE POLICY "storage_avatares_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatares'
    AND auth.uid() = (storage.foldername(name))[1]::uuid
  );

CREATE POLICY "storage_avatares_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatares');


-- ============================================================
-- FUNCIONES ÚTILES
-- ============================================================

-- Obtener estadísticas de tickets para el dashboard
CREATE OR REPLACE FUNCTION public.get_ticket_stats()
RETURNS TABLE (
  total       BIGINT,
  abiertos    BIGINT,
  en_proceso  BIGINT,
  cerrados    BIGINT
) AS $$
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE estado = 'abierto'),
    COUNT(*) FILTER (WHERE estado = 'en_proceso'),
    COUNT(*) FILTER (WHERE estado = 'cerrado')
  FROM public.tickets;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- Crear nuevo usuario desde el panel de administración
CREATE OR REPLACE FUNCTION public.crear_usuario_admin(
  new_email TEXT,
  new_password TEXT,
  new_nombre TEXT,
  new_rol TEXT,
  new_telefono TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Generar un nuevo ID de usuario
  new_user_id := gen_random_uuid();

  -- Insertar en auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    new_email,
    extensions.crypt(new_password, extensions.gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('nombre', new_nombre, 'rol', new_rol)::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now(),
    new_telefono,
    CASE WHEN new_telefono IS NOT NULL THEN now() ELSE NULL END
  );

  -- Actualizar el teléfono en public.profiles ya que el trigger no lo mapea automáticamente
  IF new_telefono IS NOT NULL THEN
    UPDATE public.profiles
    SET telefono = new_telefono
    WHERE id = new_user_id;
  END IF;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

