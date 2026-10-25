// Financial state snapshot: users' balances, transactions, settings
import { db } from "../src/lib/db";

async function main() {
  const users = await db.user.findMany({
    select: { id: true, email: true, fullName: true, walletBalance: true, escrowBalance: true, completedTasksCount: true },
  });
  console.log("=== USERS ===");
  users.forEach((u) =>
    console.log(`${u.email.padEnd(35)} wallet=${String(u.walletBalance).padStart(8)} escrow=${String(u.escrowBalance).padStart(6)} done=${u.completedTasksCount}`)
  );
  const txns = await db.transaction.count();
  const platformTotal = await db.transaction.aggregate({ where: { type: "platform_commission" }, _sum: { amount: true } });
  console.log(`=== txn count=${txns}, platform_commission total=${platformTotal._sum.amount ?? 0} ===`);
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
