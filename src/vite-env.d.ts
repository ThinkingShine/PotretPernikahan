/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute base URL of the API, e.g. https://potretpernikahan.vercel.app/api.
   * Leave unset when the app and the API share an origin, which is the case for
   * a normal Vercel deployment.
   */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
