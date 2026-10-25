// Reset the local SQLite database and re-seed with current app seed data.
// Uses the same clearStore/initStore logic defined in src/lib/db.ts
import { db, clearStore, initStore } from "../src/lib/db";

async function main() {
  console.log("Clearing database...");
  await clearStore();
  console.log("Seeding database with current seed data...");
  await initStore();
  const users = await db.user.count();
  const tasks = await db.task.count();
  const settings = await db.platformSetting.count();
  console.log(`Done. users=${users} tasks=${tasks} settings=${settings}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
