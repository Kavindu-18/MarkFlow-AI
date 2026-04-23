// ─── Billing & Tenant Types ──────────────────────────────────────────────────

export type BillingTier = 'free' | 'pro' | 'enterprise';

export interface Tenant {
  id: string;
  name: string;
  billingTier: BillingTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  /** Monthly page quota based on tier */
  monthlyPageQuota: number;
  /** Pages processed in the current billing period */
  pagesUsedThisPeriod: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'teacher' | 'viewer';
  /** Azure AD B2C object ID for direct auth */
  b2cObjectId?: string;
  /** LTI user ID for LMS-originated sessions */
  ltiUserId?: string;
  createdAt: string;
}

export interface UsageLog {
  id: string;
  tenantId: string;
  examId: string;
  submissionId: string;
  pagesProcessed: number;
  /** Stripe usage record ID */
  stripeUsageRecordId?: string;
  processedAt: string;
}

export interface ApiKey {
  id: string;
  tenantId: string;
  /** Shown only once at creation, stored as SHA-256 hash */
  keyHash: string;
  /** Prefix for identification (e.g., "mk_live_abc...") */
  keyPrefix: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}
