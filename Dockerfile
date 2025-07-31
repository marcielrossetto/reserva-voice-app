FROM node:18

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos do projeto
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar todo o código
COPY . .

# Expor a porta
EXPOSE 3001

# Comando para iniciar o app
CMD ["node", "server.js"]
