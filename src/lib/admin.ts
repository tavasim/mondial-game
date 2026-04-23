export function isResultsAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.RESULTS_ADMIN_EMAILS ?? "";
  const whitelist = raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (whitelist.length === 0) {
    return false;
  }
  return whitelist.includes(email.toLowerCase());
}
