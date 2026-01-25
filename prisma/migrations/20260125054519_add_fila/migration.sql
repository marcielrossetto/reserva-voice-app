/*
  Warnings:

  - You are about to alter the column `nome` on the `bebidas_cadastro` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `precoAtual` on the `bebidas_cadastro` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `nome` on the `clientes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `telefone` on the `clientes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `telefone2` on the `clientes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `tipoEvento` on the `clientes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `formaPagamento` on the `clientes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `numMesa` on the `clientes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `nomeEmpresa` on the `empresas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `cnpjCpf` on the `empresas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `logoCaminho` on the `empresas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `plano` on the `empresas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `valor` on the `empresas` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `telefone` on the `empresas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to drop the column `createdAt` on the `fila_config_dia` table. All the data in the column will be lost.
  - You are about to alter the column `nome` on the `fila_espera` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `telefone` on the `fila_espera` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `numMesa` on the `fila_espera` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `prioMotivo` on the `fila_espera` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `nome` on the `login` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `email` on the `login` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `senha` on the `login` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `nivel` on the `login` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `nome` on the `menu_cardapios` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `nome` on the `menu_categorias` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `layoutTipo` on the `menu_categorias` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `codPdv` on the `menu_produtos` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `nome` on the `menu_produtos` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `preco` on the `menu_produtos` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `fotoCaminho` on the `menu_produtos` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `origemPais` on the `menu_produtos` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `tipoUva` on the `menu_produtos` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `tamanhoDose` on the `menu_produtos` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `layoutTipo` on the `menu_produtos` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `almoco` on the `preco_rodizio` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `jantar` on the `preco_rodizio` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `domingoAlmoco` on the `preco_rodizio` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `outros` on the `preco_rodizio` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `campoManual1` on the `preco_rodizio` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `campoManual2` on the `preco_rodizio` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `codigoVoucher` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `tokenSeguranca` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `tipo` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `tipoRodizio` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `valorRodizio` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `valorBebida` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `tipoBebida` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `valorSobremesa` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `tipoSobremesa` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `subtotal` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `valorTotal` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `status` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `formaPagamento` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `nomeCliente` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `telefoneCliente` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `cpfCliente` on the `vouchers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - A unique constraint covering the columns `[cnpjCpf]` on the table `empresas` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "login" DROP CONSTRAINT "login_empresaId_fkey";

-- AlterTable
ALTER TABLE "bebidas_cadastro" ALTER COLUMN "nome" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "precoAtual" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "clientes" ALTER COLUMN "nome" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "telefone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "telefone2" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "tipoEvento" DROP NOT NULL,
ALTER COLUMN "tipoEvento" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "formaPagamento" DROP NOT NULL,
ALTER COLUMN "formaPagamento" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "numMesa" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "observacoes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "empresas" ALTER COLUMN "nomeEmpresa" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "cnpjCpf" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "logoCaminho" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "plano" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "valor" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "telefone" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "fila_config_dia" DROP COLUMN "createdAt",
ADD COLUMN     "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "dataConfig" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "fila_espera" ALTER COLUMN "nome" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "telefone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "numMesa" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "prioMotivo" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "login" ADD COLUMN     "ultimoAcesso" TIMESTAMP(3),
ALTER COLUMN "nome" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "senha" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "nivel" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "menu_cardapios" ADD COLUMN     "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "nome" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "menu_categorias" ADD COLUMN     "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "nome" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "layoutTipo" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "menu_produtos" ADD COLUMN     "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "codPdv" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "nome" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "preco" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "fotoCaminho" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "origemPais" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "tipoUva" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "tamanhoDose" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "layoutTipo" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "preco_rodizio" ALTER COLUMN "almoco" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "jantar" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "domingoAlmoco" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "outros" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "campoManual1" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "campoManual2" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "vouchers" ALTER COLUMN "codigoVoucher" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "tokenSeguranca" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "tipo" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "tipoRodizio" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "valorRodizio" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "valorBebida" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "tipoBebida" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "valorSobremesa" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "tipoSobremesa" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "valorTotal" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "formaPagamento" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "nomeCliente" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "telefoneCliente" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "cpfCliente" SET DATA TYPE VARCHAR(20);

-- CreateTable
CREATE TABLE "fila_bebidas" (
    "id" SERIAL NOT NULL,
    "filaId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "bebida" VARCHAR(255) NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fila_bebidas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fila_bebidas_filaId_idx" ON "fila_bebidas"("filaId");

-- CreateIndex
CREATE INDEX "fila_bebidas_empresaId_idx" ON "fila_bebidas"("empresaId");

-- CreateIndex
CREATE INDEX "fila_bebidas_dataCriacao_idx" ON "fila_bebidas"("dataCriacao");

-- CreateIndex
CREATE INDEX "bebidas_cadastro_empresaId_idx" ON "bebidas_cadastro"("empresaId");

-- CreateIndex
CREATE INDEX "bebidas_cadastro_ativo_idx" ON "bebidas_cadastro"("ativo");

-- CreateIndex
CREATE INDEX "clientes_data_idx" ON "clientes"("data");

-- CreateIndex
CREATE INDEX "clientes_status_idx" ON "clientes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpjCpf_key" ON "empresas"("cnpjCpf");

-- CreateIndex
CREATE INDEX "empresas_status_idx" ON "empresas"("status");

-- CreateIndex
CREATE INDEX "empresas_statusPagamento_idx" ON "empresas"("statusPagamento");

-- CreateIndex
CREATE INDEX "empresas_excluida_idx" ON "empresas"("excluida");

-- CreateIndex
CREATE INDEX "fila_config_dia_empresaId_idx" ON "fila_config_dia"("empresaId");

-- CreateIndex
CREATE INDEX "fila_espera_empresaId_idx" ON "fila_espera"("empresaId");

-- CreateIndex
CREATE INDEX "fila_espera_status_idx" ON "fila_espera"("status");

-- CreateIndex
CREATE INDEX "fila_espera_dataCriacao_idx" ON "fila_espera"("dataCriacao");

-- CreateIndex
CREATE INDEX "login_empresaId_idx" ON "login"("empresaId");

-- CreateIndex
CREATE INDEX "login_email_idx" ON "login"("email");

-- CreateIndex
CREATE INDEX "login_status_idx" ON "login"("status");

-- CreateIndex
CREATE INDEX "menu_cardapios_empresaId_idx" ON "menu_cardapios"("empresaId");

-- CreateIndex
CREATE INDEX "menu_cardapios_status_idx" ON "menu_cardapios"("status");

-- CreateIndex
CREATE INDEX "menu_categorias_cardapioId_idx" ON "menu_categorias"("cardapioId");

-- CreateIndex
CREATE INDEX "menu_categorias_status_idx" ON "menu_categorias"("status");

-- CreateIndex
CREATE INDEX "menu_produtos_categoriaId_idx" ON "menu_produtos"("categoriaId");

-- CreateIndex
CREATE INDEX "menu_produtos_empresaId_idx" ON "menu_produtos"("empresaId");

-- CreateIndex
CREATE INDEX "menu_produtos_status_idx" ON "menu_produtos"("status");

-- CreateIndex
CREATE INDEX "pagamentos_mensais_empresaId_idx" ON "pagamentos_mensais"("empresaId");

-- CreateIndex
CREATE INDEX "preco_rodizio_empresaId_idx" ON "preco_rodizio"("empresaId");

-- CreateIndex
CREATE INDEX "vouchers_status_idx" ON "vouchers"("status");

-- CreateIndex
CREATE INDEX "vouchers_dataValidade_idx" ON "vouchers"("dataValidade");

-- AddForeignKey
ALTER TABLE "login" ADD CONSTRAINT "login_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_bebidas" ADD CONSTRAINT "fila_bebidas_filaId_fkey" FOREIGN KEY ("filaId") REFERENCES "fila_espera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_bebidas" ADD CONSTRAINT "fila_bebidas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
