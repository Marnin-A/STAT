/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL. Unset means the app runs on MockApiClient. */
  readonly VITE_API_URL?: string
  /** Interim principal headers until Better Auth lands (M4). Never a secret. */
  readonly VITE_DEV_USER_ID?: string
  readonly VITE_DEV_ROLE?: string
  readonly VITE_DEV_AGENCY_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
