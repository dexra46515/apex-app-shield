#!/bin/sh
set -eu

# Run from this script's directory
cd "$(dirname "$0")"

# Stop and clean up previous stack (ignore errors if not running)
docker compose -f docker-compose.dev.yml down -v --remove-orphans || true

# Rebuild WAF image without cache
docker compose -f docker-compose.dev.yml build --no-cache ana-waf-dev

# Start all services
docker compose -f docker-compose.dev.yml up -d

# Tail WAF logs
docker compose -f docker-compose.dev.yml logs -f --tail=100 ana-waf-dev
