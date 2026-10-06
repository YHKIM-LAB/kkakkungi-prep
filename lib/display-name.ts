export const DISPLAY_NAME_MAX_LENGTH = 30;

export function normalizeDisplayName(value: FormDataEntryValue | string | null | undefined) {
  return String(value ?? "").trim();
}

export function getDisplayNameError(value: string) {
  if (!value) return "이름을 입력해 주세요.";
  if (Array.from(value).length > DISPLAY_NAME_MAX_LENGTH) {
    return `이름은 ${DISPLAY_NAME_MAX_LENGTH}자 이하로 입력해 주세요.`;
  }
  return null;
}

export function getDefaultDisplayName(fullName: unknown, email: string | undefined) {
  const preferredName = typeof fullName === "string" ? fullName.trim() : "";
  const fallbackName = email?.split("@")[0]?.trim() ?? "";
  return Array.from(preferredName || fallbackName).slice(0, DISPLAY_NAME_MAX_LENGTH).join("");
}
