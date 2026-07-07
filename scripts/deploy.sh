#!/usr/bin/env bash
set -euo pipefail

echo "=== TRADUMUST Deployment ==="

# Start infrastructure
docker compose up -d postgres redis

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U tradumust > /dev/null 2>&1; do
  sleep 1
done

# Database setup
cd server
npm install
npx prisma generate --schema ../prisma/schema.prisma
npx prisma db push --schema ../prisma/schema.prisma
npm run db:seed
cd ..

# Build services
npm install
npm run build
cd server && npm run build && cd ..

echo "=== Deployment ready ==="
echo "Run: npm run dev:all"
echo "Or:  docker compose up -d"
