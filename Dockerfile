FROM node:18-bullseye-slim

# set workdir
WORKDIR /app

# copy package manifests first for better caching
COPY package.json package-lock.json ./
COPY backend/package.json backend/package-lock.json backend/
COPY frontend/package.json frontend/package-lock.json frontend/

# install root deps (runs postinstall to install backend/frontend deps)
RUN npm install --no-audit --no-fund

# copy the rest of the app
COPY . .

# build frontend
RUN cd frontend && npm run build

# install backend production deps
RUN cd backend && npm install --no-audit --no-fund --production=true

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "backend/src/server.js"]
