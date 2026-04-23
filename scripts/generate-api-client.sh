#!/usr/bin/env bash
set -euo pipefail

# MarkFlow AI — Generate API Client
# Generates a TypeScript client from the OpenAPI spec using openapi-typescript-codegen.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SPEC_FILE="$ROOT_DIR/docs/api-spec.yaml"
OUTPUT_DIR="$ROOT_DIR/packages/api-client/src/generated"

echo "=== MarkFlow AI — Generate API Client ==="

if [ ! -f "$SPEC_FILE" ]; then
    echo "ERROR: OpenAPI spec not found at $SPEC_FILE"
    exit 1
fi

# Ensure the generator is available
if ! npx --yes openapi-typescript-codegen --help &> /dev/null; then
    echo "Installing openapi-typescript-codegen..."
    pnpm add -D openapi-typescript-codegen -w
fi

# Clean previous output
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

echo "Generating client from $SPEC_FILE..."
npx openapi-typescript-codegen \
    --input "$SPEC_FILE" \
    --output "$OUTPUT_DIR" \
    --client fetch \
    --name MarkFlowApiClient \
    --useUnionTypes

echo "✓ API client generated at $OUTPUT_DIR"
echo ""
echo "Usage:"
echo "  import { MarkFlowApiClient } from '@markflow/api-client';"
