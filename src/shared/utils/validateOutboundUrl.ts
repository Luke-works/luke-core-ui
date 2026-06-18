/**
 * Client-side validation + defense-in-depth for operator-supplied outbound URLs
 * (external-task worker endpoints, HTTP-call node config) that the engine invokes
 * server-side (#32). Rejects non-http(s) schemes and obvious internal targets
 * (localhost, loopback, RFC1918, link-local incl. cloud-metadata 169.254.169.254)
 * to reduce the SSRF surface. The REAL enforcer must be a server-side egress
 * allowlist — this only blocks accidental/easy cases at the UI.
 *
 * @returns an error message if invalid, or null if acceptable.
 */
export function validateOutboundUrl(value: string | undefined): string | null {
  const v = value?.trim();
  if (!v) return "URL is required.";

  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return "Enter a valid URL (e.g. https://api.example.com/webhook).";
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return `Unsupported scheme "${url.protocol}" — use https:// (or http://).`;
  }

  if (isPrivateHost(url.hostname.toLowerCase())) {
    return "That points at an internal/private address (localhost, loopback, link-local, or a private network), which isn't allowed.";
  }
  return null;
}

function isPrivateHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;

  const h = host.replace(/^\[/, "").replace(/\]$/, ""); // strip IPv6 brackets
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // IPv6 unique-local
  if (h.startsWith("fe80")) return true; // IPv6 link-local

  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 127) return true; // this-host / loopback
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 169 && b === 254) return true; // link-local (incl. 169.254.169.254 metadata)
  }
  return false;
}
