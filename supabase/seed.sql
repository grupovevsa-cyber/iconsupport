-- ============================================================
-- ICON SUPPORT — Datos de Prueba (seed.sql)
-- Ejecutar DESPUÉS del schema.sql
-- Nota: los UUIDs de usuarios deben existir en auth.users
-- Usa el SQL Editor de Supabase para crear usuarios de prueba
-- ============================================================

-- PASO 1: Registra estos usuarios en Supabase Auth Dashboard primero:
--   admin@iconsupport.com  / Admin2024!
--   tecnico@iconsupport.com / Tecnico2024!
--   cliente@iconsupport.com / Cliente2024!
-- 
-- PASO 2: Copia los UUIDs generados y reemplaza abajo

DO $$
DECLARE
  v_admin_id   UUID;
  v_tecnico_id UUID;
  v_cliente_id UUID;
  v_ticket1_id UUID;
  v_ticket2_id UUID;
  v_asist_id   UUID;
BEGIN
  -- Obtener IDs de los usuarios creados (ajusta los emails si es necesario)
  SELECT id INTO v_admin_id   FROM public.profiles WHERE email = 'admin@iconsupport.com'    LIMIT 1;
  SELECT id INTO v_tecnico_id FROM public.profiles WHERE email = 'tecnico@iconsupport.com'  LIMIT 1;
  SELECT id INTO v_cliente_id FROM public.profiles WHERE email = 'cliente@iconsupport.com'  LIMIT 1;

  -- Actualizar roles
  IF v_admin_id IS NOT NULL THEN
    UPDATE public.profiles SET rol = 'admin',   nombre = 'Administrador ICON' WHERE id = v_admin_id;
  END IF;
  IF v_tecnico_id IS NOT NULL THEN
    UPDATE public.profiles SET rol = 'tecnico', nombre = 'Carlos Técnico',    telefono = '+1-555-0100' WHERE id = v_tecnico_id;
  END IF;
  IF v_cliente_id IS NOT NULL THEN
    UPDATE public.profiles SET rol = 'cliente', nombre = 'Empresa Demo SA',   telefono = '+1-555-0200' WHERE id = v_cliente_id;
  END IF;

  -- Crear tickets de prueba (solo si existen los usuarios)
  IF v_cliente_id IS NOT NULL THEN
    INSERT INTO public.tickets (titulo, descripcion, estado, prioridad, categoria, cliente_id, tecnico_asignado_id)
    VALUES
      (
        'Falla en impresora de facturas',
        'La impresora HP LaserJet no imprime desde ayer. Se traba el papel en el rodillo trasero.',
        'abierto', 'alta', 'hardware',
        v_cliente_id, v_tecnico_id
      ),
      (
        'Configurar red WiFi en sucursal norte',
        'Necesitamos extender la red WiFi al área de bodega. Requiere un access point adicional.',
        'en_proceso', 'media', 'redes',
        v_cliente_id, v_tecnico_id
      ),
      (
        'Instalación Windows 11 en 3 equipos',
        'Actualizar los equipos de contabilidad a Windows 11 Pro.',
        'cerrado', 'baja', 'software',
        v_cliente_id, v_tecnico_id
      )
    RETURNING id INTO v_ticket1_id;

    -- Agregar comentarios de prueba
    IF v_ticket1_id IS NOT NULL AND v_tecnico_id IS NOT NULL THEN
      INSERT INTO public.comentarios_tickets (ticket_id, autor_id, mensaje, es_interno) VALUES
        (v_ticket1_id, v_tecnico_id, 'Revisando el problema. Voy a ir el martes.', false),
        (v_ticket1_id, v_cliente_id, 'Gracias, estamos esperando su visita.', false),
        (v_ticket1_id, v_tecnico_id, 'NOTA INTERNA: Llevar repuesto de rodillo HP RM1-6903.', true);
    END IF;
  END IF;

END $$;
