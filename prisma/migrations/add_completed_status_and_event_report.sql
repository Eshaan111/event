-- Migration: Add COMPLETED status to ProposalStatus enum + create EventReport table
-- Run with: psql $DATABASE_URL -f prisma/migrations/add_completed_status_and_event_report.sql
-- (or use: prisma db push after updating schema.prisma)

-- 1. Add COMPLETED to the ProposalStatus enum
ALTER TYPE "ProposalStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

-- 2. Create the EventReport table
CREATE TABLE IF NOT EXISTS "EventReport" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid(),
  "proposalId"       TEXT NOT NULL,
  "actualDate"       TIMESTAMP(3),
  "actualLocation"   TEXT,
  "actualSpend"      INTEGER,
  "signedUpCount"    INTEGER,
  "actualAttendance" INTEGER,
  "summary"          TEXT,
  "highlights"       TEXT,
  "challenges"       TEXT,
  "internalRating"   INTEGER,
  "reportedById"     TEXT,
  "reportedByName"   TEXT NOT NULL DEFAULT 'Unknown',
  "receipts"         JSONB,
  "media"            JSONB,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EventReport_pkey" PRIMARY KEY ("id")
);

-- 3. Unique constraint: one report per proposal
CREATE UNIQUE INDEX IF NOT EXISTS "EventReport_proposalId_key"
  ON "EventReport"("proposalId");

-- 4. Foreign key: proposal
ALTER TABLE "EventReport"
  ADD CONSTRAINT "EventReport_proposalId_fkey"
  FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Foreign key: reportedBy (User)
ALTER TABLE "EventReport"
  ADD CONSTRAINT "EventReport_reportedById_fkey"
  FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Add file-upload columns (safe to run even if table already exists from earlier migration)
ALTER TABLE "EventReport"
  ADD COLUMN IF NOT EXISTS "receipts" JSONB,
  ADD COLUMN IF NOT EXISTS "media"    JSONB;
