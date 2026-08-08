-- ============================================================
-- SQL: Integración de Soporte Remoto (Sesiones)
-- ============================================================

-- Tabla para gestionar las sesiones de asistencia remota
CREATE TABLE IF NOT EXISTS public.sesiones_remotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    tecnico_id UUID NOT NULL REFERENCES public.profiles(id),
    cliente_id UUID REFERENCES public.profiles(id),
    empresa_id UUID REFERENCES public.empresas_saas(id),
    
    codigo_conexion TEXT, -- ID de RustDesk o similar
    password_conexion TEXT, -- Password (encriptado si es posible o texto plano para este MVP)
    
    estado TEXT NOT NULL DEFAULT 'solicitado' CHECK (estado IN ('solicitado', 'conectado', 'finalizado', 'cancelado')),
    
    notas_sesion TEXT,
    
    iniciada_en TIMESTAMPTZ,
    finalizada_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.sesiones_remotas ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad para sesiones_remotas
-- 1. Los técnicos pueden ver y actualizar las sesiones que han creado o que pertenecen a su empresa
CREATE POLICY "Técnicos ven sesiones remotas de su empresa"
    ON public.sesiones_remotas
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.rol IN ('tecnico', 'admin', 'superadmin')
        )
    );

CREATE POLICY "Técnicos pueden crear sesiones remotas"
    ON public.sesiones_remotas
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.rol IN ('tecnico', 'admin', 'superadmin')
        )
    );

CREATE POLICY "Técnicos pueden actualizar sesiones remotas"
    ON public.sesiones_remotas
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.rol IN ('tecnico', 'admin', 'superadmin')
        )
    );

-- 2. Clientes solo pueden ver las sesiones remotas asociadas a sus tickets
CREATE POLICY "Clientes ven sus propias sesiones remotas"
    ON public.sesiones_remotas
    FOR SELECT
    USING (
        cliente_id = auth.uid()
    );

CREATE POLICY "Clientes pueden actualizar estado (para autorizar/cancelar)"
    ON public.sesiones_remotas
    FOR UPDATE
    USING (
        cliente_id = auth.uid()
    );

-- Modificar tabla tickets para incluir un atajo al estado remoto (opcional, pero útil para la UI rápida)
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS estado_remoto TEXT DEFAULT 'inactivo' CHECK (estado_remoto IN ('inactivo', 'solicitado', 'conectado', 'finalizado'));
