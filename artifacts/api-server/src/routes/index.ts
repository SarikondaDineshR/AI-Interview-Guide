import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import botsRouter from "./bots";
import documentsRouter from "./documents";
import conversationsRouter from "./conversations";
import chatRouter from "./chat";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(botsRouter);
router.use(documentsRouter);
router.use(conversationsRouter);
router.use(chatRouter);
router.use(settingsRouter);

export default router;
