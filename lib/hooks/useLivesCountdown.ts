"use client";

import { useEffect, useState } from "react";
import { formatLifeRegenCountdown, msUntilLifeRegen } from "@/lib/lives";

/** Live countdown label for the next heart recharge. */
export function useLivesCountdown(nextAt: string | null | undefined) {
  const [label, setLabel] = useState<string | null>(() => formatLifeRegenCountdown(nextAt));

  useEffect(() => {
    const tick = () => setLabel(formatLifeRegenCountdown(nextAt));
    tick();

    const ms = msUntilLifeRegen(nextAt);
    const intervalMs = ms !== null && ms < 3_600_000 ? 1_000 : 30_000;
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [nextAt]);

  return label;
}
