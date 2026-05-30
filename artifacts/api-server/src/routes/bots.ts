import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, botsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  GetBotParams,
  UpdateBotParams,
  DeleteBotParams,
  CreateBotBody,
  UpdateBotBody,
} from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

router.get("/bots", async (req, res): Promise<void> => {
  const bots = await db
    .select()
    .from(botsTable)
    .where(eq(botsTable.userId, req.session.userId!))
    .orderBy(botsTable.createdAt);

  res.json(bots.map(formatBot));
});

router.post("/bots", async (req, res): Promise<void> => {
  const parsed = CreateBotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [bot] = await db
    .insert(botsTable)
    .values({ ...parsed.data, userId: req.session.userId! })
    .returning();

  res.status(201).json(formatBot(bot));
});

router.get("/bots/:botId", async (req, res): Promise<void> => {
  const params = GetBotParams.safeParse(req.params);
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

  res.json(formatBot(bot));
});

router.put("/bots/:botId", async (req, res): Promise<void> => {
  const params = UpdateBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [bot] = await db
    .update(botsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(botsTable.id, params.data.botId), eq(botsTable.userId, req.session.userId!)))
    .returning();

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  res.json(formatBot(bot));
});

router.delete("/bots/:botId", async (req, res): Promise<void> => {
  const params = DeleteBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bot] = await db
    .delete(botsTable)
    .where(and(eq(botsTable.id, params.data.botId), eq(botsTable.userId, req.session.userId!)))
    .returning();

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  res.sendStatus(204);
});

function formatBot(bot: typeof botsTable.$inferSelect) {
  return {
    id: bot.id,
    userId: bot.userId,
    type: bot.type,
    name: bot.name,
    description: bot.description,
    systemPrompt: bot.systemPrompt,
    jobDescription: bot.jobDescription,
    answerStyle: bot.answerStyle,
    temperature: bot.temperature,
    createdAt: bot.createdAt.toISOString(),
    updatedAt: bot.updatedAt.toISOString(),
  };
}

export default router;
