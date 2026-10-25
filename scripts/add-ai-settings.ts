import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const settings = [
    { id: "set-15", key: "ai_block_enabled", value: "true", label: "AI Skor Onay Engelleme Aktif", type: "boolean", group: "security" },
    { id: "set-16", key: "ai_block_threshold", value: "30", label: "AI Onay Engelleme Eşiği (% insan güveni)", type: "number", group: "security" },
  ];

  for (const s of settings) {
    const existing = await prisma.platformSetting.findUnique({ where: { key: s.key } });
    if (existing) {
      await prisma.platformSetting.update({
        where: { key: s.key },
        data: { value: s.value, label: s.label, type: s.type, group: s.group },
      });
      console.log(`updated: ${s.key} = ${s.value}`);
    } else {
      await prisma.platformSetting.create({ data: s });
      console.log(`created: ${s.key} = ${s.value}`);
    }
  }

  const count = await prisma.platformSetting.count();
  console.log(`platformSetting total: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
