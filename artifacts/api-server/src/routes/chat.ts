import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, botsTable, conversationsTable, messagesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { SendChatMessageParams, SendChatMessageBody } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

const DUMMY_RESPONSES: Record<string, string[]> = {
  CHATBOT: [
    "Based on the uploaded documents, ",
    "I can see that ",
    "According to the knowledge base, ",
  ],
  INTERVIEW_COPILOT: [
    "That's a great question. ",
    "In my previous role, ",
    "I've had significant experience with ",
  ],
};

const DUMMY_CONTENT = [
  "This is a placeholder response while the AI integration is being configured. ",
  "Once the Hermes API and Pinecone vector database are connected, ",
  "responses will be grounded in your uploaded documents and tailored to your specific use case. ",
  "The system supports streaming, RAG retrieval, and conversation history — all ready to go.",
];

router.post("/bots/:botId/chat", async (req, res): Promise<void> => {
  const params = SendChatMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendChatMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
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

  // Resolve or create conversation
  let conversationId = body.data.conversationId;
  if (!conversationId) {
    const title = body.data.content.slice(0, 60) + (body.data.content.length > 60 ? "…" : "");
    const [conv] = await db
      .insert(conversationsTable)
      .values({
        userId: req.session.userId!,
        botId: bot.id,
        title,
      })
      .returning();
    conversationId = conv.id;
  }

  // Save user message
  await db.insert(messagesTable).values({
    conversationId,
    role: "USER",
    content: body.data.content,
  });

  // Update conversation timestamp
  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversationId));

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Conversation-Id", conversationId);
  res.flushHeaders();

  // Send conversationId so frontend can track it
  res.write(`data: ${JSON.stringify({ type: "conversationId", conversationId })}\n\n`);

  // Stream dummy response token by token
  const prefix =
    DUMMY_RESPONSES[bot.type][Math.floor(Math.random() * DUMMY_RESPONSES[bot.type].length)];
  const fullText = prefix + DUMMY_CONTENT.join("");

  let fullResponse = "";
  const words = fullText.split(" ");

  for (const word of words) {
    const token = word + " ";
    fullResponse += token;
    res.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
    await delay(60);
  }

  // Save assistant message
  await db.insert(messagesTable).values({
    conversationId,
    role: "ASSISTANT",
    content: fullResponse.trim(),
  });

  res.write(`data: ${JSON.stringify({ type: "done", conversationId })}\n\n`);
  res.end();
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default router;
