import type {
  MonitoringSystemSettings,
  RiskScoringWeights,
  UrgencyLevel,
} from "@/lib/monitoring/types";

export const DEFAULT_RISK_WEIGHTS: RiskScoringWeights = {
  viewCount: 0.1,
  growthRate: 0.15,
  shareCount: 0.1,
  engagementRate: 0.1,
  sourceInfluenceScore: 0.1,
  sourceCredibilityScore: 0.05,
  negativityScore: 0.12,
  topicSensitivity: 0.08,
  geographicSpread: 0.05,
  numberOfPlatforms: 0.05,
  numberOfInfluentialAccounts: 0.05,
  organizationImportance: 0.03,
  viralityProbability: 0.02,
};

export const DEFAULT_ESCALATION: Record<UrgencyLevel, string[]> = {
  low: ["shift_officer"],
  normal: ["shift_officer", "organization_manager"],
  high: ["shift_officer", "public_relations_manager", "organization_manager"],
  critical: [
    "shift_officer",
    "public_relations_manager",
    "organization_manager",
    "central_command_manager",
  ],
  immediate: [
    "shift_officer",
    "public_relations_manager",
    "organization_manager",
    "central_command_manager",
    "super_admin",
  ],
};

export const DEFAULT_MONITORING_SETTINGS: MonitoringSystemSettings = {
  riskWeights: DEFAULT_RISK_WEIGHTS,
  alertThresholds: {
    medium: 25,
    high: 50,
    critical: 75,
  },
  escalationMatrix: DEFAULT_ESCALATION,
  smsRecipients: [
    { name: "مسئول شیفت مرکز", phone: "09120000001", role: "shift_officer" },
    { name: "مدیر روابط عمومی", phone: "09120000002", role: "public_relations_manager" },
    { name: "مدیر سازمان نمونه", phone: "09120000003", role: "organization_manager" },
  ],
  providerId: "mock",
  aiEnabled: true,
  pollingIntervalMinutes: 15,
  duplicateWindowHours: 24,
  scheduleCron: "*/15 * * * *",
};
