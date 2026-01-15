-- CreateTable
CREATE TABLE "empresas" (
    "id" SERIAL NOT NULL,
    "nomeEmpresa" TEXT NOT NULL,
    "cnpjCpf" TEXT,
    "dataInclusao" TIMESTAMP(3),
    "logo" BYTEA,
    "logoCaminho" TEXT,
    "dataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "statusPagamento" INTEGER NOT NULL DEFAULT 0,
    "dataUltimoPagamento" TIMESTAMP(3),
    "dataExpiracao" TIMESTAMP(3),
    "plano" TEXT NOT NULL DEFAULT 'mensal',
    "valor" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "observacoes" TEXT,
    "excluida" BOOLEAN NOT NULL DEFAULT false,
    "dataExclusao" TIMESTAMP(3),

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "senhaTexto" TEXT,
    "nivel" TEXT NOT NULL DEFAULT 'operacional',
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "login_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "numPessoas" INTEGER NOT NULL,
    "horario" TIMESTAMP(3) NOT NULL,
    "telefone" TEXT,
    "telefone2" TEXT,
    "tipoEvento" TEXT NOT NULL,
    "formaPagamento" TEXT NOT NULL,
    "valorRodizio" INTEGER,
    "numMesa" TEXT,
    "observacoes" TEXT NOT NULL,
    "obsCliente" TEXT,
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "usuarioId" INTEGER,
    "motivoCancelamento" TEXT,
    "tortaTermoVela" BOOLEAN NOT NULL DEFAULT false,
    "churrascaria" BOOLEAN NOT NULL DEFAULT false,
    "executivo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bebidas_cadastro" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "precoAtual" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bebidas_cadastro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fila_espera" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "numPessoas" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "prioridade" BOOLEAN NOT NULL DEFAULT false,
    "numMesa" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horaSentado" TIMESTAMP(3),
    "prioMotivo" TEXT,
    "posicaoFila" INTEGER,

    CONSTRAINT "fila_espera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fila_config_dia" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "dataConfig" TIMESTAMP(3) NOT NULL,
    "numeroInicial" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fila_config_dia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_cardapios" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "menu_cardapios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categorias" (
    "id" SERIAL NOT NULL,
    "cardapioId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "layoutTipo" TEXT NOT NULL DEFAULT 'vinho',
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "menu_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_produtos" (
    "id" SERIAL NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "codPdv" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "foto" BYTEA,
    "fotoCaminho" TEXT,
    "origemPais" TEXT,
    "tipoUva" TEXT,
    "tamanhoDose" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "layoutTipo" TEXT NOT NULL DEFAULT 'normal',
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos_mensais" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_mensais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preco_rodizio" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "almoco" DECIMAL(65,30) NOT NULL,
    "jantar" DECIMAL(65,30) NOT NULL,
    "domingoAlmoco" DECIMAL(65,30) NOT NULL,
    "outros" DECIMAL(65,30) NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campoManual1" TEXT,
    "campoManual2" TEXT,

    CONSTRAINT "preco_rodizio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "codigoVoucher" TEXT NOT NULL,
    "tokenSeguranca" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'Cortesia',
    "tipoRodizio" TEXT,
    "valorRodizio" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "possuiBebida" BOOLEAN NOT NULL DEFAULT false,
    "valorBebida" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "qtdBebida" INTEGER NOT NULL DEFAULT 0,
    "tipoBebida" TEXT,
    "possuiSobremesa" BOOLEAN NOT NULL DEFAULT false,
    "valorSobremesa" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "qtdSobremesa" INTEGER NOT NULL DEFAULT 0,
    "tipoSobremesa" TEXT,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "valorTotal" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "dataValidade" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "formaPagamento" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nomeCliente" TEXT,
    "telefoneCliente" TEXT,
    "cpfCliente" TEXT,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clientes_empresaId_idx" ON "clientes"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "fila_config_dia_empresaId_dataConfig_key" ON "fila_config_dia"("empresaId", "dataConfig");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_mensais_empresaId_mes_ano_key" ON "pagamentos_mensais"("empresaId", "mes", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_codigoVoucher_key" ON "vouchers"("codigoVoucher");

-- CreateIndex
CREATE INDEX "vouchers_empresaId_idx" ON "vouchers"("empresaId");

-- AddForeignKey
ALTER TABLE "login" ADD CONSTRAINT "login_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bebidas_cadastro" ADD CONSTRAINT "bebidas_cadastro_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_espera" ADD CONSTRAINT "fila_espera_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_config_dia" ADD CONSTRAINT "fila_config_dia_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_cardapios" ADD CONSTRAINT "menu_cardapios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categorias" ADD CONSTRAINT "menu_categorias_cardapioId_fkey" FOREIGN KEY ("cardapioId") REFERENCES "menu_cardapios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_produtos" ADD CONSTRAINT "menu_produtos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_produtos" ADD CONSTRAINT "menu_produtos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "menu_categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_mensais" ADD CONSTRAINT "pagamentos_mensais_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preco_rodizio" ADD CONSTRAINT "preco_rodizio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
