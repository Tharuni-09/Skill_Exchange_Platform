FROM node:22-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy client and build it
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Copy server files
COPY server/ ./server/
COPY server.js ./

EXPOSE 3001

CMD ["node", "server.js"]
