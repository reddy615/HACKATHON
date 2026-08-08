FROM node:18-alpine

# set workdir
WORKDIR /app

# copy all files
COPY . .

# install root deps (runs postinstall to install backend/frontend deps)
RUN npm install --no-audit --no-fund

# build frontend
RUN cd frontend && npm run build

# install backend production deps
RUN cd backend && npm install --no-audit --no-fund --production=true

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "backend/src/server.js"]
