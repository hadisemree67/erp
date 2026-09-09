/**
 * ============================================================================
 * DOSYA ADI: orderNotifier.js
 * MODÜL / KATMAN: Arkayüz Yardımcısı (Utility) - Müşteri Bildirim Servisi
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sipariş aşama değişikliklerinde (Onaylandı, Hazırlandı, Paketlendi,
 *   Kargoya Verildi, Teslim Edildi, İptal Edildi) müşteriye canlı bildirim
 *   oluşturur ve customer_notifications tablosuna kaydeder.
 * ============================================================================
 */

const defaultDb = require('../db');

/**
 * Sipariş durum değişikliği için müşteriye bildirim gönderir.
 * @param {number} orderId - Sipariş ID
 * @param {string} status - Yeni durum (Onaylandı, Toplandı, Paketlendi, Kargoya Verildi, Teslim Edildi, vb.)
 * @param {object} [dbInstance] - İsteğe bağlı transaction connection nesnesi
 */
async function notifyCustomerOrderStatus(orderId, status, dbInstance = null) {
    const db = dbInstance || defaultDb;
    try {
        const [orders] = await db.query(
            'SELECT Id, CustomerId, OrderNumber, TrackingNumber, CargoBarcode FROM orders WHERE Id = ?',
            [orderId]
        );

        if (!orders || orders.length === 0) return;
        const order = orders[0];
        if (!order.CustomerId) return;

        const orderNo = order.OrderNumber || `#${order.Id}`;
        const tracking = order.TrackingNumber || order.CargoBarcode;

        let title = '';
        let message = '';

        switch (status) {
            case 'Onaylandı':
                title = 'Siparişiniz Onaylandı! ✅';
                message = `${orderNo} numaralı siparişiniz başarıyla onaylandı ve hazırlık aşamasına alındı.`;
                break;
            case 'Toplandı':
            case 'Hazır':
                title = 'Siparişiniz Hazırlandı! 📦';
                message = `${orderNo} numaralı siparişiniz depomuzda toplandı ve paketleme sırasına alındı.`;
                break;
            case 'Paketlendi':
                title = 'Siparişiniz Paketlendi! 🎁';
                message = `${orderNo} numaralı siparişiniz özenle paketlendi ve kargo firmasına teslim edilmeye hazır.`;
                break;
            case 'Kargoya Verildi':
                title = 'Siparişiniz Kargoya Verildi! 🚚';
                message = `${orderNo} numaralı siparişiniz kargo firmasına teslim edildi.${tracking ? ` Kargo Takip No: ${tracking}` : ''}`;
                break;
            case 'Teslim Edildi':
                title = 'Siparişiniz Teslim Edildi! 🎉';
                message = `${orderNo} numaralı siparişiniz başarıyla teslim edildi. Ürünlerinizi değerlendirmek için yorum yapabilirsiniz!`;
                break;
            case 'İptal':
            case 'İptal Edildi':
                title = 'Siparişiniz İptal Edildi ⚠️';
                message = `${orderNo} numaralı siparişiniz iptal edildi. İade süreci başlatılmıştır.`;
                break;
            default:
                return;
        }

        await db.query(`
            INSERT INTO customer_notifications (customer_id, type, title, message, link, is_read)
            VALUES (?, 'order', ?, ?, '/profilim?tab=orders', 0)
        `, [order.CustomerId, title, message]);

    } catch (err) {
        console.error(`[orderNotifier] Sipariş bildirimi oluşturulamadı (OrderId: ${orderId}, Status: ${status}):`, err.message);
    }
}

module.exports = { notifyCustomerOrderStatus };
