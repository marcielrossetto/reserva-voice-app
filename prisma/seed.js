const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash("admin123", 10);

  const empresa = await prisma.empresa.create({
    data: {
      nomeEmpresa: "Rossetto TI",
      cnpjCpf: "00.000.000/0001-00",
      dataExpiracao: new Date("2099-12-31"),
      statusPagamento: 1
    }
  });

  await prisma.usuario.create({
    data: {
      empresaId: empresa.id,
      nome: "Marciel Rossetto",
      email: "admin@rossettoti.com.br",
      senha: senhaHash,
      nivel: "master"
    }
  });

  console.log("✅ Empresa e usuário MASTER criados");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
