# MarkFlow AI — Architecture

## Overview

MarkFlow AI is an enterprise-grade AI grading platform that automates the assessment of paper-based exams. Teachers create exams with a web-based PDF generator, students write on printed paper, teachers scan the completed exams with a mobile device, and the platform uses AI to grade them— returning results to any LMS via LTI 1.3.

## System Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          MarkFlow AI Platform                              │
│                                                                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Next.js 15  │  │  API Gateway │  │ LTI Service  │  │   Databricks │   │
│  │   (Web App)  │  │   (Go/Chi)   │  │  (Go/Chi)    │  │   Pipeline   │   │
│  │   Port 3000  │  │   Port 8080  │  │  Port 8081   │  │              │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │                 │             │
│         │    ┌────────────┴─────────────────┴─────────┐      │             │
│         │    │          Azure Event Hubs (Kafka)       │──────┘             │
│         │    │  exam-uploaded | page-processed |       │                    │
│         │    │  grading-requested | grading-completed  │                    │
│         │    └────────────────────────────────────────-┘                    │
│         │                                                                  │
│  ┌──────┴───────────────────────────────────────────────────────────────┐  │
│  │                         Data Layer                                    │ │
│  │  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────────┐  │ │
│  │  │ Cosmos DB     │  │  PostgreSQL   │  │  ADLS Gen2               │  │ │
│  │  │ (NoSQL)       │  │  (Relational) │  │  raw / processed / graded│  │ │
│  │  │ exams         │  │  tenants      │  │                          │  │ │
│  │  │ submissions   │  │  users        │  │                          │  │ │
│  │  │ grading-results│ │  billing      │  │                          │  │ │
│  │  └──────────────┘  └───────────────┘  └──────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       AI Services                                     │ │
│  │  Azure Document Intelligence │ Azure OpenAI (GPT-4o) │ Mathpix API  │ │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

## Phase Breakdown

### Phase 1 — Foundation & Smart Paper Engine
- Monorepo setup (Turborepo + pnpm)
- Shared type definitions
- Glass morphism UI component library
- PDF generation with QR codes and fiducial markers
- Next.js web app with exam creation, scanner, and grading review

### Phase 2 — Ingestion Pipeline
- Databricks notebooks for PDF splitting, QR decoding, layout analysis
- ADLS Gen2 storage with 3 containers (raw, processed, graded)
- Event Hub integration for async pipeline orchestration
- Airflow DAGs for workflow orchestration

### Phase 3 — AI Grading Engine
- Multi-agent routing: text → Doc Intelligence OCR → GPT-4o, equation → Mathpix → GPT-4o, diagram → GPT-4o Vision, checkbox → deterministic
- Confidence scoring and human-in-the-loop review for low confidence
- Score aggregation and event publishing

### Phase 4 — LMS Integration & Billing
- LTI 1.3 OIDC launch flow and deep linking
- AGS (Assignment and Grade Services) for grade passback
- Stripe-based billing with usage tracking
- API Management with tiered rate limiting

## Authentication

| Context | Provider | Protocol |
|---------|----------|----------|
| Teacher / Admin login | Azure AD B2C | OAuth 2.0 / OIDC |
| LMS student access | LTI 1.3 Platform | OIDC 3rd-party initiated |
| Service-to-service | Managed Identity | Azure RBAC |

## Deployment

- **Compute**: Azure Container Apps (3 apps: api-gateway, lti-service, web)
- **Infrastructure**: Terraform with 11 modules
- **CI/CD**: GitHub Actions (4 workflows: CI, deploy-infra, deploy-apps, deploy-pipelines)
- **Environments**: dev, staging, prod (per-environment tfvars)

## Key Design Decisions

1. **Monorepo** — Single repo for frontend, backend, infra, and pipelines. Turborepo handles parallel builds and caching.
2. **Go for backend** — Lightweight, fast compilation, strong concurrency primitives for the API gateway and LTI service.
3. **Databricks for data pipeline** — Handles the heavy PDF processing / AI routing at scale, with auto-scaling clusters.
4. **Cosmos DB (NoSQL)** — Flexible schema for exams, submissions, and grading results. Partitioned by tenant/exam for multi-tenancy.
5. **Event-driven architecture** — Decouples upload from processing from grading. Event Hubs provides Kafka-compatible ordering.
6. **Glass morphism UI** — Modern, distinctive visual identity using backdrop-blur and transparency.
