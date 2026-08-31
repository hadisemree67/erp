const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    try {
        const hashedPassword = await bcrypt.hash('deneme1', 12);
        
        // 1. ERP Yöneticisi (users tablosu)
        const adminExists = await prisma.users.findUnique({ where: { username: 'deneme' }});
        if (adminExists) {
            await prisma.users.update({
                where: { username: 'deneme' },
                data: { password: hashedPassword, role: 'manager' }
            });
            console.log('ERP yöneticisi güncellendi.');
        } else {
            await prisma.users.create({
                data: {
                    username: 'deneme',
                    name: 'Deneme Yönetici',
                    email: 'admin@deneme.com',
                    password: hashedPassword,
                    role: 'manager'
                }
            });
            console.log('ERP yöneticisi oluşturuldu.');
        }

        // 2. Web Sitesi Müşterisi (customers tablosu)
        // prisma.customers schema'sında Email field var mı bakalım, yes unique değil ama var.
        const customers = await prisma.customers.findMany({ where: { Email: 'deneme' }});
        if (customers.length > 0) {
            await prisma.customers.update({
                where: { Id: customers[0].Id },
                data: { Password: hashedPassword, IsVerified: true }
            });
            console.log('Web müşterisi güncellendi.');
        } else {
            await prisma.customers.create({
                data: {
                    CustomerName: 'Deneme Müşteri',
                    Email: 'deneme',
                    Password: hashedPassword,
                    IsVerified: true
                }
            });
            console.log('Web müşterisi oluşturuldu.');
        }

        console.log('İşlem başarıyla tamamlandı!');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
