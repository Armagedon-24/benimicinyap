import { db } from "@/lib/db";

export interface AiGuardSettings {
  blockEnabled: boolean;
  blockThreshold: number; // human confidence % below which approval is blocked
}

const defaults: AiGuardSettings = {
  blockEnabled: true,
  blockThreshold: 30,
};

let cachedSettings: AiGuardSettings | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 30_000; // 30 seconds

export async function getAiGuardSettings(): Promise<AiGuardSettings> {
  const now = Date.now();
  if (cachedSettings && now < cacheExpiry) return cachedSettings;

  const settings = (await db.platformSetting.findMany()) as any[];
  const map: Record<string, string> = {};
  settings.forEach((s: any) => {
    map[s.key] = s.value;
  });

  const parsed: AiGuardSettings = {
    blockEnabled: map["ai_block_enabled"] !== "false",
    blockThreshold: (() => {
      const v = parseFloat(map["ai_block_threshold"]);
      if (isNaN(v)) return defaults.blockThreshold;
      return Math.max(0, Math.min(100, v));
    })(),
  };

  cachedSettings = parsed;
  cacheExpiry = now + CACHE_TTL;
  return parsed;
}

export function clearAiGuardCache() {
  cachedSettings = null;
  cacheExpiry = 0;
}

export interface AiApprovalBlockResult {
  blocked: boolean;
  reason: string;
  score: number | null;
  threshold: number;
  enabled: boolean;
}

/**
 * Determines whether the employer approval of a delivered task must be blocked
 * based on the AI authenticity scan score ("human confidence").
 *
 * Rules:
 * - If the guard is disabled, approval is never blocked.
 * - If there is no scan result yet (score null), approval is allowed (fail-open;
 *   a rescan can be triggered from the UI or API at any time).
 * - If the human-confidence score is strictly below the configured threshold,
 *   the employer CANNOT approve ("onaylayamazsın" rule). Admin arbitration can
 *   still override through the admin panel.
 */
export async function isApprovalBlockedByAi(task: {
  aiCheckScore?: number | null;
  aiCheckVerdict?: string | null;
}): Promise<AiApprovalBlockResult> {
  const settings = await getAiGuardSettings();
  const base: AiApprovalBlockResult = {
    blocked: false,
    reason: "",
    score: typeof task.aiCheckScore === "number" ? task.aiCheckScore : null,
    threshold: settings.blockThreshold,
    enabled: settings.blockEnabled,
  };

  if (!settings.blockEnabled) return base;
  if (base.score === null) return base;

  if (base.score < settings.blockThreshold) {
    return {
      ...base,
      blocked: true,
      reason: `Yapay zeka taraması bu teslimin insan güveni skorunu %${Math.round(base.score)} buldu. Eşik %${settings.blockThreshold} altındaki teslimler onaylanamaz. Görevliden yeniden teslim isteyebilir, itiraz edebilir veya yönetici incelemesine başvurabilirsiniz.`,
    };
  }

  return base;
}
