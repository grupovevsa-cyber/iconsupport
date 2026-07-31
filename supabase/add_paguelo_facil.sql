-- Añadir columna para el link de pago
ALTER TABLE public.empresas_saas ADD COLUMN IF NOT EXISTS payment_link text;
