interface Env {
  ASSETS: Fetcher;
  RESEND_API_KEY: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
}

const BASE_PATH = "/epiclearningpro";

interface ContactPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  service?: string;
  message?: string;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

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

    return env.ASSETS.fetch(new Request(url, request));
  },
};
