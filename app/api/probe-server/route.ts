import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return Response.json({ ok: false, error: "url is required" }, { status: 400 });
    }

    // Validate it looks like a URL
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return Response.json({ ok: false, error: "Invalid URL format." }, { status: 400 });
    }

    // Probe /v1/models — lightweight, no model required
    const probeUrl = `${parsed.origin}/v1/models`;
    const res = await fetch(probeUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      return Response.json({ ok: true });
    }

    return Response.json(
      { ok: false, error: `Server responded with HTTP ${res.status}.` },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isRefused = msg.includes("ECONNREFUSED") || msg.includes("fetch failed") || msg.includes("timeout");
    return Response.json(
      {
        ok: false,
        error: isRefused
          ? "Connection refused. Make sure LM Studio is running and the server is started."
          : msg,
      },
      { status: 200 }
    );
  }
}
