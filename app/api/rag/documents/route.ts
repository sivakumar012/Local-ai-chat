/**
 * GET /api/rag/documents
 * Returns all RAG documents for the authenticated user.
 */

import { auth } from "@/auth";
import { logger } from "@/app/lib/logger";
import { getAdminDb, isAdminConfigured } from "@/app/lib/firebaseAdmin";
import type { RagDocument } from "@/app/lib/types";

export const runtime = "nodejs";

export async function GET() {
  if (!isAdminConfigured()) {
    return Response.json({ documents: [], setupRequired: true });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const db = getAdminDb();
    const snap = await db
      .collection(`users/${userId}/documents`)
      .orderBy("createdAt", "desc")
      .get();

    const documents = snap.docs.map((d) => d.data() as RagDocument);
    logger.info("rag.documents.list", { userId, count: documents.length });
    return Response.json({ documents });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("rag.documents.list.failed", { error: message });
    return Response.json({ error: message }, { status: 500 });
  }
}
