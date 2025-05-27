export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category: string;
  sku: string;
  lastUpdated: string; // ISO date string
}

export type NewInventoryItem = Omit<InventoryItem, 'id' | 'lastUpdated'>;

export interface SortConfig {
  key: keyof InventoryItem | null;
  direction: 'ascending' | 'descending';
}

export type ItemsPerPage = 10 | 25 | 50;
