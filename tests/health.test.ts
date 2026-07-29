import { describe, expect, it } from "vitest";
import { computeAccount, computeConsumptionPct, computeHealthScore } from "@/lib/health";
import { AccountRaw } from "@/lib/types";

function baseRaw(overrides: Partial<AccountRaw> = {}): AccountRaw {
  return {
    accountId: "ACC-1",
    accountName: "Acme Corp",
    region: "NA",
    industry: "Retail",
    tier: "Enterprise",
    aoOwner: "Jane Doe",
    fdePod: "Pod Alpha",
    arr: 200000,
    totalArr: 250000,
    contractStart: "2025-01-01",
    renewalDate: "2026-12-01",
    lastEbrDate: "2026-05-01",
    actionDueDate: "2026-08-01",
    renewalStatus: "Committed",
    paymentStatus: "Current",
    paymentLate: false,
    committedConversations: 100000,
    consumedConversations: 90000,
    containmentPct: 85,
    botCsat: 90,
    liveUseCases: 4,
    contractedUseCases: 4,
    channelsLive: 3,
    primaryUseCase: "WhatsApp Support Bot",
    championStatus: "Active",
    execSponsorEngaged: true,
    keyStakeholders: "Jane, VP Ops",
    healthReason: "",
    internalBlockers: "",
    externalBlockers: "",
    nextAction: "",
    actionOwner: "",
    blockerType: "None",
    manualHealthRelationship: null,
    manualHealthDelivery: null,
    expansionStage: "None",
    expansionValue: 0,
    churned: false,
    rowIndex: 2,
    ...overrides,
  };
}

describe("computeConsumptionPct", () => {
  it("computes consumed/committed as a percentage", () => {
    expect(computeConsumptionPct({ committedConversations: 100, consumedConversations: 50 })).toBe(50);
  });

  it("treats zero commitment with zero consumption as 0%, not a divide-by-zero crash", () => {
    expect(computeConsumptionPct({ committedConversations: 0, consumedConversations: 0 })).toBe(0);
  });

  it("treats zero commitment with nonzero consumption as 100%", () => {
    expect(computeConsumptionPct({ committedConversations: 0, consumedConversations: 10 })).toBe(100);
  });
});

describe("computeHealthScore", () => {
  it("scores a committed, blocker-free account as Green", () => {
    const raw = baseRaw({ renewalStatus: "Committed" });
    const { health } = computeHealthScore(raw);
    expect(health).toBe("Green");
  });

  it("scores a mediocre renewal status as Amber", () => {
    const raw = baseRaw({ renewalStatus: "In Negotiation" });
    const { health } = computeHealthScore(raw);
    expect(health).toBe("Amber");
  });

  it("scores At Risk renewal as Red", () => {
    const raw = baseRaw({ renewalStatus: "At Risk" });
    const { health } = computeHealthScore(raw);
    expect(health).toBe("Red");
  });

  it("penalizes logged blockers even with a good renewal status", () => {
    const clean = computeHealthScore(baseRaw({ renewalStatus: "Committed" }));
    const withBlockers = computeHealthScore(
      baseRaw({ renewalStatus: "Committed", internalBlockers: "Budget freeze", externalBlockers: "IT delay" })
    );
    expect(withBlockers.score).toBeLessThan(clean.score);
  });
});

describe("computeAccount", () => {
  const now = new Date("2026-07-20T00:00:00Z");

  it("computes daysToRenewal and renewal windows", () => {
    const raw = baseRaw({ renewalDate: "2026-09-01" }); // 43 days out
    const account = computeAccount(raw, now);
    expect(account.daysToRenewal).toBe(43);
    expect(account.isRenewal90).toBe(true);
    expect(account.isRenewal180).toBe(true);
  });

  it("marks renewals beyond 180 days as neither window", () => {
    const raw = baseRaw({ renewalDate: "2027-06-01" });
    const account = computeAccount(raw, now);
    expect(account.isRenewal90).toBe(false);
    expect(account.isRenewal180).toBe(false);
  });

  it("handles a null renewal date", () => {
    const raw = baseRaw({ renewalDate: null });
    const account = computeAccount(raw, now);
    expect(account.daysToRenewal).toBeNull();
    expect(account.isRenewal90).toBe(false);
  });

  it("manual health assessment wins over the computed score, and flags the override", () => {
    const raw = baseRaw({ manualHealthRelationship: "Red" }); // scored health would be Green
    const account = computeAccount(raw, now);
    expect(account.computedHealth).toBe("Red");
    expect(account.computedHealthScore).toBeGreaterThanOrEqual(75); // score still computed for reference
    expect(account.healthOverridden).toBe(true);
  });

  it("takes the worse of Relationship and Delivery Health when both are set", () => {
    const raw = baseRaw({ manualHealthRelationship: "Green", manualHealthDelivery: "Amber" });
    const account = computeAccount(raw, now);
    expect(account.computedHealth).toBe("Amber");
  });

  it("does not flag healthOverridden when manual health matches computed", () => {
    const raw = baseRaw({ manualHealthRelationship: "Green" });
    const account = computeAccount(raw, now);
    expect(account.healthOverridden).toBe(false);
  });

  it("falls back to the computed score when no manual health is set", () => {
    const raw = baseRaw({ manualHealthRelationship: null, manualHealthDelivery: null });
    const account = computeAccount(raw, now);
    expect(account.healthOverridden).toBe(false);
    expect(account.computedHealth).toBe("Green");
  });
});
