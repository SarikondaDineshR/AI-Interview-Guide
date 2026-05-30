import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, conversationsTable, messagesTable, botsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  GetConversationParams,
  UpdateConversationParams,
  DeleteConversationParams,
  CreateConversationBody,
  UpdateConversationBody,
} from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

router.get("/conversations", async (req, res): Promise<void> => {
  const conversations = await db
    .select({
      id: conversationsTable.id,
      userId: conversationsTable.userId,
      botId: conversationsTable.botId,
      title: conversationsTable.title,
      botType: botsTable.type,
      botName: botsTable.name,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
    })
    .from(conversationsTable)
    .leftJoin(botsTable, eq(conversationsTable.botId, botsTable.id))
    .where(eq(conversationsTable.userId, req.session.userId!))
    .orderBy(desc(conversationsTable.updatedAt));

  res.json(conversations.map(formatConversation));
});

router.post("/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [bot] = await db
    .select()
    .from(botsTable)
    .where(and(eq(botsTable.id, parsed.data.botId), eq(botsTable.userId, req.session.userId!)));

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  const [conv] = await db
    .insert(conversationsTable)
    .values({
      userId: req.session.userId!,
      botId: parsed.data.botId,
      title: parsed.data.title ?? "New Chat",
    })
    .returning();

  res.status(201).json({
    ...formatConversation({ ...conv, botType: bot.type, botName: bot.name }),
  });
});

router.get("/conversations/:conversationId", async (req, res): Promise<void> => {
  const params = GetConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db
    .select({
      id: conversationsTable.id,
      userId: conversationsTable.userId,
      botId: conversationsTable.botId,
      title: conversationsTable.title,
      botType: botsTable.type,
      botName: botsTable.name,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
    })
    .from(conversationsTable)
    .leftJoin(botsTable, eq(conversationsTable.botId, botsTable.id))
    .where(
      and(
        eq(conversationsTable.id, params.data.conversationId),
        eq(conversationsTable.userId, req.session.userId!),
      ),
    );

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.conversationId))
    .orderBy(messagesTable.createdAt);

  res.json({
    ...formatConversation(conv),
    messages: messages.map(formatMessage),
  });
});

router.patch("/conversations/:conversationId", async (req, res): Promise<void> => {
  const params = UpdateConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db
    .update(conversationsTable)
    .set({ title: parsed.data.title, updatedAt: new Date() })
    .where(
      and(
        eq(conversationsTable.id, params.data.conversationId),
        eq(conversationsTable.userId, req.session.userId!),
      ),
    )
    .returning();

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, conv.botId));

  res.json(
    formatConversation({
      ...conv,
      botType: bot?.type ?? null,
      botName: bot?.name ?? null,
    }),
  );
});

router.delete("/conversations/:conversationId", async (req, res): Promise<void> => {
  const params = DeleteConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db
    .delete(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, params.data.conversationId),
        eq(conversationsTable.userId, req.session.userId!),
      ),
    )
    .returning();

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.sendStatus(204);
});

function formatConversation(conv: {
  id: string;
  userId: string;
  botId: string;
  title: string | null;
  botType?: string | null;
  botName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: conv.id,
    userId: conv.userId,
    botId: conv.botId,
    title: conv.title,
    botType: conv.botType ?? null,
    botName: conv.botName ?? null,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  };
}

function formatMessage(msg: typeof messagesTable.$inferSelect) {
  return {
    id: msg.id,
    conversationId: msg.conversationId,
    role: msg.role,
    content: msg.content,
    sourceDocs: msg.sourceDocs,
    createdAt: msg.createdAt.toISOString(),
  };
}

export default router;
