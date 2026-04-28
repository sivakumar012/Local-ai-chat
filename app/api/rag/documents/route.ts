/**
 * GET /api/rag/documents
 * Returns all RAG documents for the authenticated user.
 */

import { auth } from "@/auth";
import { logger } from "@/app/lib/logger";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { RagDocument } from "@/app/lib/types";

export const runtime = "nodejs";

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID ?? "prepforexams-aabbd",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
      privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    }),
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const db = getFirestore(getAdminApp());
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
