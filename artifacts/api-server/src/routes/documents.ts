import { Router } from "express";
import multer from "multer";
import { eq, and } from "drizzle-orm";
import { db, documentsTable, botsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { ListDocumentsParams, DeleteDocumentParams } from "@workspace/api-zod";

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter(_req, file, cb) {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOCX, and TXT files are allowed"));
    }
  },
});

router.use(requireAuth);

router.get("/bots/:botId/documents", async (req, res): Promise<void> => {
  const params = ListDocumentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bot] = await db
    .select()
    .from(botsTable)
    .where(and(eq(botsTable.id, params.data.botId), eq(botsTable.userId, req.session.userId!)));

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  const docs = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.botId, params.data.botId))
    .orderBy(documentsTable.uploadedAt);

  res.json(docs.map(formatDoc));
});

router.post("/bots/:botId/documents", upload.single("file"), async (req, res): Promise<void> => {
  const { botId } = req.params;
  const rawBotId = Array.isArray(botId) ? botId[0] : botId;

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const [bot] = await db
    .select()
    .from(botsTable)
    .where(and(eq(botsTable.id, rawBotId), eq(botsTable.userId, req.session.userId!)));

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  const [doc] = await db
    .insert(documentsTable)
    .values({
      botId: rawBotId,
      userId: req.session.userId!,
      filename: req.file.originalname,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      vectorStatus: "pending",
    })
    .returning();

  // Async processing placeholder — in production this would trigger RAG ingestion
  setTimeout(async () => {
    await db
      .update(documentsTable)
      .set({ vectorStatus: "processed", chunkCount: Math.floor(req.file!.size / 500) })
      .where(eq(documentsTable.id, doc.id));
  }, 2000);

  res.status(201).json(formatDoc(doc));
});

router.delete("/bots/:botId/documents/:documentId", async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [doc] = await db
    .delete(documentsTable)
    .where(
      and(
        eq(documentsTable.id, params.data.documentId),
        eq(documentsTable.botId, params.data.botId),
        eq(documentsTable.userId, req.session.userId!),
      ),
    )
    .returning();

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.sendStatus(204);
});

function formatDoc(doc: typeof documentsTable.$inferSelect) {
  return {
    id: doc.id,
    botId: doc.botId,
    userId: doc.userId,
    filename: doc.filename,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    chunkCount: doc.chunkCount,
    vectorStatus: doc.vectorStatus,
    uploadedAt: doc.uploadedAt.toISOString(),
  };
}

export default router;
