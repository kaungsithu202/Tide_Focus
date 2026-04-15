import { Request, Response } from "express";
import { wrapAsync } from "../util/util";
import {
  createCategoryService,
  deleteCategoryService,
  getAllCategoriesService,
  getCategoryService,
  updateCategoryService,
} from "../service/categories.service";
import BadRequestError from "../errors/BadRequestError";

const objectIdRegex = /^[a-f\d]{24}$/i;

const isValidObjectId = (value: string) => objectIdRegex.test(value);

const getParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const getAllCategories = wrapAsync(
  async (req: Request, res: Response) => {
    const result = await getAllCategoriesService({ userId: req.user.id });
    return res.status(200).json(result);
  }
);

export const getCategory = wrapAsync(async (req: Request, res: Response) => {
  const id = getParamValue(req.params.id);

  if (!id || !isValidObjectId(id)) {
    throw new BadRequestError("Invalid category ID");
  }

  const result = await getCategoryService({
    categoryId: id,
    userId: req.user.id,
  });

  return res.status(200).json(result);
});

export const createCategory = wrapAsync(async (req: Request, res: Response) => {
  const { name, color } = req.body;

  if (!name || !color) {
    throw new BadRequestError("Please fill the category name and color");
  }

  const result = await createCategoryService({
    name,
    color,
    userId: req.user.id,
  });

  return res.status(201).json(result);
});

export const updateCategory = wrapAsync(async (req: Request, res: Response) => {
  const id = getParamValue(req.params.id);

  if (!id || !isValidObjectId(id)) {
    throw new BadRequestError("Invalid category ID");
  }

  const { name, color } = req.body;

  if (!name || !color) {
    throw new BadRequestError("Please fill the category name and color");
  }

  const result = await updateCategoryService({
    id,
    name,
    color,
    userId: req.user.id,
  });

  return res.status(200).json(result);
});

export const deleteCategory = wrapAsync(async (req: Request, res: Response) => {
  const id = getParamValue(req.params.id);

  if (!id || !isValidObjectId(id)) {
    throw new BadRequestError("Invalid category ID");
  }

  await deleteCategoryService({
    categoryId: id,
    userId: req.user.id,
  });

  return res.status(200).json({
    success: true,
    message: "Category deleted successfully",
  });
});
