-- CreateTable
CREATE TABLE "TrailAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "data" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailAnalyticsEvent_pkey" PRIMARY KEY ("id")
);
