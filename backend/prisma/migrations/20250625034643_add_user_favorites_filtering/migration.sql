/*
  Warnings:

  - Added the required column `updatedAt` to the `user_preferences` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "user_dashboard_filters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "categories" TEXT,
    "sources" TEXT,
    "frequencies" TEXT,
    "showFavoritesOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_dashboard_filters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analytics_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "engineType" TEXT NOT NULL,
    "calculationDate" DATETIME NOT NULL,
    "score" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "indicator_correlations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicator1Id" TEXT NOT NULL,
    "indicator2Id" TEXT NOT NULL,
    "correlationCoefficient" REAL NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "calculationDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "indicator_correlations_indicator1Id_fkey" FOREIGN KEY ("indicator1Id") REFERENCES "economic_indicators" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "indicator_correlations_indicator2Id_fkey" FOREIGN KEY ("indicator2Id") REFERENCES "economic_indicators" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "alertEnabled" BOOLEAN NOT NULL DEFAULT false,
    "alertThreshold" REAL,
    "displayOrder" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_preferences_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "economic_indicators" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_preferences" ("alertEnabled", "alertThreshold", "createdAt", "id", "indicatorId", "userId") SELECT "alertEnabled", "alertThreshold", "createdAt", "id", "indicatorId", "userId" FROM "user_preferences";
DROP TABLE "user_preferences";
ALTER TABLE "new_user_preferences" RENAME TO "user_preferences";
CREATE UNIQUE INDEX "user_preferences_userId_indicatorId_key" ON "user_preferences"("userId", "indicatorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "user_dashboard_filters_userId_key" ON "user_dashboard_filters"("userId");

-- CreateIndex
CREATE INDEX "analytics_results_engineType_calculationDate_idx" ON "analytics_results"("engineType", "calculationDate");

-- CreateIndex
CREATE UNIQUE INDEX "indicator_correlations_indicator1Id_indicator2Id_windowDays_calculationDate_key" ON "indicator_correlations"("indicator1Id", "indicator2Id", "windowDays", "calculationDate");
