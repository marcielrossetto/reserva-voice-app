import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Validação da Variável de Ambiente
 * Garante que o Prisma não tente rodar sem uma URL válida,
 * resolvendo o erro de 'string | undefined'.
 */
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // Lança um erro claro durante o build/execução se a env estiver faltando
  throw new Error("❌ DATABASE_URL is not defined in your .env file");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    /* 
       Agora o TypeScript entende que 'url' é sempre uma string, 
       pois o erro acima impediria o código de chegar aqui se fosse undefined.
    */
    url: databaseUrl,
  },
});