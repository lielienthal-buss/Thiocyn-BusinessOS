/// <reference types="vite/client" />

// Vite Environment Variables Type Definitions
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_ENV?: string
  readonly VITE_DEBUG?: string
}
