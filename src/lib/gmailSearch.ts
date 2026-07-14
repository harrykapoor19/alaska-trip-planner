// Read-only Gmail search, straight from the browser to Gmail's REST API.
// No server, no AI, no cost — just the user's own token and a regex.

export interface GmailMatch {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

// Build a focused query from a vendor name + confirmation-ish keywords, so we
// surface the booking email and not the vendor's marketing newsletters.
export function bookingQuery(vendor: string): string {
  const cleaned = vendor.replace(/["]/g, "").trim();
  return `"${cleaned}" (confirmation OR reservation OR booking OR itinerary OR receipt OR order)`;
}

export async function searchGmail(
  token: string,
  query: string,
  max = 8,
): Promise<GmailMatch[]> {
  const listRes = await fetch(
    `${API}/messages?maxResults=${max}&q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok) throw new Error(`Gmail search failed (${listRes.status})`);
  const list = await listRes.json();
  const ids: string[] = (list.messages ?? []).map((m: { id: string }) => m.id);

  const msgs = await Promise.all(
    ids.map(async (id) => {
      const r = await fetch(
        `${API}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!r.ok) return null;
      const m = await r.json();
      const headers: { name: string; value: string }[] =
        m.payload?.headers ?? [];
      const h = (n: string) =>
        headers.find((x) => x.name.toLowerCase() === n)?.value ?? "";
      return {
        id,
        subject: h("subject") || "(no subject)",
        from: h("from"),
        date: h("date"),
        snippet: decodeSnippet(m.snippet ?? ""),
      } as GmailMatch;
    }),
  );
  return msgs.filter((m): m is GmailMatch => m !== null);
}

function decodeSnippet(s: string): string {
  // Gmail snippets arrive HTML-entity-encoded (&amp; &#39; etc.).
  const el = document.createElement("textarea");
  el.innerHTML = s;
  return el.value;
}

// Best-guess confirmation number: look for a code near a confirmation keyword,
// else fall back to the longest alphanumeric-looking token. Heuristic, not
// guaranteed — the user confirms before anything is saved.
export function guessConfirmation(text: string): string | undefined {
  const keyed = text.match(
    /(?:conf(?:irmation)?|reservation|booking|itinerary|order)\s*(?:#|no\.?|number|code|id)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{4,})/i,
  );
  if (keyed) return keyed[1];
  const tokens = text.match(/\b[A-Z0-9]{6,}\b/g);
  if (tokens) return tokens.sort((a, b) => b.length - a.length)[0];
  return undefined;
}
