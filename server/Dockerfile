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

EXPOSE 4000

# On boot: apply migrations, then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
