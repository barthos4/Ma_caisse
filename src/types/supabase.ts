
// Ce fichier sera remplacé par les types générés par Supabase CLI
// supabase gen types typescript --project-id <votre-project-id> --schema public > src/types/supabase.ts
// Assurez-vous de régénérer ce fichier après avoir modifié votre schéma de base de données.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string // uuid
          user_id: string // uuid, references auth.users
          name: string
          type: "income" | "expense"
          created_at: string // timestamptz
          updated_at: string // timestamptz
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: "income" | "expense"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: "income" | "expense"
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users" // de auth.users
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string // uuid
          user_id: string // uuid
          category_id: string | null // uuid
          order_number: string | null
          date: string // date
          description: string
          reference: string | null
          amount: number // numeric
          type: "income" | "expense"
          created_at: string // timestamptz
          updated_at: string // timestamptz
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          order_number?: string | null
          date: string
          description: string
          reference?: string | null
          amount: number
          type: "income" | "expense"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          order_number?: string | null
          date?: string
          description?: string
          reference?: string | null
          amount?: number
          type?: "income" | "expense"
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      app_settings: {
        Row: {
          user_id: string // uuid, primary key, references auth.users
          company_name: string | null
          company_address: string | null
          company_logo_url: string | null 
          rccm: string | null 
          niu: string | null 
          company_contact: string | null // Nouveau champ
          created_at: string // timestamptz
          updated_at: string // timestamptz
        }
        Insert: {
          user_id: string
          company_name?: string | null
          company_address?: string | null
          company_logo_url?: string | null 
          rccm?: string | null 
          niu?: string | null 
          company_contact?: string | null // Nouveau champ
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          company_name?: string | null
          company_address?: string | null
          company_logo_url?: string | null 
          rccm?: string | null 
          niu?: string | null 
          company_contact?: string | null // Nouveau champ
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      budgets: {
        Row: {
          id: string // uuid
          user_id: string // uuid
          category_id: string // uuid
          period_start_date: string // date, e.g., '2024-01-01'
          amount: number // numeric
          type: "income" | "expense"
          created_at: string // timestamptz
          updated_at: string // timestamptz
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          period_start_date: string
          amount: number
          type: "income" | "expense"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          period_start_date?: string
          amount?: number
          type?: "income" | "expense"
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types pour notre application, pas directement de Supabase gen types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
