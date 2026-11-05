FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose port
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
