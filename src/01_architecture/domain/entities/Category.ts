export type CategoryIcon =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'salary'
  | 'health'
  | 'entertainment'
  | 'other';

export interface Category {
  id: string;
  name: string;
  icon: CategoryIcon;
  color: string; // hex
  isDefault: boolean;
}
