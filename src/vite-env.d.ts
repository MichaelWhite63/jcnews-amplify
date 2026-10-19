/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** LOCAL TESTING ONLY: base URL of amplify/scripts/access/dev-server.ts (ignored in production builds). */
  readonly VITE_ACCESS_DEV_API?: string
  /** LOCAL TESTING ONLY: 'iam' = read data with legacy guest mode under vite dev. */
  readonly VITE_ACCESS_DATA_AUTH?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
