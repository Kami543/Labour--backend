/*
  Warnings:

  - You are about to drop the column `estoqueMinimo` on the `produtos` table. All the data in the column will be lost.
  - You are about to drop the column `reservado` on the `produtos` table. All the data in the column will be lost.
  - You are about to drop the `cores` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tamanhos` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "cores" DROP CONSTRAINT "cores_produtoId_fkey";

-- DropForeignKey
ALTER TABLE "tamanhos" DROP CONSTRAINT "tamanhos_produtoId_fkey";

-- AlterTable
ALTER TABLE "produtos" DROP COLUMN "estoqueMinimo",
DROP COLUMN "reservado",
ADD COLUMN     "cores" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "tamanhos" JSONB NOT NULL DEFAULT '[]';

-- DropTable
DROP TABLE "cores";

-- DropTable
DROP TABLE "tamanhos";
