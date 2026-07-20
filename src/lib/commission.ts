import { db } from "@/lib/db";

export interface CommissionSettings {
  commissionRate: number;
  commissionMode: "percentage" | "flat";
  minCommission: number;
  maxCommission: number;
  commissionPayer: "tasker" | "requester" | "both";
  listingFee: number;
  listingFeeEnabled: boolean;
  withdrawFeeRate: number;
  minWithdrawFee: number;
  maxWithdrawFee: number;
  withdrawFeeEnabled: boolean;
  platformName: string;
  platformEarningVisible: boolean;
}

const defaults: CommissionSettings = {
  commissionRate: 10,
  commissionMode: "percentage",
  minCommission: 10,
  maxCommission: 500,
  commissionPayer: "tasker",
  listingFee: 0,
  listingFeeEnabled: false,
  withdrawFeeRate: 1,
  minWithdrawFee: 5,
  maxWithdrawFee: 100,
  withdrawFeeEnabled: true,
  platformName: "Benim İçin Yap",
  platformEarningVisible: true,
};

let cachedSettings: CommissionSettings | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 30_000; // 30 seconds

export async function getCommissionSettings(): Promise<CommissionSettings> {
  const now = Date.now();
  if (cachedSettings && now < cacheExpiry) return cachedSettings;

  const settings = (await db.platformSetting.findMany()) as any[];
  const map: Record<string, string> = {};
  settings.forEach((s: any) => {
    map[s.key] = s.value;
  });

  const parsed: CommissionSettings = {
    commissionRate: parseFloat(map["commission_rate"]) || defaults.commissionRate,
    commissionMode: (map["commission_mode"] as "percentage" | "flat") || defaults.commissionMode,
    minCommission: parseFloat(map["min_commission"]) || defaults.minCommission,
    maxCommission: parseFloat(map["max_commission"]) || defaults.maxCommission,
    commissionPayer: (map["commission_payer"] as "tasker" | "requester" | "both") || defaults.commissionPayer,
    listingFee: parseFloat(map["listing_fee"]) || defaults.listingFee,
    listingFeeEnabled: map["listing_fee_enabled"] === "true",
    withdrawFeeRate: parseFloat(map["withdraw_fee_rate"]) || defaults.withdrawFeeRate,
    minWithdrawFee: parseFloat(map["min_withdraw_fee"]) || defaults.minWithdrawFee,
    maxWithdrawFee: parseFloat(map["max_withdraw_fee"]) || defaults.maxWithdrawFee,
    withdrawFeeEnabled: map["withdraw_fee_enabled"] === "true",
    platformName: map["platform_name"] || defaults.platformName,
    platformEarningVisible: map["platform_earning_visible"] !== "false",
  };

  cachedSettings = parsed;
  cacheExpiry = now + CACHE_TTL;
  return parsed;
}

export function clearSettingsCache() {
  cachedSettings = null;
  cacheExpiry = 0;
}

export function calculateCommission(fee: number, settings: CommissionSettings): number {
  if (settings.commissionMode === "flat") {
    return settings.commissionRate;
  }
  // Percentage mode
  const commission = (fee * settings.commissionRate) / 100;
  return Math.max(settings.minCommission, Math.min(commission, settings.maxCommission));
}

export function calculateWithdrawFee(amount: number, settings: CommissionSettings): number {
  if (!settings.withdrawFeeEnabled) return 0;
  const fee = (amount * settings.withdrawFeeRate) / 100;
  return Math.max(settings.minWithdrawFee, Math.min(fee, settings.maxWithdrawFee));
}