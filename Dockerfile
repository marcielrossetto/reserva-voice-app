FROM node:18

# Diretório de trabalho
WORKDIR /app

# Copiar dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o restante do código
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Expor a porta
EXPOSE 3001

# Iniciar aplicação
CMD ["npm", "start"]
