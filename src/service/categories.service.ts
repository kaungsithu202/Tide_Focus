import prisma from "../config/db";
import EntityNotFoundError from "../errors/EntityNotFoundError";
import {
  CreateCategoryDto,
  GetCategory,
  UpdateCategoryDto,
} from "../types/category";

const getOwnedCategory = async ({
  categoryId,
  userId,
}: {
  categoryId: string;
  userId: string;
}) => {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
  });

  if (!category) throw new EntityNotFoundError("Category not found!");

  return category;
};

export const getAllCategoriesService = async ({
  userId,
}: {
  userId: string;
}) => {
  return await prisma.category.findMany({
    where: { userId },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getCategoryService = async ({ categoryId, userId }: GetCategory) => {
  return await getOwnedCategory({ categoryId, userId });
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
  userId,
}: UpdateCategoryDto) => {
  await getOwnedCategory({ categoryId: id, userId });

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
  userId,
}: {
  categoryId: string;
  userId: string;
}) => {
  await getOwnedCategory({ categoryId, userId });

  return await prisma.category.delete({
    where: { id: categoryId },
  });
};
