FROM node:22-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN npm install -g corepack@latest \
    && corepack pnpm install \
    && python3 -m pip install --no-cache-dir --break-system-packages -r python_service/requirements.txt \
    && corepack pnpm run build

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
