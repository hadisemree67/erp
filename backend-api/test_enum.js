const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const order = await prisma.orders.findFirst({
            orderBy: { Id: 'desc' }
        });
        
        if (order) {
            console.log("Current status:", order.OrderStatus);
            const newOrder = await prisma.orders.create({
                data: {
                    CustomerId: 1,
                    OrderNumber: 'TEST-' + Date.now(),
                    TotalAmount: 0,
                    OrderStatus: 'ptal_Edildi'
                }
            });
            console.log("Created successfully:", newOrder.OrderStatus);
            await prisma.orders.delete({ where: { Id: newOrder.Id } });
        }
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
