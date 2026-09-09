// Cloudflare binding types (D1Database, KVNamespace, R2Bucket, HTMLRewriter, etc.)
// come from the Workers runtime itself at execution time. This file doesn't
// depend on the @cloudflare/workers-types package -- wrangler's esbuild-based
// build doesn't type-check this file at all (it isn't wired into `pnpm run
// typecheck`), so bindings are typed `any` here rather than pulling in a new
// dependency just for editor hints.
interface Env {
  ASSETS: Fetcher;
  RESEND_API_KEY: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
  DB: any; // D1Database
  CONTENT_KV: any; // KVNamespace
  IMAGES?: any; // R2Bucket -- undefined until R2 is enabled on the account
}

const BASE_PATH = "/epiclearningpro";
// This Worker serves exactly one site; each client site is its own Worker
// deployment, so its Site ID is a per-deployment constant, same as BASE_PATH.
const SITE_ID = "site_elp_7f3a9c2e";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h -- generous, since the real
// "session ends when browser closes" requirement is enforced by admin-portal.js
// storing the token in sessionStorage, not by a short server-side expiry.

interface ContactPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  service?: string;
  message?: string;
}

interface SiteContent {
  content: Record<string, unknown>;
  hex_colors: Record<string, string>;
  promo: Record<string, unknown>;
  section_bg: Record<string, unknown>;
  images: Record<string, string>;
}

function emptySiteContent(): SiteContent {
  return { content: {}, hex_colors: {}, promo: {}, section_bg: {}, images: {} };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/* ══════════════════════════════════════════════════════════════
   PASSWORD HASHING -- PBKDF2 via Web Crypto (no bcrypt in Workers)
   Format: pbkdf2$<iterations>$<salt-hex>$<hash-hex>
══════════════════════════════════════════════════════════════ */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1], 10);
  const salt = hexToBytes(parts[2]);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as unknown as BufferSource, iterations }, key, 256);
  return timingSafeEqual(bytesToHex(new Uint8Array(bits)), parts[3]);
}
function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/* ══════════════════════════════════════════════════════════════
   SITE CONTENT -- D1 is the source of truth, KV is a read-through
   cache populated on read-miss and kept in sync on every save.
══════════════════════════════════════════════════════════════ */
async function getSiteContent(env: Env, slug: string): Promise<SiteContent | null> {
  const cached = await env.CONTENT_KV.get(slug, "json");
  if (cached) return cached as SiteContent;

  const row = await env.DB.prepare("select content, hex_colors, promo, section_bg, images from site_content where site_slug = ?")
    .bind(slug)
    .first();
  if (!row) return null;

  const parsed: SiteContent = {
    content: JSON.parse(row.content as string),
    hex_colors: JSON.parse(row.hex_colors as string),
    promo: JSON.parse(row.promo as string),
    section_bg: JSON.parse(row.section_bg as string),
    images: JSON.parse(row.images as string),
  };
  await env.CONTENT_KV.put(slug, JSON.stringify(parsed));
  return parsed;
}

async function saveSiteContent(env: Env, slug: string, patch: Partial<SiteContent>, userId: string): Promise<SiteContent> {
  const current = (await getSiteContent(env, slug)) || emptySiteContent();
  const merged: SiteContent = { ...current, ...patch };

  await env.DB.prepare(
    "update site_content set content=?, hex_colors=?, promo=?, section_bg=?, images=?, updated_at=datetime('now'), updated_by=? where site_slug=?",
  )
    .bind(
      JSON.stringify(merged.content),
      JSON.stringify(merged.hex_colors),
      JSON.stringify(merged.promo),
      JSON.stringify(merged.section_bg),
      JSON.stringify(merged.images),
      userId,
      slug,
    )
    .run();

  await env.CONTENT_KV.put(slug, JSON.stringify(merged));
  return merged;
}

/* ══════════════════════════════════════════════════════════════
   AUTH -- one login (email+password) for clients and staff alike.
   Access is a database question: is_staff grants every site, a
   site_editors row grants just that one.
══════════════════════════════════════════════════════════════ */
async function handleLogin(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) return jsonResponse({ error: "Email and password are required." }, 400);

  const user = await env.DB.prepare("select * from users where email = ?").bind(email).first();
  if (!user || user.is_disabled) return jsonResponse({ error: "Incorrect email or password." }, 401);

  const ok = await verifyPassword(password, user.password_hash as string);
  if (!ok) return jsonResponse({ error: "Incorrect email or password." }, 401);

  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await env.DB.prepare("insert into sessions (token, user_id, expires_at) values (?, ?, ?)").bind(token, user.id, expiresAt).run();

  return jsonResponse(
    {
      token,
      expires_at: expiresAt,
      user_id: user.id,
      username: user.username,
      is_staff: !!user.is_staff,
    },
    200,
  );
}

async function authenticate(request: Request, env: Env): Promise<{ userId: string; isStaff: boolean } | null> {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const session = await env.DB.prepare(
    "select s.user_id as user_id, s.expires_at as expires_at, u.is_disabled as is_disabled, u.is_staff as is_staff from sessions s join users u on u.id = s.user_id where s.token = ?",
  )
    .bind(token)
    .first();
  if (!session) return null;
  if (new Date(session.expires_at as string).getTime() < Date.now()) return null;
  if (session.is_disabled) return null;

  return { userId: session.user_id as string, isStaff: !!session.is_staff };
}

async function canEditSite(env: Env, userId: string, isStaff: boolean, slug: string): Promise<boolean> {
  if (isStaff) return true;
  const row = await env.DB.prepare("select 1 from site_editors where user_id = ? and site_slug = ?").bind(userId, slug).first();
  return !!row;
}

/* ══════════════════════════════════════════════════════════════
   SITE CONTENT API
══════════════════════════════════════════════════════════════ */
async function handleContentGet(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const slug = url.searchParams.get("site") || SITE_ID;
  const data = await getSiteContent(env, slug);
  return jsonResponse(data || emptySiteContent(), 200);
}

async function handleContentPatch(request: Request, env: Env): Promise<Response> {
  const auth = await authenticate(request, env);
  if (!auth) return jsonResponse({ error: "Not authenticated." }, 401);

  let body: Partial<SiteContent> & { site_slug?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
  const slug = body.site_slug || SITE_ID;

  const allowed = await canEditSite(env, auth.userId, auth.isStaff, slug);
  if (!allowed) return jsonResponse({ error: "Not authorized to edit this site." }, 403);

  const patch: Partial<SiteContent> = {};
  (["content", "hex_colors", "promo", "section_bg", "images"] as const).forEach((key) => {
    if (body[key] !== undefined) (patch as any)[key] = body[key];
  });

  await saveSiteContent(env, slug, patch, auth.userId);
  return jsonResponse({ ok: true }, 200);
}

/* ══════════════════════════════════════════════════════════════
   IMAGES -- R2. Bucket isn't provisioned yet (needs a one-time R2
   enable in the Cloudflare dashboard), so these 503 until it is.
══════════════════════════════════════════════════════════════ */
async function handleImageUpload(request: Request, env: Env): Promise<Response> {
  if (!env.IMAGES) return jsonResponse({ error: "Image uploads aren't configured yet." }, 503);
  const auth = await authenticate(request, env);
  if (!auth) return jsonResponse({ error: "Not authenticated." }, 401);

  const url = new URL(request.url);
  const slug = url.searchParams.get("site") || SITE_ID;
  const key = url.searchParams.get("key");
  if (!key) return jsonResponse({ error: "key query param required." }, 400);

  const allowed = await canEditSite(env, auth.userId, auth.isStaff, slug);
  if (!allowed) return jsonResponse({ error: "Not authorized to edit this site." }, 403);

  const contentType = request.headers.get("Content-Type") || "application/octet-stream";
  const ext = (contentType.split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "");
  const path = `${slug}/${key}-${Date.now()}.${ext}`;
  await env.IMAGES.put(path, request.body, { httpMetadata: { contentType } });

  return jsonResponse({ url: `${BASE_PATH}/api/images/${path}` }, 200);
}

async function handleImageGet(request: Request, env: Env, path: string): Promise<Response> {
  if (!env.IMAGES) return new Response("Not found", { status: 404 });
  const object = await env.IMAGES.get(path);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}

/* ══════════════════════════════════════════════════════════════
   SERVER-SIDE CONTENT INJECTION
   Inline the site's current content directly into the page as
   `window.__AP_CONTENT__`, read from the edge-local KV cache. This
   is why the editor's changes show up immediately with no visible
   loading flash: admin-portal.js's DOM-patch logic (unchanged) runs
   against data that's already on the page, no network round trip
   needed before it can act. (Rewriting the static HTML's own text
   server-side wouldn't work here -- this is a client-rendered React
   app, so React would just wipe out any server-injected markup the
   instant it mounts. Inlining data instead of markup sidesteps that.)
══════════════════════════════════════════════════════════════ */
class HeadContentInjector {
  constructor(private json: string) {}
  element(element: any) {
    element.append(`<script>window.__AP_CONTENT__=${this.json};</script>`, { html: true });
  }
}

async function injectContent(response: Response, env: Env): Promise<Response> {
  const data = (await getSiteContent(env, SITE_ID)) || emptySiteContent();
  const json = JSON.stringify(data).replace(/<\/script/gi, "<\\/script");
  return new HTMLRewriter().on("head", new HeadContentInjector(json)).transform(response);
}

/* ══════════════════════════════════════════════════════════════
   CONTACT FORM (unchanged)
══════════════════════════════════════════════════════════════ */
async function handleContact(request: Request, env: Env): Promise<Response> {
  let payload: ContactPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const { firstName, lastName, email, phone, service, message } = payload;

  if (!firstName?.trim() || !lastName?.trim()) {
    return jsonResponse({ error: "First and last name are required." }, 400);
  }
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "A valid email address is required." }, 400);
  }
  if (!service?.trim()) {
    return jsonResponse({ error: "Service of interest is required." }, 400);
  }
  if (!message?.trim()) {
    return jsonResponse({ error: "Message is required." }, 400);
  }

  if (!env.RESEND_API_KEY) {
    return jsonResponse(
      {
        error:
          "Email service is not configured yet. Please contact us directly at contact@epiclearningpro.com",
      },
      503,
    );
  }

  const contactTo = env.CONTACT_TO_EMAIL || "contact@epiclearningpro.com";
  const contactFrom = env.CONTACT_FROM_EMAIL || "onboarding@resend.dev";
  const fullName = `${firstName.trim()} ${lastName.trim()}`;

  // "from" has to stay on a domain we control — Resend (and every recipient's
  // spam filter) rejects a `from` claiming to be the visitor's own address.
  // reply_to below is what actually makes "hit reply" go to the client.
  // The site tag + source URL are so one shared inbox can tell multiple
  // portfolio sites' inquiries apart.
  const siteTag = BASE_PATH.replace(/^\//, "");
  const sourceUrl =
    request.headers.get("Referer") ||
    `${new URL(request.url).origin}${BASE_PATH}/`;

  const text = [
    `Source: ${sourceUrl}`,
    `Name: ${fullName}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : "",
    `Service of Interest: ${service}`,
    "",
    "Message:",
    message,
  ]
    .filter(Boolean)
    .join("\n");

  const escapedMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:linear-gradient(135deg,#8B5FE6,#36A6DD);padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:22px;">New Website Inquiry</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px;">${sourceUrl}</p>
      </div>
      <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;">${fullName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#8B5FE6;">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Phone</td><td style="padding:8px 0;">${phone}</td></tr>` : ""}
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Service</td><td style="padding:8px 0;">${service}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
        <p style="color:#6b7280;font-size:14px;margin:0 0 8px;">Message</p>
        <p style="white-space:pre-wrap;margin:0;line-height:1.6;">${escapedMessage}</p>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">Reply directly to this email to reach ${fullName}.</p>
    </div>
  `;

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Epic Learning Pro Website <${contactFrom}>`,
        to: contactTo,
        reply_to: `${fullName} <${email}>`,
        subject: `[${siteTag}] ${service} – from ${fullName}`,
        text,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend API error:", resendRes.status, errBody);
      return jsonResponse(
        {
          error:
            "Failed to send message. Please try emailing us directly at contact@epiclearningpro.com",
        },
        502,
      );
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error("Contact email error:", err);
    return jsonResponse(
      {
        error:
          "Failed to send message. Please try emailing us directly at contact@epiclearningpro.com",
      },
      500,
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === BASE_PATH) {
      url.pathname = "/";
    } else if (url.pathname.startsWith(`${BASE_PATH}/`)) {
      url.pathname = url.pathname.slice(BASE_PATH.length);
    } else {
      return new Response("Not found", { status: 404 });
    }

    if (url.pathname === "/api/contact" && request.method === "POST") {
      return handleContact(request, env);
    }
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      return handleLogin(request, env);
    }
    if (url.pathname === "/api/site-content" && request.method === "GET") {
      return handleContentGet(request, env);
    }
    if (url.pathname === "/api/site-content" && request.method === "PATCH") {
      return handleContentPatch(request, env);
    }
    if (url.pathname === "/api/upload-image" && request.method === "POST") {
      return handleImageUpload(request, env);
    }
    if (url.pathname.startsWith("/api/images/") && request.method === "GET") {
      return handleImageGet(request, env, url.pathname.slice("/api/images/".length));
    }

    const assetResponse = await env.ASSETS.fetch(new Request(url, request));
    const contentType = assetResponse.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      return injectContent(assetResponse, env);
    }
    return assetResponse;
  },
};
