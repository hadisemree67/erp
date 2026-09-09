const orderService = require('../services/orderService');

class OrderController {
    async getOrders(req, res) {
        try {
            const orders = await orderService.getOrders();
            res.json({ success: true, data: orders });
        } catch (err) {
            console.error('Siparişler çekilirken hata:', err);
            res.status(500).json({ success: false, message: 'Siparişler yüklenemedi.', error: err.message });
        }
    }

    async createOrder(req, res) {
        try {
            const result = await orderService.createOrder(req.body, req.user?.id);
            res.json({ 
                success: true, 
                message: result.msg, 
                orderId: result.orderId,
                autoProductionRequests: result.autoProductionRequests
            });
        } catch (err) {
            console.error('Sipariş oluşturulurken hata:', err);
            // Kendi fırlattığımız iş mantığı hatalarını 400 ile dön
            if (err.message.includes('Müşteri ve en az') || err.message.includes('zaten işleniyor') || err.message.includes('satışa kapalı') || err.message.includes('bulunamadı')) {
                return res.status(400).json({ success: false, message: err.message });
            }
            res.status(500).json({ success: false, message: 'Sipariş oluşturulurken bir hata meydana geldi. Error: ' + err.message });
        }
    }
}

module.exports = new OrderController();
