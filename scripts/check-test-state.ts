import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const ids = ["cmvnl9pke001otw7ahuip7ozy", "cmvnl9z2j002dtw7amktj4mlq", "cmvnlaaol002xtw7av327cutc"];

async function main() {
  const tasks = await p.task.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, status: true, fee: true, evidencePhoto: true, aiCheckVerdict: true, aiCheckScore: true },
  });
  for (const t of tasks) {
    console.log(JSON.stringify({
      id: t.id.slice(-6), status: t.status, fee: t.fee,
      v: t.aiCheckVerdict, s: t.aiCheckScore,
      photo: (t.evidencePhoto || "").slice(0, 55),
    }));
  }

  const users = await p.user.findMany({ where: { id: { in: ["user-elif", "user-mehmet", "user-admin"] } }, select: { id: true, walletBalance: true, escrowBalance: true } });
  for (const u of users) console.log(`user ${u.id}: wallet=${u.walletBalance} escrow=${u.escrowBalance}`);

  const txs = await p.transaction.findMany({
    where: { taskId: { in: ids } },
    orderBy: { createdAt: "asc" },
    select: { userId: true, taskId: true, type: true, amount: true, platformFee: true },
  });
  for (const t of txs) console.log(`tx task=..${t.taskId?.slice(-6)} user=${t.userId} ${t.type} amount=${t.amount} fee=${t.platformFee}`);
}

main().finally(() => p.$disconnect());
