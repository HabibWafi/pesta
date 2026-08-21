import { PrismaClient } from "@prisma/client";

// Support Hostinger individual DB environment variables (DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME)
if (!process.env.DATABASE_URL && process.env.DB_USER && process.env.DB_NAME) {
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASS || "";
  const host = process.env.DB_HOST || "127.0.0.1";
  const port = process.env.DB_PORT || "3306";
  const dbName = process.env.DB_NAME;
  
  process.env.DATABASE_URL = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${dbName}`;
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
