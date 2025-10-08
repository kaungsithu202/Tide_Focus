import { Router } from "express";
import authGuard from "../middleware/authGuard";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategory,
  updateCategory,
} from "../controllers/categories.controller";

const router = Router();

router.get("/", authGuard, getAllCategories);
router.get("/:id", authGuard, getCategory);
router.post("/", authGuard, createCategory);
router.put("/:id", authGuard, updateCategory);
router.delete("/:id", authGuard, deleteCategory);

export default router;
