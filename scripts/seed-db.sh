#!/usr/bin/env bash
set -euo pipefail

# MarkFlow AI — Seed Database
# Seeds PostgreSQL with sample tenant, users, and LTI registration for local development.
# Requires: psql, POSTGRESQL_URL env var or default localhost connection.

DB_URL="${POSTGRESQL_URL:-postgres://markflow:password@localhost:5432/markflow?sslmode=disable}"

echo "=== MarkFlow AI — Seed Database ==="
echo "Target: $DB_URL"

psql "$DB_URL" <<'SQL'
BEGIN;

-- Seed tenant
INSERT INTO tenants (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo School', 'demo-school', 'pro')
ON CONFLICT (id) DO NOTHING;

-- Seed admin user
INSERT INTO users (id, tenant_id, email, display_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'admin@demo.school',
    'Admin User',
    'admin'
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Seed teacher user
INSERT INTO users (id, tenant_id, email, display_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'teacher@demo.school',
    'Jane Teacher',
    'teacher'
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Seed billing usage
INSERT INTO billing_usage (tenant_id, month, pages_scanned, ai_calls, storage_bytes)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    to_char(now(), 'YYYY-MM'),
    0, 0, 0
) ON CONFLICT (tenant_id, month) DO NOTHING;

-- Seed LTI registration (Canvas example)
INSERT INTO lti_registrations (tenant_id, platform_id, client_id, auth_endpoint, token_endpoint, jwks_uri, deployment_id)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'https://canvas.instructure.com',
    '10000000000001',
    'https://canvas.example.com/api/lti/authorize_redirect',
    'https://canvas.example.com/login/oauth2/token',
    'https://canvas.example.com/api/lti/security/jwks',
    'deployment-001'
) ON CONFLICT (platform_id, client_id, deployment_id) DO NOTHING;

-- Seed Stripe subscription (test)
INSERT INTO stripe_subscriptions (tenant_id, stripe_customer_id, plan, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'cus_test_demo',
    'pro',
    'active'
) ON CONFLICT (tenant_id) DO NOTHING;

COMMIT;

SELECT 'Seeded:' AS status,
       (SELECT count(*) FROM tenants) AS tenants,
       (SELECT count(*) FROM users) AS users,
       (SELECT count(*) FROM lti_registrations) AS lti_regs;
SQL

echo "✓ Database seeded"
