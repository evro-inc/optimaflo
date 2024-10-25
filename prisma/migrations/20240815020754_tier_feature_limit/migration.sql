-- CreateTable
CREATE TABLE "TierFeatureLimit" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "createLimit" INTEGER NOT NULL,
    "updateLimit" INTEGER NOT NULL,
    "deleteLimit" INTEGER NOT NULL,

    CONSTRAINT "TierFeatureLimit_pkey" PRIMARY KEY ("id")
);
