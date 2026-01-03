-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('applied', 'completed', 'reviewed', 'interview', 'hired', 'rejected');

-- CreateEnum
CREATE TYPE "RecruiterRole" AS ENUM ('admin', 'recruiter', 'viewer');

-- CreateTable
CREATE TABLE "Applicants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "resumeUrl" TEXT,
    "aiScore" DOUBLE PRECISION,
    "aiAnalysis" TEXT,
    "personalityData" JSONB,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'applied',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Applicants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recruiters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT,
    "role" "RecruiterRole" NOT NULL DEFAULT 'recruiter',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recruiters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationNotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicationId" UUID NOT NULL,
    "recruiterId" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationNotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Applicants_email_key" ON "Applicants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Recruiters_email_key" ON "Recruiters"("email");

-- AddForeignKey
ALTER TABLE "ApplicationNotes" ADD CONSTRAINT "ApplicationNotes_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Applicants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationNotes" ADD CONSTRAINT "ApplicationNotes_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;