export type UserRole = 'admin' | 'manager' | 'user';

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          role: UserRole;
          department: string | null;
          avatar: string | null;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          role?: UserRole;
          department?: string | null;
          avatar?: string | null;
        };
        Update: {
          username?: string;
          email?: string;
          role?: UserRole;
          department?: string | null;
          avatar?: string | null;
        };
      };
      files: {
        Row: {
          id: string;
          name: string;
          type: string;
          size: number;
          folder_id: string | null;
          user_id: string;
          storage_path: string;
          url: string | null;
          thumbnail: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          type: string;
          size: number;
          folder_id?: string | null;
          user_id: string;
          storage_path: string;
          url?: string | null;
          thumbnail?: string | null;
        };
        Update: {
          name?: string;
          folder_id?: string | null;
        };
      };
      folders: {
        Row: {
          id: string;
          name: string;
          parent_id: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          parent_id?: string | null;
          user_id: string;
        };
        Update: {
          name?: string;
          parent_id?: string | null;
        };
      };
      activities: {
        Row: {
          id: string;
          type: 'upload' | 'download' | 'delete' | 'share';
          file_name: string;
          file_id: string | null;
          user_id: string;
          created_at: string;
        };
        Insert: {
          type: 'upload' | 'download' | 'delete' | 'share';
          file_name: string;
          file_id?: string | null;
          user_id: string;
        };
      };
      user_quotas: {
        Row: {
          id: string;
          user_id: string;
          quota_limit: number;
          quota_used: number;
          created_at: string;
          updated_at: string;
        };
        Update: {
          quota_limit?: number;
        };
      };
    };
  };
}
