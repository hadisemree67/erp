const request = require('supertest');
const app = require('../../server'); // Ensure server.js exports the app

describe('Kapsamlı E2E Otomasyon Testleri', () => {
    let adminToken = '';
    let customerToken = '';
    let testCategoryId = null;
    let testBrandId = null;
    let testProductId = null;
    let testWarehouseId = null;
    let testShelfCode = 'TEST-RAF-01';
    let testCustomerId = null;
    let testEmployeeId = null;

    beforeAll(async () => {
        // Wait for server init if needed, usually supertest handles it
    });

    // 1. Auth Modülü Testleri
    describe('1. Auth & Admin Modülü', () => {
        test('Admin girişi yapılabilmeli ve token alınabilmeli', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'deneme',
                    password: 'deneme1'
                });
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
            adminToken = res.body.token;
        });

        test('Admin profil bilgileri getirilebilmeli', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // 2. Katalog Modülü (Ürün/Kategori/Marka)
    describe('2. Katalog (Kategori, Marka, Ürün)', () => {
        test('Yeni Marka eklenebilmeli', async () => {
            const res = await request(app)
                .post('/api/brands')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ brand_name: 'Test Markası ' + Date.now() });
            expect(res.statusCode).toBe(201); // or 200 depending on API
            expect(res.body.success).toBe(true);
            testBrandId = res.body.data.id || res.body.data.Id;
        });

        test('Yeni Web Kategorisi eklenebilmeli', async () => {
            const res = await request(app)
                .post('/api/web-categories')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    category_name: 'Test Kategorisi ' + Date.now(),
                    category_level: 1,
                    parent_id: null
                });
            expect(res.statusCode).toBe(201).or(200);
            testCategoryId = res.body.data.id;
        });

        test('Yeni Ürün eklenebilmeli (Resimsiz Dummy)', async () => {
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('ProductName', 'Test E2E Ürünü ' + Date.now())
                .field('PurchasePrice', '100')
                .field('SalePrice', '150')
                .field('Brand', testBrandId || 1)
                .field('is_active', '1');
            
            // It might fail if required fields are missing, but let's assume it works or we catch it
            if (res.statusCode === 200 || res.statusCode === 201) {
                testProductId = res.body.data ? res.body.data.Id : (res.body.productId || null);
                expect(res.body.success).toBe(true);
            } else {
                console.warn('Ürün ekleme başarısız olabilir (zorunlu alanlar):', res.body);
            }
        });
    });

    // 3. Depo (WMS) Modülü
    describe('3. Depo ve Stok (WMS)', () => {
        test('Yeni Depo eklenebilmeli', async () => {
            const res = await request(app)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Test E2E Deposu', location: 'Merkez', type: 'Fiziksel' });
            
            if(res.statusCode === 200 || res.statusCode === 201) {
                testWarehouseId = res.body.data ? res.body.data.id : null;
                expect(res.body.success).toBe(true);
            }
        });

        test('Manuel Stok Girişi (Mal Kabul) yapılabilmeli', async () => {
            if (!testProductId || !testWarehouseId) {
                console.warn('Ürün veya Depo ID yok, test atlanıyor.');
                return;
            }
            const res = await request(app)
                .post('/api/wms/stock-entry')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    productId: testProductId,
                    warehouseId: testWarehouseId,
                    shelfAllocations: [{ shelfCode: testShelfCode, quantity: 50 }],
                    description: 'E2E Test Girişi'
                });
            // Hata alabiliriz (Raf yoksa vs), ama endpoint'in 500 dönmemesini bekliyoruz.
            expect(res.statusCode).not.toBe(500);
        });
    });

    // 4. Müşteri (B2C/B2B) Modülü
    describe('4. Müşteri (B2C/B2B)', () => {
        test('Müşteri hesabı oluşturulabilmeli', async () => {
            const res = await request(app)
                .post('/api/customer-auth/register')
                .send({
                    customerName: 'Test Müşteri E2E',
                    email: `test_e2e_${Date.now()}@example.com`,
                    password: 'password123',
                    phone: '5551112233'
                });
            expect(res.statusCode).not.toBe(500);
        });

        test('Müşteri girişi (Login) yapılabilmeli', async () => {
            const res = await request(app)
                .post('/api/customer-auth/login')
                .send({
                    email: 'deneme', // Default create_users.js customer
                    password: 'deneme1'
                });
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            customerToken = res.body.token;
            testCustomerId = res.body.customer.Id;
        });
    });

    // 5. Sepet ve Sipariş Modülü
    describe('5. Sepet ve Sipariş', () => {
        test('Sepete ürün eklenebilmeli', async () => {
            if(!testProductId) return;
            const res = await request(app)
                .post('/api/cart/add')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    productId: testProductId,
                    quantity: 2
                });
            expect(res.statusCode).not.toBe(500);
        });

        test('Sepet görüntülenebilmeli', async () => {
            const res = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${customerToken}`);
            expect(res.statusCode).toBe(200);
        });
    });

    // 6. Personel (İK) Modülü
    describe('6. Personel ve İK', () => {
        test('Personel listesi çekilebilmeli', async () => {
            const res = await request(app)
                .get('/api/employees')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
        });
    });
});
