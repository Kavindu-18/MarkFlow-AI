# MarkFlow AI — Data Model

## Cosmos DB (NoSQL)

Database: `markflow`

### Container: `exams` (Partition Key: `/tenantId`)

```json
{
  "id": "exam-uuid",
  "tenantId": "tenant-uuid",
  "title": "Midterm Exam — Calculus I",
  "subject": "Mathematics",
  "totalMarks": 100,
  "createdBy": "user-uuid",
  "createdAt": "2026-01-15T10:00:00Z",
  "updatedAt": "2026-01-15T10:00:00Z",
  "status": "published",
  "questions": [
    {
      "id": "q1",
      "type": "text",
      "prompt": "Explain the mean value theorem.",
      "maxMarks": 20,
      "rubric": "Award 10 marks for correct statement...",
      "boundingBox": { "x": 50, "y": 200, "width": 500, "height": 150 },
      "pageNumber": 1
    }
  ],
  "pageCount": 4,
  "pdfUrl": "https://<storage>.blob.core.windows.net/raw-uploads/tenant-uuid/exam-uuid/exam.pdf"
}
```

### Container: `submissions` (Partition Key: `/examId`)

```json
{
  "id": "submission-uuid",
  "examId": "exam-uuid",
  "studentId": "student-uuid",
  "tenantId": "tenant-uuid",
  "batchId": "batch-uuid",
  "status": "graded",
  "pageImages": [
    "https://<storage>.blob.core.windows.net/processed/tenant-uuid/exam-uuid/student-uuid/page-1.png"
  ],
  "totalScore": 85,
  "totalMaxMarks": 100,
  "percentage": 85.0,
  "averageConfidence": 0.92,
  "createdAt": "2026-01-15T11:00:00Z",
  "gradedAt": "2026-01-15T11:05:00Z"
}
```

### Container: `grading-results` (Partition Key: `/submissionId`)

```json
{
  "id": "result-uuid",
  "submissionId": "submission-uuid",
  "questionId": "q1",
  "examId": "exam-uuid",
  "questionType": "text",
  "extractedAnswer": "The mean value theorem states that...",
  "aiScore": 18,
  "maxMarks": 20,
  "confidence": 0.94,
  "feedback": "Excellent explanation of the theorem statement. Minor deduction for incomplete proof sketch.",
  "aiModel": "gpt-4o",
  "teacherOverride": null,
  "overrideReason": null,
  "gradedAt": "2026-01-15T11:04:30Z"
}
```

## PostgreSQL

Database: `markflow`

### ERD

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│     tenants       │     │      users        │     │    billing_usage     │
├──────────────────┤     ├──────────────────┤     ├──────────────────────┤
│ id          UUID  │─┐   │ id          UUID  │     │ id             UUID  │
│ name        TEXT  │ │   │ tenant_id   UUID  │──┐  │ tenant_id      UUID  │
│ slug        TEXT  │ │   │ email       TEXT  │  │  │ month          TEXT  │
│ plan        TEXT  │ │   │ display_name TEXT │  │  │ pages_scanned  INT   │
│ created_at  TS   │ │   │ role        TEXT  │  │  │ ai_calls       INT   │
│ updated_at  TS   │ │   │ b2c_oid     TEXT  │  │  │ storage_bytes  BIGINT│
└──────────────────┘ │   │ created_at  TS   │  │  │ updated_at     TS    │
                     │   └──────────────────┘  │  └──────────────────────┘
                     │                          │
                     └──────────────────────────┘
                        tenant_id FK

┌──────────────────────┐     ┌──────────────────────────┐
│  lti_registrations    │     │   stripe_subscriptions    │
├──────────────────────┤     ├──────────────────────────┤
│ id              UUID  │     │ id                  UUID  │
│ tenant_id       UUID  │     │ tenant_id           UUID  │
│ platform_id     TEXT  │     │ stripe_customer_id  TEXT  │
│ client_id       TEXT  │     │ stripe_sub_id       TEXT  │
│ auth_endpoint   TEXT  │     │ plan                TEXT  │
│ token_endpoint  TEXT  │     │ status              TEXT  │
│ jwks_uri        TEXT  │     │ current_period_end  TS    │
│ deployment_id   TEXT  │     │ created_at          TS    │
│ created_at      TS    │     └──────────────────────────┘
└──────────────────────┘
```

### Table Definitions

```sql
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id),
    email        TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin', 'owner')),
    b2c_oid      TEXT UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

CREATE TABLE billing_usage (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id),
    month          TEXT NOT NULL,  -- '2026-01'
    pages_scanned  INT NOT NULL DEFAULT 0,
    ai_calls       INT NOT NULL DEFAULT 0,
    storage_bytes  BIGINT NOT NULL DEFAULT 0,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, month)
);

CREATE TABLE lti_registrations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id),
    platform_id    TEXT NOT NULL,
    client_id      TEXT NOT NULL,
    auth_endpoint  TEXT NOT NULL,
    token_endpoint TEXT NOT NULL,
    jwks_uri       TEXT NOT NULL,
    deployment_id  TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (platform_id, client_id, deployment_id)
);

CREATE TABLE stripe_subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) UNIQUE,
    stripe_customer_id  TEXT NOT NULL UNIQUE,
    stripe_sub_id       TEXT UNIQUE,
    plan                TEXT NOT NULL DEFAULT 'free',
    status              TEXT NOT NULL DEFAULT 'active',
    current_period_end  TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_b2c ON users(b2c_oid) WHERE b2c_oid IS NOT NULL;
CREATE INDEX idx_billing_tenant_month ON billing_usage(tenant_id, month);
CREATE INDEX idx_lti_platform ON lti_registrations(platform_id, deployment_id);
```

## Event Schemas (Event Hubs)

### `exam-uploaded`
```json
{
  "type": "ExamUploaded",
  "examId": "exam-uuid",
  "tenantId": "tenant-uuid",
  "batchId": "batch-uuid",
  "sourceUri": "abfss://raw-uploads@<account>.dfs.core.windows.net/...",
  "pageCount": 30,
  "correlationId": "uuid",
  "timestamp": "2026-01-15T11:00:00Z"
}
```

### `grading-completed`
```json
{
  "type": "GradingCompleted",
  "examId": "exam-uuid",
  "batchId": "batch-uuid",
  "submissionCount": 30,
  "averageScore": 78.5,
  "averageConfidence": 0.91,
  "processingTimeMs": 45000,
  "correlationId": "uuid",
  "timestamp": "2026-01-15T11:05:00Z"
}
```
