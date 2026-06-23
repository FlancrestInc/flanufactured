# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/ ./
RUN npm install && npm run build

# ── Stage 2: Install FakerJS backend dependency ───────────────────────────────
FROM node:24-slim AS fakerjs-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 3: Python backend ───────────────────────────────────────────────────
FROM python:3.12-slim AS final
WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY --from=fakerjs-deps /usr/local/bin/node /usr/local/bin/node
COPY --from=fakerjs-deps /app/node_modules ./node_modules
COPY package*.json ./
COPY backend/ ./

# Pull in the compiled React app from stage 1
COPY --from=frontend-builder /frontend/dist ./frontend/dist

RUN mkdir -p /app/data

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
