import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../../app/family/session-actions.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function setup({ signOutError = null, networkError = false } = {}) {
  const calls = [];
  const exports = {};
  const modules = {
    "next/cache": { revalidatePath: (...args) => calls.push(["revalidate", ...args]) },
    "next/headers": { cookies: async () => ({ delete: (name) => calls.push(["delete-cookie", name]) }) },
    "next/navigation": { redirect: (destination) => { throw { destination }; } },
    "@/lib/invite-context": { INVITE_CONTEXT_COOKIE: "kk_invite_context" },
    "@/lib/supabase/server": {
      createClient: async () => ({ auth: { signOut: async ({ scope }) => {
        calls.push(["sign-out", scope]);
        if (networkError) throw new Error("network unavailable");
        return { error: signOutError };
      } } }),
    },
  };
  runInNewContext(outputText, { exports, require: (name) => {
    if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
    return modules[name];
  } });
  return { endSession: exports.endSession, calls };
}

test("logout revokes only the current session, clears stale invitation, and invalidates cached pages", async () => {
  const { endSession, calls } = setup();
  const data = new FormData();
  data.set("intent", "logout");
  await assert.rejects(endSession({ error: null }, data), (e) => e.destination === "/login");
  assert.deepEqual(calls, [["sign-out", "local"], ["delete-cookie", "kk_invite_context"], ["revalidate", "/", "layout"]]);
});

test("account switch returns to family settings after login and ignores untrusted redirects", async () => {
  const { endSession, calls } = setup();
  const data = new FormData();
  data.set("intent", "switch");
  data.set("next", "https://untrusted.invalid/");
  await assert.rejects(endSession({ error: null }, data), (e) => e.destination === "/login?next=/family");
  assert.equal(calls[0][1], "local");
});

test("invalid intent does not end a session", async () => {
  const { endSession, calls } = setup();
  const data = new FormData();
  data.set("intent", "delete-account");
  assert.ok((await endSession({ error: null }, data)).error);
  assert.deepEqual(calls, []);
});

test("auth service errors leave invitation state intact and return a retry message", async () => {
  const { endSession, calls } = setup({ signOutError: { message: "private service detail" } });
  const data = new FormData();
  data.set("intent", "logout");
  const result = await endSession({ error: null }, data);
  assert.match(result.error, /다시 시도/);
  assert.ok(!result.error.includes("private service detail"));
  assert.deepEqual(calls, [["sign-out", "local"]]);
});

test("network exceptions are caught without exposing internal errors", async () => {
  const { endSession, calls } = setup({ networkError: true });
  const data = new FormData();
  data.set("intent", "switch");
  assert.match((await endSession({ error: null }, data)).error, /다시 시도/);
  assert.deepEqual(calls, [["sign-out", "local"]]);
});
