import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, conversationsTable, documentsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { UpdateProfileBody } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

router.patch("/settings/profile", async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(usersTable.id, req.session.userId!))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
});

router.post("/settings/delete-chats", async (req, res): Promise<void> => {
  await db
    .delete(conversationsTable)
    .where(eq(conversationsTable.userId, req.session.userId!));

  res.json({ success: true, message: "All chats deleted" });
});

router.post("/settings/delete-documents", async (req, res): Promise<void> => {
  await db
    .delete(documentsTable)
    .where(eq(documentsTable.userId, req.session.userId!));

  res.json({ success: true, message: "All documents deleted" });
});

router.delete("/settings/account", async (req, res): Promise<void> => {
  await db.delete(usersTable).where(eq(usersTable.id, req.session.userId!));

  req.session.destroy(() => {
    res.json({ success: true, message: "Account deleted" });
  });
});

export default router;
