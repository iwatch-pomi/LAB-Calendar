// =============================================================
// このファイルは自動生成です。手で編集しないでください。
//
// supabase/sql/00_baseline.sql を流したデータベースのカタログから起こしています。
// これがあると、DBの列名を変えたのにコードを直し忘れた場合に
// `npm run typecheck` / `next build` が止まります（以前は any だったので
// ビルドは通り、本番で初めて落ちていました）。
//
// 更新のしかた（DBの形を変えたとき）:
//   Supabase ダッシュボード → Project Settings → API → 'Generating types'
//   で生成される TypeScript をコピーして、このファイルを丸ごと置き換えます。
//   SQL と同じ「貼り付けるだけ」の運用です。
//   詳しくは supabase/sql/README.md の規約を参照してください。
// =============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      calendar_shares: {
        Row: {
          id: string;
          owner_id: string;
          grantee_user_id: string | null;
          grantee_lab_id: string | null;
          scope: string;
          experiment_id: string | null;
          permission: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          grantee_user_id?: string | null;
          grantee_lab_id?: string | null;
          scope?: string;
          experiment_id?: string | null;
          permission?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          grantee_user_id?: string | null;
          grantee_lab_id?: string | null;
          scope?: string;
          experiment_id?: string | null;
          permission?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      culture_media: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_date: string;
          expiry_date: string | null;
          disposed_date: string | null;
          parent_id: string | null;
          source_task_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_date?: string;
          expiry_date?: string | null;
          disposed_date?: string | null;
          parent_id?: string | null;
          source_task_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_date?: string;
          expiry_date?: string | null;
          disposed_date?: string | null;
          parent_id?: string | null;
          source_task_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      equipment: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      experiments: {
        Row: {
          id: string;
          user_id: string;
          template_id: string | null;
          name: string;
          status: string;
          current_step: number;
          total_steps: number;
          color: string;
          created_at: string;
          archived: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          template_id?: string | null;
          name: string;
          status?: string;
          current_step?: number;
          total_steps?: number;
          color?: string;
          created_at?: string;
          archived?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          template_id?: string | null;
          name?: string;
          status?: string;
          current_step?: number;
          total_steps?: number;
          color?: string;
          created_at?: string;
          archived?: boolean;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          user_id: string;
          email: string | null;
          category: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email?: string | null;
          category?: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string | null;
          category?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      lab_members: {
        Row: {
          id: string;
          lab_id: string;
          user_id: string;
          role: string;
          share_calendar: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          lab_id: string;
          user_id: string;
          role?: string;
          share_calendar?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          lab_id?: string;
          user_id?: string;
          role?: string;
          share_calendar?: boolean;
          joined_at?: string;
        };
        Relationships: [];
      };
      labs: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          invite_code: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      share_invitations: {
        Row: {
          id: string;
          owner_id: string;
          email: string;
          scope: string;
          experiment_id: string | null;
          permission: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          email: string;
          scope?: string;
          experiment_id?: string | null;
          permission?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          email?: string;
          scope?: string;
          experiment_id?: string | null;
          permission?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          author_id: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          author_id: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_dependencies: {
        Row: {
          id: string;
          user_id: string;
          predecessor_id: string;
          successor_id: string;
          gap_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          predecessor_id: string;
          successor_id: string;
          gap_minutes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          predecessor_id?: string;
          successor_id?: string;
          gap_minutes?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          experiment_id: string | null;
          title: string;
          subtitle: string | null;
          start_time: string;
          end_time: string;
          status: string;
          equipment_id: string | null;
          needs_reservation: boolean;
          is_wait: boolean;
          template_step_id: string | null;
          notes: string | null;
          created_at: string;
          task_kind: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          experiment_id?: string | null;
          title: string;
          subtitle?: string | null;
          start_time: string;
          end_time: string;
          status?: string;
          equipment_id?: string | null;
          needs_reservation?: boolean;
          is_wait?: boolean;
          template_step_id?: string | null;
          notes?: string | null;
          created_at?: string;
          task_kind?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          experiment_id?: string | null;
          title?: string;
          subtitle?: string | null;
          start_time?: string;
          end_time?: string;
          status?: string;
          equipment_id?: string | null;
          needs_reservation?: boolean;
          is_wait?: boolean;
          template_step_id?: string | null;
          notes?: string | null;
          created_at?: string;
          task_kind?: string;
        };
        Relationships: [];
      };
      template_steps: {
        Row: {
          id: string;
          template_id: string;
          step_order: number;
          title: string;
          subtitle: string | null;
          offset_from_prev_minutes: number;
          duration_minutes: number;
          wait_after_minutes: number;
          equipment_name: string | null;
          needs_reservation: boolean;
        };
        Insert: {
          id?: string;
          template_id: string;
          step_order: number;
          title: string;
          subtitle?: string | null;
          offset_from_prev_minutes?: number;
          duration_minutes?: number;
          wait_after_minutes?: number;
          equipment_name?: string | null;
          needs_reservation?: boolean;
        };
        Update: {
          id?: string;
          template_id?: string;
          step_order?: number;
          title?: string;
          subtitle?: string | null;
          offset_from_prev_minutes?: number;
          duration_minutes?: number;
          wait_after_minutes?: number;
          equipment_name?: string | null;
          needs_reservation?: boolean;
        };
        Relationships: [];
      };
      templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          estimated_label: string | null;
          total_steps: number;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          estimated_label?: string | null;
          total_steps?: number;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          estimated_label?: string | null;
          total_steps?: number;
          color?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      todos: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          due_at: string | null;
          done: boolean;
          task_id: string | null;
          sort_order: number;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          due_at?: string | null;
          done?: boolean;
          task_id?: string | null;
          sort_order?: number;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          due_at?: string | null;
          done?: boolean;
          task_id?: string | null;
          sort_order?: number;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          features: Json;
          updated_at: string;
          display_name: string | null;
          avatar_emoji: string | null;
          avatar_color: string | null;
          role: string;
          deletion_scheduled_at: string | null;
        };
        Insert: {
          user_id: string;
          features?: Json;
          updated_at?: string;
          display_name?: string | null;
          avatar_emoji?: string | null;
          avatar_color?: string | null;
          role?: string;
          deletion_scheduled_at?: string | null;
        };
        Update: {
          user_id?: string;
          features?: Json;
          updated_at?: string;
          display_name?: string | null;
          avatar_emoji?: string | null;
          avatar_color?: string | null;
          role?: string;
          deletion_scheduled_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cancel_account_deletion: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      claim_share_invitations: {
        Args: Record<string, never>;
        Returns: number;
      };
      create_lab: {
        Args: {
          p_name: string;
        };
        Returns: string;
      };
      delete_own_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      join_lab_by_code: {
        Args: {
          code: string;
        };
        Returns: string;
      };
      request_account_deletion: {
        Args: Record<string, never>;
        Returns: string;
      };
      seed_demo_data: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      set_features: {
        Args: {
          patch: Json;
        };
        Returns: Json;
      };
      share_calendar_by_email: {
        Args: {
          target_email: string;
          p_scope?: string;
          p_experiment?: string;
          p_permission?: string;
        };
        Returns: string;
      };
      shared_owner_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      visible_profiles: {
        Args: Record<string, never>;
        Returns: {
          user_id: string | null;
          email: string | null;
          display_name: string | null;
          avatar_emoji: string | null;
          avatar_color: string | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
