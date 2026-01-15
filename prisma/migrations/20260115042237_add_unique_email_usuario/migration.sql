/*
  Warnings:

  - You are about to drop the column `senhaTexto` on the `login` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `login` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "login" DROP CONSTRAINT "login_empresaId_fkey";

-- AlterTable
ALTER TABLE "login" DROP COLUMN "senhaTexto",
ALTER COLUMN "nivel" DROP DEFAULT,
ALTER COLUMN "status" SET DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "login_email_key" ON "login"("email");

-- AddForeignKey
ALTER TABLE "login" ADD CONSTRAINT "login_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
