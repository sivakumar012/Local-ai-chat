/**
 * DELETE /api/rag/documents/[docId]
 * Deletes a RAG document and all its chunks.
 */

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/app/lib/logger";
import { getAdminDb } from "@/app/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { docId } = await params;

  if (!docId) {
    return Response.json({ error: "docId is required" }, { status: 400 });
  }

  try {
    const db = getAdminDb();

    // Verify ownership before deleting
    const docRef = db.doc(`users/${userId}/documents/${docId}`);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }
    if (docSnap.data()?.userId !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete all chunks in batches
    const chunksSnap = await db
      .collection(`users/${userId}/documents/${docId}/chunks`)
      .get();

    const BATCH_SIZE = 500;
    for (let i = 0; i < chunksSnap.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      chunksSnap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    await docRef.delete();

    logger.info("rag.document.delete", { docId, chunkCount: chunksSnap.size });
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("rag.document.delete.failed", { docId, error: message });
    return Response.json({ error: message }, { status: 500 });
  }
}
