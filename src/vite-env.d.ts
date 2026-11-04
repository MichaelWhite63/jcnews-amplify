/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** LOCAL TESTING ONLY: base URL of amplify/scripts/access/dev-server.ts (ignored in production builds). */
  readonly VITE_ACCESS_DEV_API?: string
  /** LOCAL TESTING ONLY: 'iam' = read data with legacy guest mode under vite dev. */
  readonly VITE_ACCESS_DATA_AUTH?: string
  /** LOCAL REVIEW ONLY: '1' = fake session under vite dev on localhost (ignored in production builds). */
  readonly VITE_ACCESS_DEV_BYPASS?: string
  readonly VITE_ACCESS_DEV_BYPASS_EMAIL?: string
  readonly VITE_ACCESS_DEV_BYPASS_SOURCES?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
