/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  // Google OAuth client ID for the Gmail booking-search feature. Public by
  // design (client-side OAuth); leave unset to hide the feature entirely.
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}
