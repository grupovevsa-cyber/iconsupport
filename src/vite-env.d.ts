/// <reference types="vite/client" />

// Tipar las variables de entorno de Vite para TypeScript
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL: string
  readonly VITE_EMPRESA_NOMBRE: string
  readonly VITE_EMPRESA_RIF: string
  readonly VITE_EMPRESA_TELEFONO: string
  readonly VITE_EMPRESA_EMAIL: string
  readonly VITE_EMPRESA_DIRECCION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
