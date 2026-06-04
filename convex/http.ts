import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/kiwify",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const signature =
      request.headers.get("x-kiwify-signature") ||
      request.headers.get("x-signature") ||
      request.headers.get("x-webhook-signature");

    const out = await ctx.runAction(internal.kiwifyHttp.handleWebhook, {
      rawBody,
      signature,
    });

    return new Response(JSON.stringify(out.body), {
      status: out.status,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/session/validate",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let token = "";
    try {
      const body = (await request.json()) as { token?: string };
      token = String(body?.token || "").trim();
    } catch {
      return new Response(JSON.stringify({ ok: false }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await ctx.runQuery(api.users.getSession, { token });
    return new Response(JSON.stringify({ ok: Boolean(user) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ ok: true, stack: "convex+cloudflare+kiwify" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
