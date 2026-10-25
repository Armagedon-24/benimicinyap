import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const tasks = await db.task.findMany({
  select: { id: true, title: true, requesterId: true, assignedToId: true, status: true },
  take: 10,
});
console.log("TASKS:", JSON.stringify(tasks, null, 1));

const users = await db.user.findMany({
  select: { id: true, email: true, fullName: true, role: true },
});
console.log("USERS:", JSON.stringify(users, null, 1));

await db.$disconnect();
