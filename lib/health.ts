import { Account, AccountComputed, AccountRaw, Health } from "./types";

const WEIGHTS = {
  renewal: 0.7,
  blockers: 0.3,
} as const;

const RENEWAL_STATUS_SCORE: Record<AccountRaw["renewalStatus"], number> = {
  Committed: 100,
  Likely: 75,
  "In Negotiation": 50,
  "At Risk": 15,
  Churned: 0,
};

/** Worse-is-lower ranking, used to pick the more severe of two manual health assessments. */
const HEALTH_RANK: Record<Health, number> = { Red: 0, Amber: 1, Green: 2 };

const GREEN_THRESHOLD = 75;
const AMBER_THRESHOLD = 50;

export function computeConsumptionPct(raw: Pick<AccountRaw, "committedConversations" | "consumedConversations">): number {
  if (raw.committedConversations <= 0) {
    return raw.consumedConversations > 0 ? 100 : 0;
  }
  return (raw.consumedConversations / raw.committedConversations) * 100;
}

export interface HealthResult {
  score: number;
  health: Health;
}

/**
 * Fallback score (0-100) used only when neither Relationship nor Delivery Health has been
 * manually assessed yet: renewal status (70%) plus whether any blockers are logged (30%).
 */
export function computeHealthScore(raw: Pick<AccountRaw, "renewalStatus" | "internalBlockers" | "externalBlockers">): HealthResult {
  const renewalScore = RENEWAL_STATUS_SCORE[raw.renewalStatus];
  const blockerCount = [raw.internalBlockers, raw.externalBlockers].filter((b) => b.trim().length > 0).length;
  const blockerScore = blockerCount === 0 ? 100 : blockerCount === 1 ? 50 : 0;

  const score = WEIGHTS.renewal * renewalScore + WEIGHTS.blockers * blockerScore;

  let health: Health;
  if (score >= GREEN_THRESHOLD) {
    health = "Green";
  } else if (score >= AMBER_THRESHOLD) {
    health = "Amber";
  } else {
    health = "Red";
  }

  return { score: Math.round(score * 10) / 10, health };
}

/** The more severe of the two manual assessments, or whichever is set if only one is. */
function worseManualHealth(a: Health | null, b: Health | null): Health | null {
  if (a && b) return HEALTH_RANK[a] <= HEALTH_RANK[b] ? a : b;
  return a ?? b;
}

function daysBetween(fromMs: number, toIso: string): number {
  const toMs = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((toMs - fromMs) / 86_400_000);
}

/** Adds computed/derived fields (health score, consumption %, renewal windows) to a raw record. */
export function computeAccount(raw: AccountRaw, now: Date = new Date()): Account {
  const consumptionPct = computeConsumptionPct(raw);
  const { score, health: scoredHealth } = computeHealthScore(raw);
  const manualHealth = worseManualHealth(raw.manualHealthRelationship, raw.manualHealthDelivery);
  const health = manualHealth ?? scoredHealth;

  const nowMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysToRenewal = raw.renewalDate ? daysBetween(nowMs, raw.renewalDate) : null;
  const isRenewal90 = daysToRenewal != null && daysToRenewal >= 0 && daysToRenewal <= 90;
  const isRenewal180 = daysToRenewal != null && daysToRenewal >= 0 && daysToRenewal <= 180;

  const computed: AccountComputed = {
    consumptionPct,
    daysToRenewal,
    isRenewal90,
    isRenewal180,
    computedHealth: health,
    computedHealthScore: score,
    healthOverridden: manualHealth != null && manualHealth !== scoredHealth,
  };

  return { ...raw, ...computed };
}
