// Google OAuth for the Gmail booking-search feature — client-side only.
//
// Privacy model that matters: this uses Google Identity Services in the
// browser. Each person grants read-only Gmail access to their OWN inbox via
// Google's own consent screen. The access token lives in memory only (gone on
// tab close), never touches our server, and can be revoked anytime from the
// user's Google account settings. Nobody can read anyone else's mail.

const GIS_SRC = "https://accounts.google.com/gsi/client";
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export function gmailConfigured(): boolean {
  return !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
}

let scriptPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google sign-in"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// Opens Google's consent popup and resolves with a short-lived access token.
export async function requestGmailToken(): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("VITE_GOOGLE_CLIENT_ID is not set");
  await loadGis();

  return new Promise<string>((resolve, reject) => {
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GMAIL_SCOPE,
      callback: (resp: { access_token?: string; error?: string }) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || "No access token returned"));
        } else {
          resolve(resp.access_token);
        }
      },
    });
    client.requestAccessToken();
  });
}
