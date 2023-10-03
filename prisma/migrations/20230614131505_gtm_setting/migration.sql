-- CreateTable
CREATE TABLE "GTMSetting" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "container_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "GTMSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gtmSettingsUserId" ON "GTMSetting"("user_id");

-- AddForeignKey
ALTER TABLE "GTMSetting" ADD CONSTRAINT "GTMSetting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
