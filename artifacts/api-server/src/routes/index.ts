import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scanRouter from "./scan";
import listsRouter from "./lists";
import reportsRouter from "./reports";
import sharedRouter from "./shared";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scanRouter);
router.use(sharedRouter);
router.use(listsRouter);
router.use(reportsRouter);

export default router;
