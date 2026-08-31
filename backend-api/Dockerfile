FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

# Kodlar kopyalanıyor
COPY . .

# Kopyalandıktan sonra Prisma çalışıyor (Sıra hatası çözümü)
RUN npx prisma generate

EXPOSE 3000
CMD ["npm", "start"]
