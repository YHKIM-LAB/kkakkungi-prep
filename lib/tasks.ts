import type { Task, TaskStatus } from "@/types/database";

export const TASK_CATEGORIES = ["병원", "검사", "보험", "행정", "출산준비", "구매", "기타"] as const;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "할 일",
  in_progress: "진행 중",
  done: "완료",
};

export const TASK_STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];

export function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const completionOrder = Number(a.status === "done") - Number(b.status === "done");
    if (completionOrder !== 0) return completionOrder;

    if (a.due_date && b.due_date) {
      const dueDateOrder = a.due_date.localeCompare(b.due_date);
      if (dueDateOrder !== 0) return dueDateOrder;
    } else if (a.due_date) {
      return -1;
    } else if (b.due_date) {
      return 1;
    }

    return b.created_at.localeCompare(a.created_at);
  });
}

export function formatTaskDate(value: string) {
  const [, month, day] = value.split("-").map(Number);
  return `${month}월 ${day}일`;
}
