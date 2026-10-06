import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeading } from "@/components/page-heading";
import { TaskBoard } from "@/components/tasks/task-board";
import { createClient } from "@/lib/supabase/server";
import { sortTasks } from "@/lib/tasks";

export const metadata: Metadata = { title: "할 일" };

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/tasks");

  const { data: membership } = await supabase
    .from("household_members")
    .select()
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/setup");

  const [{ data: tasks, error: tasksError }, { data: profile }] = await Promise.all([
    supabase.from("tasks").select().eq("household_id", membership.household_id),
    supabase.from("pregnancy_profile").select().eq("household_id", membership.household_id).maybeSingle(),
  ]);

  return (
    <div className="subpage tasks-page">
      <PageHeading eyebrow="함께 하나씩" title="할 일" description="필요한 준비를 가족과 같은 목록에서 관리해요." />
      {tasksError ? (
        <div className="card task-empty" role="alert">
          <strong>할 일을 불러오지 못했어요.</strong>
          <p>잠시 후 페이지를 새로고침해 주세요.</p>
        </div>
      ) : (
        <TaskBoard tasks={sortTasks(tasks ?? [])} profileDueDate={profile?.due_date ?? null} />
      )}
    </div>
  );
}
