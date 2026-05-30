import { pgTable, text, real, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const botTypeEnum = pgEnum("bot_type", ["CHATBOT", "INTERVIEW_COPILOT"]);

export const botsTable = pgTable("bots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: botTypeEnum("type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt"),
  jobDescription: text("job_description"),
  answerStyle: text("answer_style"),
  temperature: real("temperature").notNull().default(0.7),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBotSchema = createInsertSchema(botsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBot = z.infer<typeof insertBotSchema>;
export type Bot = typeof botsTable.$inferSelect;
