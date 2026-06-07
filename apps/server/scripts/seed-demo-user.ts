import { ulid } from "ulid";
import { prisma } from "@/adapters/database";

// Seeds (idempotently) a demo user so you can log in without registering.
// Re-running resets the demo password to the known value below.
// Run with: bun run db:seed
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@todo.app";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "password123";

async function main() {
  const passwordHash = await Bun.password.hash(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: { id: ulid(), email: DEMO_EMAIL, passwordHash },
    update: { passwordHash },
  });
  console.log(`Seeded demo user: ${user.email} (id ${user.id})`);
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
