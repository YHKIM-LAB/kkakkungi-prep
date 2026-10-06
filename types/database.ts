export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ISODateString = string;
export type ISODateTimeString = string;

export type HouseholdRole = "owner" | "member";
export type TaskStatus = "todo" | "in_progress" | "done";
export type ShoppingPriority = "low" | "medium" | "high";
export type PurchaseStatus = "planned" | "researching" | "purchased";

export type Household = {
  id: string;
  name: string;
  created_by: string;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

export type HouseholdMember = {
  id: string;
  household_id: string;
  user_id: string;
  display_name: string;
  role: HouseholdRole;
  created_at: ISODateTimeString;
}

export type HouseholdInvitation = {
  id: string;
  household_id: string;
  email: string;
  token_hash: string;
  invited_by: string;
  expires_at: ISODateTimeString;
  accepted_at: ISODateTimeString | null;
  accepted_by: string | null;
  revoked_at: ISODateTimeString | null;
  created_at: ISODateTimeString;
}

export type PregnancyProfile = {
  id: string;
  household_id: string;
  baby_nickname: string;
  due_date: ISODateString;
  pregnancy_start_date: ISODateString;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

export type Task = {
  id: string;
  household_id: string;
  title: string;
  category: string;
  due_date: ISODateString | null;
  pregnancy_week: number | null;
  status: TaskStatus;
  memo: string | null;
  created_by: string;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

export type ShoppingItem = {
  id: string;
  household_id: string;
  item_name: string;
  category: string;
  priority: ShoppingPriority;
  purchase_status: PurchaseStatus;
  price: number | null;
  purchase_url: string | null;
  memo: string | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

export type Schedule = {
  id: string;
  household_id: string;
  title: string;
  date: ISODateString;
  pregnancy_week: number | null;
  category: string;
  memo: string | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

export type Expense = {
  id: string;
  household_id: string;
  title: string;
  category: string;
  amount: number;
  paid: boolean;
  payment_date: ISODateString | null;
  memo: string | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      households: Table<
        Household,
        { id?: string; name: string; created_by: string; created_at?: string; updated_at?: string },
        { name?: string; updated_at?: string }
      >;
      household_members: Table<
        HouseholdMember,
        { id?: string; household_id: string; user_id: string; display_name: string; role?: HouseholdRole; created_at?: string },
        { display_name?: string; role?: HouseholdRole }
      >;
      household_invitations: Table<
        HouseholdInvitation,
        {
          id?: string;
          household_id: string;
          email: string;
          token_hash: string;
          invited_by: string;
          expires_at: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        },
        {
          accepted_at?: string | null;
          accepted_by?: string | null;
          revoked_at?: string | null;
        }
      >;
      pregnancy_profile: Table<
        PregnancyProfile,
        { id?: string; household_id: string; baby_nickname: string; due_date: string; pregnancy_start_date: string; created_at?: string; updated_at?: string },
        { baby_nickname?: string; due_date?: string; pregnancy_start_date?: string; updated_at?: string }
      >;
      tasks: Table<
        Task,
        Omit<Task, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string },
        Partial<Omit<Task, "id" | "household_id" | "created_by" | "created_at">>
      >;
      shopping_items: Table<
        ShoppingItem,
        Omit<ShoppingItem, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string },
        Partial<Omit<ShoppingItem, "id" | "household_id" | "created_at">>
      >;
      schedules: Table<
        Schedule,
        Omit<Schedule, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string },
        Partial<Omit<Schedule, "id" | "household_id" | "created_at">>
      >;
      expenses: Table<
        Expense,
        Omit<Expense, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string },
        Partial<Omit<Expense, "id" | "household_id" | "created_at">>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_household_with_profile: {
        Args: {
          p_household_name: string;
          p_display_name: string;
          p_baby_nickname: string;
          p_due_date: string;
          p_pregnancy_start_date: string;
        };
        Returns: string;
      };
      create_household_invitation: {
        Args: { p_email: string };
        Returns: { token: string; email: string; expires_at: string }[];
      };
      get_household_invitation: {
        Args: { p_token: string };
        Returns: { email: string; household_name: string; expires_at: string; status: string }[];
      };
      accept_household_invitation: {
        Args: { p_token: string; p_display_name: string };
        Returns: string;
      };
      is_household_member: {
        Args: { target_household_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      household_role: HouseholdRole;
      task_status: TaskStatus;
      shopping_priority: ShoppingPriority;
      purchase_status: PurchaseStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
