export const MAX_LIVES = 5;
export const LIFE_REGEN_HOURS = 5;

/** Human-readable countdown until the next heart refills. */
export function formatLifeRegenCountdown(nextAt: string | Date | null | undefined): string | null {
  if (!nextAt) return null;
  const ms = new Date(nextAt).getTime() - Date.now();
  if (ms <= 0) return null;

  const totalMinutes = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return "< 1m";
}

export function msUntilLifeRegen(nextAt: string | Date | null | undefined): number | null {
  if (!nextAt) return null;
  const ms = new Date(nextAt).getTime() - Date.now();
  return ms > 0 ? ms : 0;
}
