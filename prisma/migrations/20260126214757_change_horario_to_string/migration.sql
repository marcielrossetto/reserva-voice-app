/*
  Warnings:

  - Changed the type of `horario` on the `clientes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "clientes" DROP COLUMN "horario",
ADD COLUMN     "horario" VARCHAR(8) NOT NULL;
