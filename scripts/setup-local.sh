#!/usr/bin/env bash
set -euo pipefail

# MarkFlow AI — Local Development Setup
# Run from the repository root: ./scripts/setup-local.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== MarkFlow AI — Local Setup ==="

# ─── Prerequisites Check ────────────────────────────────────

check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        echo "ERROR: $1 is not installed. $2"
        exit 1
    fi
}

check_cmd node "Install Node.js 20+ from https://nodejs.org"
check_cmd pnpm "Install pnpm: npm install -g pnpm"
check_cmd go   "Install Go 1.23+ from https://go.dev/dl"
check_cmd az   "Install Azure CLI from https://aka.ms/installazurecli"

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "ERROR: Node.js 20+ required, found v$(node -v)"
    exit 1
fi

echo "✓ Prerequisites OK"

# ─── Install Dependencies ───────────────────────────────────

echo ""
echo "Installing pnpm dependencies..."
cd "$ROOT_DIR"
pnpm install

echo ""
echo "Installing Go dependencies..."
cd "$ROOT_DIR/apps/api-gateway" && go mod download
cd "$ROOT_DIR/apps/lti-service" && go mod download
cd "$ROOT_DIR"

echo "✓ Dependencies installed"

# ─── Environment Files ──────────────────────────────────────

create_env_if_missing() {
    local ENV_FILE="$1"
    local TEMPLATE="$2"
    if [ ! -f "$ENV_FILE" ]; then
        echo "Creating $ENV_FILE from template..."
        echo "$TEMPLATE" > "$ENV_FILE"
        echo "  → Edit $ENV_FILE with your values"
    else
        echo "  $ENV_FILE already exists, skipping"
    fi
}

create_env_if_missing "$ROOT_DIR/apps/web/.env.local" \
"NEXT_PUBLIC_API_URL=http://localhost:8080/v1
NEXT_PUBLIC_B2C_AUTHORITY=https://<tenant>.b2clogin.com/<tenant>.onmicrosoft.com/B2C_1_signupsignin
NEXT_PUBLIC_B2C_CLIENT_ID=<your-client-id>"

create_env_if_missing "$ROOT_DIR/apps/api-gateway/.env" \
"PORT=8080
B2C_TENANT=<your-tenant>
B2C_POLICY=B2C_1_signupsignin
B2C_CLIENT_ID=<your-client-id>
STORAGE_ACCOUNT_NAME=<storage-account>
STORAGE_ACCOUNT_KEY=<key>
COSMOS_ENDPOINT=https://<account>.documents.azure.com:443/
COSMOS_KEY=<key>
POSTGRESQL_URL=postgres://markflow:password@localhost:5432/markflow?sslmode=disable
EVENTHUB_NAMESPACE=<namespace>.servicebus.windows.net
EVENTHUB_CONNECTION_STRING=<connection-string>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_..."

create_env_if_missing "$ROOT_DIR/apps/lti-service/.env" \
"PORT=8081
LTI_PLATFORM_ID=https://canvas.instructure.com
LTI_CLIENT_ID=<client-id>
LTI_AUTH_ENDPOINT=https://<canvas>/api/lti/authorize_redirect
LTI_TOKEN_ENDPOINT=https://<canvas>/login/oauth2/token
LTI_JWKS_URI=https://<canvas>/api/lti/security/jwks
LTI_DEPLOYMENT_ID=<deployment-id>
TOOL_PRIVATE_KEY_PATH=./keys/private.pem
TOOL_PUBLIC_KEY_PATH=./keys/public.pem"

echo "✓ Environment files ready"

# ─── Build ──────────────────────────────────────────────────

echo ""
echo "Building all packages..."
pnpm turbo build

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Start development:"
echo "  pnpm turbo dev          # All apps + packages in watch mode"
echo "  cd apps/api-gateway && go run cmd/server/main.go"
echo "  cd apps/lti-service && go run cmd/server/main.go"
