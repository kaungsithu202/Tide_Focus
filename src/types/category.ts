export interface CreateCategoryDto {
  name: string;
  color: string;
  userId: string;
}
export interface UpdateCategoryDto {
  id: string;
  name: string;
  color: string;
}

export interface GetCategory {
  categoryId: string;
}
