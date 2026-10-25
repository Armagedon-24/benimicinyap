import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    select: { fullName: true, walletBalance: true, escrowBalance: true, role: true },
  });
  console.log("=== USERS ===");
  users.forEach((u) =>
    console.log(
      `${u.fullName.padEnd(18)} cüzdan=${u.walletBalance.toFixed(2).padStart(9)}₺  escrow=${u.escrowBalance.toFixed(2).padStart(9)}₺  (${u.role})`
    )
  );

  const tasks = await db.task.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      title: true, fee: true, status: true, requesterId: true, assignedToId: true,
      aiCheckVerdict: true, aiCheckScore: true,
    },
  });
  console.log("\n=== SON GÖREVLER ===");
  tasks.forEach((t) =>
    console.log(
      `${t.title.slice(0, 42).padEnd(44)} ${String(t.fee).padStart(7)}₺  durum=${t.status.padEnd(12)} ai=${t.aiCheckVerdict ?? "-"}${t.aiCheckScore !== null && t.aiCheckScore !== undefined ? `(%${Math.round(t.aiCheckScore)})` : ""}`
    )
  );

  const txns = await db.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 14,
    include: { user: { select: { fullName: true } } },
  });
  console.log("\n=== SON İŞLEMLER ===");
  txns.forEach((t) =>
    console.log(
      `${(t.user?.fullName ?? "?").padEnd(18)} ${t.type.padEnd(20)} ${String(t.amount).padStart(9)}₺ fee=${String(t.platformFee).padStart(6)}₺  ${t.taskTitle.slice(0, 40)}`
    )
  );

  const settings = await db.platformSetting.findMany({ where: { group: "commission" } });
  console.log("\n=== KOMİSYON AYARLARI ===");
  settings.forEach((s) => console.log(`${s.key.padEnd(20)} = ${s.value}`));

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
