/*
  Warnings:

  - A unique constraint covering the columns `[user_id,account_id,container_id,workspace_id]` on the table `gtm` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "gtm_user_id_account_id_container_id_workspace_id_key" ON "gtm"("user_id", "account_id", "container_id", "workspace_id");
