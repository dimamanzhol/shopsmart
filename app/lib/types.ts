export interface ShoppingItem {
  id: string;
  text: string;
  purchased: boolean;
  price?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
  createdAt: Date;
  updatedAt: Date;
  isPublic?: boolean;
  shareToken?: string;
  allowAnonymousEdit?: boolean;
}

export interface CreateItemRequest {
  text: string;
  price?: number;
}

export interface UpdateItemRequest {
  purchased: boolean;
}

export interface UpdateListRequest {
  name: string;
  isPublic?: boolean;
  allowAnonymousEdit?: boolean;
}
