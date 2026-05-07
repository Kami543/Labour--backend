/*
  Warnings:

  - Changed the type of `enderecoEntrega` on the `pedidos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `endereco` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "pedidos" DROP COLUMN "enderecoEntrega",
ADD COLUMN     "enderecoEntrega" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "endereco",
ADD COLUMN     "endereco" JSONB NOT NULL;
