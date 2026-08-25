const prisma = require('./prisma');

async function test() {
    try {
        const newCoupon = await prisma.coupons.create({
            data: {
                code: 'TESTKUPON_' + Date.now(),
                discount_type: 'Percentage',
                discount_value: 10.0,
                minimum_order_amount: null,
                maximum_discount_amount: null,
                buy_quantity: null,
                free_quantity: null,
                gift_product_id: null,
                target_category: null,
                target_product_id: null,
                usage_limit: null,
                start_date: null,
                end_date: null,
                is_active: true,
                target_audience: 'all',
                target_customer_ids: [] // Empty array for json field
            }
        });
        console.log("BASARILI:", newCoupon);
    } catch (e) {
        console.error("HATA:", e);
    } finally {
        await prisma.$disconnect();
    }
}
test();
