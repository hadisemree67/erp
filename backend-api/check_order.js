const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const order = await prisma.orders.findUnique({ where: { Id: 56 }});
    console.log(order);
}
main().finally(() => prisma.$disconnect());
