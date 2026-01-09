export interface Product {
  id: string;
  brand: string;
  name: string;
  price: number | string;
  category?: string;
  [key: string]: any;
}

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}