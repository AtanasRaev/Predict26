import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const prisma = createClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME || "admin";
  const password = process.env.SEED_ADMIN_PASSWORD || "changeme123";
  const firstName = process.env.SEED_ADMIN_FIRST_NAME || "Admin";
  const lastName = process.env.SEED_ADMIN_LAST_NAME || "User";

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`User '${username}' already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, firstName, lastName, passwordHash, role: "ADMIN" },
  });

  console.log(`✓ Created admin user: ${user.username} (${user.id})`);
  console.log(`  Password: ${password}`);
  console.log(`  ⚠️  Change this password after first login!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
