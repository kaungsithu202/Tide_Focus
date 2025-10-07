import { Router } from "express";
import adminRoute from "./admin.route.ts";
import authRoute from "./auth.route.ts";
import userRoute from "./user.route.ts";

const router = Router();

router.use("/api/auth", authRoute);
router.use("/api/user", userRoute);
router.use("/api/admin", adminRoute);

export default router;
