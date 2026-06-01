FROM node:20-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates
COPY package.json ./
RUN npm install --production --legacy-peer-deps
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node src/prisma/seed.js; node src/server.js"]
