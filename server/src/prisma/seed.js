import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = ["Cameras", "Lighting", "Audio", "Costumes", "Stage Props", "Recording"];

const ASSETS = [
  { name: "Canon EOS 90D DSLR", category: "Cameras", qty: 5, description: "32.5MP APS-C DSLR with 4K video." },
  { name: "Sony A7 III Mirrorless", category: "Cameras", qty: 3, description: "Full-frame mirrorless body." },
  { name: "Godox SL-60W LED Light", category: "Lighting", qty: 8, description: "60W daylight-balanced COB LED." },
  { name: "Softbox 80cm", category: "Lighting", qty: 6, description: "Octagon softbox light modifier." },
  { name: "Shure SM7B Microphone", category: "Audio", qty: 4, description: "Dynamic vocal microphone." },
  { name: "Yamaha MG10XU Mixer", category: "Audio", qty: 2, description: "10-channel analog mixer with FX." },
  { name: "Traditional Kathak Costume", category: "Costumes", qty: 10, description: "Full classical dance attire." },
  { name: "Royal Throne Prop", category: "Stage Props", qty: 1, description: "Decorative wooden throne." },
  { name: "Zoom H6 Field Recorder", category: "Recording", qty: 3, description: "6-track portable recorder." },
  { name: "DJI Wireless Mic Kit", category: "Recording", qty: 4, description: "Compact wireless lav system." },
];

async function main() {
  console.log("Seeding database...");

  // --- Users ---
  const adminPass = await bcrypt.hash("Admin@123", 10);
  const userPass = await bcrypt.hash("User@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@culturalcouncil.in" },
    update: {},
    create: {
      name: "Council Admin",
      email: "admin@culturalcouncil.in",
      passwordHash: adminPass,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "member@culturalcouncil.in" },
    update: {},
    create: {
      name: "Section Member",
      email: "member@culturalcouncil.in",
      passwordHash: userPass,
      role: "user",
    },
  });

  // --- Categories ---
  const categoryMap = {};
  for (const name of CATEGORIES) {
    const c = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryMap[name] = c.id;
  }

  // --- Assets (only seed if none exist, to stay idempotent) ---
  const existing = await prisma.asset.count();
  if (existing === 0) {
    for (const a of ASSETS) {
      await prisma.asset.create({
        data: {
          name: a.name,
          categoryId: categoryMap[a.category],
          description: a.description,
          quantityTotal: a.qty,
          quantityAvailable: a.qty,
          status: "active",
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("  Admin login:  admin@culturalcouncil.in / Admin@123");
  console.log("  User login:   member@culturalcouncil.in / User@123");
  console.log(`  Seeded by admin id: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
