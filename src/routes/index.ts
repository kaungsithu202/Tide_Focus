import { Router } from "express";
import adminRoute from "./admin.route.ts";
import authRoute from "./auth.route.ts";
import userRoute from "./user.route.ts";
import categoryRoute from "./categories.route.ts";
import sessionRoute from "./session.route.ts";

const router = Router();

router.use("/api/auth", authRoute);
router.use("/api/user", userRoute);
router.use("/api/admin", adminRoute);
router.use("/api/categories", categoryRoute);
router.use("/api/sessions", sessionRoute);

export default router;
