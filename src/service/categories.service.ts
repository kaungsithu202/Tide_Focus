import prisma from "../config/db";
import EntityNotFoundError from "../errors/EntityNotFoundError";
import {
  CreateCategoryDto,
  GetCategory,
  UpdateCategoryDto,
} from "../types/category";

export const getAllCategoriesService = async ({
  userId,
}: {
  userId: number;
}) => {
  return await prisma.category.findMany({
    where: { userId },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getCategoryService = async ({ categoryId }: GetCategory) => {
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
    },
  });

  if (!category) throw new EntityNotFoundError("Category not found!");

  return category;
};

export const createCategoryService = async ({
  name,
  color,
  userId,
}: CreateCategoryDto) => {
  return await prisma.category.create({
    data: {
      name,
      color,
      user: {
        connect: { id: userId },
      },
    },
  });
};

export const updateCategoryService = async ({
  id,
  name,
  color,
}: UpdateCategoryDto) => {
  return await prisma.category.update({
    where: {
      id,
    },
    data: {
      name,
      color,
    },
  });
};

export const deleteCategoryService = async ({
  categoryId,
}: {
  categoryId: number;
}) => {
  return await prisma.category.delete({
    where: { id: categoryId },
  });
};
