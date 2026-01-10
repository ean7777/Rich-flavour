
export interface Product {
  id: string;
  brand: string;
  name: string;
  price: number | string;
  category?: string;
  description?: string;
  [key: string]: any;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  type?: 'text' | 'options' | 'products';
  options?: string[];
  products?: Product[];
  timestamp: Date;
}

export interface ExcelColumnMapping {
  brand: string;
  name: string;
  price: string;
  category?: string;
}
