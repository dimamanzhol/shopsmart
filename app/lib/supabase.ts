import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Клиент для браузера
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Клиент для сервера
export const createServerSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};

// Типы для базы данных
export interface Database {
  public: {
    Tables: {
      shopping_lists: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      shopping_items: {
        Row: {
          id: string;
          list_id: string;
          text: string;
          purchased: boolean;
          price: number | null;
          created_at: string;
          updated_at: string;
          position: number;
        };
        Insert: {
          id?: string;
          list_id: string;
          text: string;
          purchased?: boolean;
          price?: number | null;
          created_at?: string;
          updated_at?: string;
          position?: number;
        };
        Update: {
          id?: string;
          list_id?: string;
          text?: string;
          purchased?: boolean;
          price?: number | null;
          created_at?: string;
          updated_at?: string;
          position?: number;
        };
      };
    };
  };
}
