# --- API image ---
FROM node:22-alpine

WORKDIR /app

# Install dependencies (including prisma CLI for generate/migrate)
COPY package.json ./
RUN npm install --omit=dev && npm install prisma@^5.22.0

# Copy source
COPY . .

# Generate the Prisma client against the schema
RUN npx prisma generate

# Railway injects PORT at runtime; 4000 is the local/Compose default.
EXPOSE 4000

# On boot: apply migrations, (idempotently) seed demo data, then start the
# server. Seeding is best-effort so a seed hiccup never blocks the API.
CMD ["sh", "-c", "npx prisma migrate deploy && (node src/prisma/seed.js || echo 'seed skipped') && node src/server.js"]
