/*
  Warnings:

  - Changed the type of `horario` on the `clientes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
ALTER TABLE "clientes" DROP COLUMN "horario",
ADD COLUMN     "horario" VARCHAR(8) NOT NULL;
*/
-- AlterTable

-- AlterTable
ALTER TABLE "clientes" ALTER COLUMN "horario" TYPE VARCHAR(8) USING TO_CHAR("horario", 'HH24:MI:SS');