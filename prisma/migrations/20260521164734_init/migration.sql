-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "did" TEXT NOT NULL,
    "name" TEXT,
    "phiMagnitude" REAL NOT NULL DEFAULT 0,
    "phiPhase" REAL NOT NULL DEFAULT 0,
    "reputation" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "amount" REAL NOT NULL,
    "phiMagnitude" REAL NOT NULL DEFAULT 0,
    "phiPhase" REAL NOT NULL DEFAULT 0,
    "ownerDid" TEXT NOT NULL,
    "offerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Token_ownerDid_fkey" FOREIGN KEY ("ownerDid") REFERENCES "Agent" ("did") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offererDid" TEXT NOT NULL,
    "receiverDid" TEXT,
    "offerTokenType" TEXT NOT NULL,
    "offerAmount" REAL NOT NULL,
    "reqTokenType" TEXT NOT NULL,
    "reqAmount" REAL NOT NULL,
    "phiDiff" REAL,
    "jitterImpact" REAL,
    "gatewayLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "expiresAt" DATETIME NOT NULL,
    "activityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Offer_offererDid_fkey" FOREIGN KEY ("offererDid") REFERENCES "Agent" ("did") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Offer_receiverDid_fkey" FOREIGN KEY ("receiverDid") REFERENCES "Agent" ("did") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromDid" TEXT NOT NULL,
    "toDid" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "phiBefore" REAL,
    "phiAfter" REAL,
    "zkProofHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_did_key" ON "Agent"("did");
