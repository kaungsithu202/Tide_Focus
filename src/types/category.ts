export interface CreateCategoryDto {
  name: string;
  color: string;
  userId: number;
}
export interface UpdateCategoryDto {
  id: number;
  name: string;
  color: string;
}

export interface GetCategory {
  categoryId: number;
}
