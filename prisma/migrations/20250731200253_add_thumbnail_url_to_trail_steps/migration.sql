-- DropForeignKey
ALTER TABLE "TrailStep" DROP CONSTRAINT "TrailStep_trailId_fkey";

-- AlterTable
ALTER TABLE "Trail" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "suggestedInvestment" DOUBLE PRECISION,
ADD COLUMN     "thumbnailUrl" TEXT,
ADD COLUMN     "trailCurrency" TEXT DEFAULT 'USD',
ADD COLUMN     "trailValue" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "TrailStep" ADD COLUMN     "source" TEXT,
ADD COLUMN     "thumbnailUrl" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'article';

-- AddForeignKey
ALTER TABLE "TrailStep" ADD CONSTRAINT "TrailStep_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
