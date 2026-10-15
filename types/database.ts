import type { Tables } from "./database.generated";

export type { Database, Json } from "./database.generated";

// Form options are application choices; database status and role columns are text.
export type ISODateString = string;
export type ISODateTimeString = string;

export type HouseholdRole = "owner" | "member";
export type TaskStatus = "todo" | "in_progress" | "done";
export type ShoppingPriority = "low" | "medium" | "high";
export type PurchaseStatus = "planned" | "researching" | "purchased";


export type Household = Tables<"households">;
export type HouseholdMember = Tables<"household_members">;
export type HouseholdInvitation = Tables<"household_invitations">;
export type PregnancyProfile = Tables<"pregnancy_profile">;
export type Task = Tables<"tasks">;
export type ShoppingItem = Tables<"shopping_items">;
export type Schedule = Tables<"schedules">;
export type Expense = Tables<"expenses">;
