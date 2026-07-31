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
