import { Router } from "express";
import adminRoute from "./admin.route";
import authRoute from "./auth.route";
import userRoute from "./user.route";
import categoryRoute from "./categories.route";
import sessionRoute from "./session.route";

const router = Router();

router.use("/api/auth", authRoute);
router.use("/api/user", userRoute);
router.use("/api/admin", adminRoute);
router.use("/api/categories", categoryRoute);
router.use("/api/sessions", sessionRoute);

export default router;
