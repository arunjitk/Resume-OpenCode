FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build && \
    cp malware-simulation.html dist/ && \
    cp ransomware-simulation.html dist/

# ── Runtime — Express server (serves static + all /api routes) ──────────────
FROM node:20-alpine

WORKDIR /app

# Only production deps
COPY package*.json ./
RUN npm install --omit=dev

# Built static assets
COPY --from=builder /app/dist ./dist

# Source dirs served directly by Express
COPY js ./js
COPY css ./css
COPY ResumePDF ./ResumePDF

# Server entry point
COPY server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
