export type ISODateString = string;
export type ISODateTimeString = string;

export type TaskStatus = "todo" | "in_progress" | "done";
export type ShoppingPriority = "low" | "medium" | "high";
export type PurchaseStatus = "planned" | "researching" | "purchased";

export interface Household {
  id: string;
  name: string;
  created_at: ISODateTimeString;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  display_name: string;
  role: "owner" | "member";
  created_at: ISODateTimeString;
}

export interface PregnancyProfile {
  id: string;
  household_id: string;
  baby_nickname: string;
  due_date: ISODateString;
  pregnancy_start_date: ISODateString;
}

export interface Task {
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
}

export interface ShoppingItem {
  id: string;
  household_id: string;
  item_name: string;
  category: string;
  priority: ShoppingPriority;
  purchase_status: PurchaseStatus;
  price: number | null;
  purchase_url: string | null;
  memo: string | null;
}

export interface Schedule {
  id: string;
  household_id: string;
  title: string;
  date: ISODateString;
  pregnancy_week: number | null;
  category: string;
  memo: string | null;
}

export interface Expense {
  id: string;
  household_id: string;
  title: string;
  category: string;
  amount: number;
  paid: boolean;
  payment_date: ISODateString | null;
  memo: string | null;
}

export interface Database {
  public: {
    Tables: {
      households: { Row: Household };
      household_members: { Row: HouseholdMember };
      pregnancy_profile: { Row: PregnancyProfile };
      tasks: { Row: Task };
      shopping_items: { Row: ShoppingItem };
      schedules: { Row: Schedule };
      expenses: { Row: Expense };
    };
  };
}
