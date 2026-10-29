import type { SessionInfo } from "./store.js";

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

const STYLE = `
  :root { --acme: #0b5fff; --ink: #1b2430; --muted: #5d6b7c; --line: #dfe5ec; --bg: #f5f7fa; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--ink); background: var(--bg); }
  header { background: var(--acme); color: #fff; padding: 14px 28px; display: flex; align-items: center; gap: 12px; }
  .logo { width: 30px; height: 30px; border-radius: 7px; background: #fff; color: var(--acme); font-weight: 800; display: grid; place-items: center; }
  header strong { font-size: 18px; letter-spacing: .3px; }
  header span { opacity: .8; font-size: 13px; margin-left: auto; }
  main { max-width: 760px; margin: 32px auto; padding: 0 20px; }
  .card { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 24px; margin-bottom: 18px; }
  h1 { margin: 0 0 6px; font-size: 22px; } h2 { margin: 0 0 12px; font-size: 16px; }
  p { color: var(--muted); line-height: 1.5; margin: 6px 0 16px; }
  .btn { display: inline-block; background: var(--acme); color: #fff; text-decoration: none; padding: 11px 22px; border-radius: 7px; font-weight: 600; }
  .note { border-left: 4px solid #e0a100; background: #fff8e5; color: #5b4500; padding: 10px 14px; border-radius: 4px; margin-bottom: 18px; }
  .ok { display: inline-block; background: #e6f6ec; color: #11633a; border-radius: 12px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  td { padding: 8px 10px; border-top: 1px solid var(--line); vertical-align: top; word-break: break-word; }
  td:first-child { width: 34%; color: var(--muted); font-family: ui-monospace, Menlo, monospace; font-size: 13px; }
  textarea { width: 100%; height: 150px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; border: 1px solid var(--line); border-radius: 6px; padding: 10px; resize: vertical; }
  footer { text-align: center; color: var(--muted); font-size: 12px; padding: 12px 0 30px; }
`;

function shell(body: string, extraHead = ""): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acme Portal</title><style>${STYLE}</style>${extraHead}</head><body>
<header><div class="logo">A</div><strong>Acme Portal</strong><span>POC test app</span></header>
<main>${body}</main>
<footer>Acme Portal is a proof-of-concept app for Okta Federation Broker Mode logout testing.</footer>
</body></html>`;
}

function claimRows(profile: Record<string, unknown> | undefined): string {
  if (!profile) return `<tr><td colspan="2">No profile was stored for this session.</td></tr>`;
  return Object.entries(profile)
    .filter(([name]) => name !== "nonce")
    .map(([name, value]) => `<tr><td>${esc(name)}</td><td>${esc(typeof value === "string" ? value : JSON.stringify(value))}</td></tr>`)
    .join("");
}

/** Home page. Signed out: a sign-in button. Signed in: the profile and access token. */
export function homePage(opts: { session: SessionInfo | null; sessionEnded: boolean }): string {
  const { session, sessionEnded } = opts;
  if (!session) {
    const banner = sessionEnded
      ? `<div class="note"><strong>Your session has ended.</strong> It was removed on the server, for example by a Global Token Revocation call from the logout workflow. Sign in again to start a new one.</div>`
      : "";
    return shell(`${banner}<div class="card"><h1>Welcome to Acme</h1><p>Sign in with your Okta account to view your profile.</p><a class="btn" href="/oidc/login">Sign in with Okta</a></div>`);
  }

  const issuer = session.authServer === "org" ? "org authorization server" : "custom authorization server";
  // The page polls /me and reloads when the session disappears, so a revocation shows up without a manual refresh.
  const poll = `<script>setInterval(function(){fetch("/me",{cache:"no-store"}).then(function(r){if(r.status===401)location.reload();}).catch(function(){});},5000);</script>`;
  const token = session.accessToken
    ? `<textarea readonly spellcheck="false">${esc(session.accessToken)}</textarea>`
    : `<p>No access token is stored for this session.</p>`;
  return shell(
    `<div class="card"><h1>Welcome, ${esc(session.email)}</h1><p><span class="ok">Signed in</span> via the ${issuer}. Refresh token: ${session.hasRefreshToken ? "issued (held by the app, never shown)" : "not issued"}.</p><a class="btn" href="/oidc/login">Sign in again</a></div>
<div class="card"><h2>Your profile (ID token claims)</h2><table>${claimRows(session.profile)}</table></div>
<div class="card"><h2>Access token</h2>${token}</div>
${poll}`,
  );
}
