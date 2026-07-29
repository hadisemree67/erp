/**
 * ============================================================================
 * DOSYA ADI: emailService.js
 * MODÜL / KATMAN: Arkayüz Servisi (Service) - E-Posta Bildirim Sistemi
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistem içindeki otomatik bilgilendirmeleri, kritik stok uyarılarını, satın alma onay bildirimlerini ve kullanıcı şifre sıfırlama e-postalarını göndermekten sorumlu servis katmanıdır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - Nodemailer / SMTP Entegrasyonu, Asenkron İletişim
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Rotalar (Routes) ve arka plan görevleri tarafından tetiklenerek dış dünyaya e-posta iletir.
 * ============================================================================
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter using SMTP details from .env, or use ethereal for testing if not set
const getTransporter = async () => {
    require('dotenv').config(); // re-load env in case it changed
    const host = process.env.SMTP_HOST || (process.env.SMTP_USER && process.env.SMTP_USER.includes('gmail.com') ? 'smtp.gmail.com' : null);
    
    if (host && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: host,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT == 465, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    } else {
        // Fallback to testing account
        console.log("No SMTP settings found in .env, using Ethereal email for testing.");
        let testAccount = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }
};

const sendLowStockEmail = async (supplier, product, requestToken) => {
    try {
        const transporter = await getTransporter();
        const approvalLink = `http://localhost:3000/api/supplier-approval/${requestToken}`;

        const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0f172a; padding: 20px; text-align: center;">
                <h2 style="color: white; margin: 0;">Otomatik Sipariş Talebi</h2>
            </div>
            <div style="padding: 20px; background-color: #f8fafc;">
                <p style="color: #334155; font-size: 16px;">Sayın <strong>${supplier.ContactPerson || supplier.SupplierName}</strong>,</p>
                <p style="color: #334155; font-size: 16px;">Sistemimizde stok seviyesi kritik noktaya düşen aşağıdaki ürün için otomatik satın alma talebi oluşturulmuştur:</p>
                
                <div style="background-color: white; padding: 15px; border-radius: 6px; border: 1px solid #cbd5e1; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #0f172a;">${product.ProductName}</h3>
                    <ul style="color: #475569; padding-left: 20px;">
                        <li><strong>Mevcut Stok:</strong> ${product.StockQuantity} ${product.unit_type}</li>
                        <li><strong>Kritik Seviye:</strong> ${product.critical_stock_level} ${product.unit_type}</li>
                        <li><strong>Birim Fiyat:</strong> ${product.PurchasePrice} ₺</li>
                    </ul>
                </div>

                <p style="color: #334155; font-size: 16px;">Lütfen bu siparişi onaylamak ve işleme almak için aşağıdaki butona tıklayınız:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${approvalLink}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Siparişi Onayla</a>
                </div>

                <p style="color: #94a3b8; font-size: 12px; text-align: center;">Bu e-posta otonom ERP sistemi tarafından otomatik olarak gönderilmiştir.</p>
            </div>
        </div>
        `;

        const info = await transporter.sendMail({
            from: `"Stok ERP Sistemi" <${process.env.SMTP_USER || 'erp@example.com'}>`,
            to: supplier.Email,
            subject: `ACİL SİPARİŞ ONAYI: ${product.ProductName}`,
            html: htmlContent,
        });

        console.log("Email sent: %s", info.messageId);
        if (!process.env.SMTP_HOST) {
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
        
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
};

const sendMachineMaintenanceReminderEmail = async (machine) => {
    try {
        if (!machine.supplier_email) return false;
        const transporter = await getTransporter();

        const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0f172a; padding: 20px; text-align: center;">
                <h2 style="color: white; margin: 0;">Makine Periyodik Bakım Hatırlatması</h2>
            </div>
            <div style="padding: 20px; background-color: #f8fafc;">
                <p style="color: #334155; font-size: 16px;">Sayın <strong>${machine.supplier_name || 'Yetkili / Bakımcı'}</strong>,</p>
                <p style="color: #334155; font-size: 16px;">İşletmemizde bulunan aşağıdaki makinenin periyodik bakım zamanı yaklaşmıştır:</p>
                
                <div style="background-color: white; padding: 15px; border-radius: 6px; border: 1px solid #cbd5e1; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #0f172a;">${machine.name}</h3>
                    <ul style="color: #475569; padding-left: 20px;">
                        <li><strong>Makine Kodu:</strong> ${machine.machine_code || 'Belirtilmemiş'}</li>
                        <li><strong>Son Bakım Tarihi:</strong> ${machine.last_maintenance ? new Date(machine.last_maintenance).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</li>
                        <li><strong>Planlanan Bakım Tarihi:</strong> ${machine.next_maintenance ? new Date(machine.next_maintenance).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</li>
                        <li><strong>Bakım Periyodu:</strong> ${machine.maintenance_period_months || 12} Ay</li>
                    </ul>
                </div>

                <p style="color: #334155; font-size: 16px;">Makinenin iş sürekliliğini aksatmaması adına, belirtilen tarihte bakım randevusu oluşturmanızı ve tesisimizi ziyaret etmenizi rica ederiz.</p>
                
                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px;">Bu e-posta otonom ERP sistemi tarafından otomatik olarak gönderilmiştir.</p>
            </div>
        </div>
        `;

        const info = await transporter.sendMail({
            from: `"Stok ERP Sistemi" <${process.env.SMTP_USER || 'erp@example.com'}>`,
            to: machine.supplier_email,
            subject: `BAKIM ZAMANI HATIRLATMASI: ${machine.name}`,
            html: htmlContent,
        });

        console.log("Maintenance email sent: %s", info.messageId);
        if (!process.env.SMTP_HOST) {
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
        return true;
    } catch (error) {
        console.error("Error sending maintenance reminder email:", error);
        return false;
    }
};

const sendMachineBreakdownEmail = async (machine, issueDescription, reporterName) => {
    try {
        if (!machine.supplier_email) return false;
        const transporter = await getTransporter();

        const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ef4444; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #dc2626; padding: 20px; text-align: center;">
                <h2 style="color: white; margin: 0;">ACİL: MAKİNE ARIZA BİLDİRİMİ</h2>
            </div>
            <div style="padding: 20px; background-color: #fef2f2;">
                <p style="color: #7f1d1d; font-size: 16px;">Sayın <strong>${machine.supplier_name || 'Yetkili / Bakım Destek'}</strong>,</p>
                <p style="color: #7f1d1d; font-size: 16px;">İşletmemizde operasyon halinde olan makine için arıza / sorun bildirimi oluşturulmuştur:</p>
                
                <div style="background-color: white; padding: 15px; border-radius: 6px; border: 1px solid #fca5a5; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #991b1b;">${machine.name} (${machine.machine_code || 'Kod Yok'})</h3>
                    <p style="color: #b91c1c; font-weight: bold; margin-bottom: 5px;">Sorun Detayı / Arıza Açıklaması:</p>
                    <div style="background-color: #fef2f2; padding: 12px; border-left: 4px solid #dc2626; color: #7f1d1d;">
                        ${issueDescription || 'Açıklama girilmedi.'}
                    </div>
                    <ul style="color: #7f1d1d; padding-left: 20px; margin-top: 15px;">
                        <li><strong>Bildiren Personel:</strong> ${reporterName || 'Üretim Operatörü'}</li>
                        <li><strong>Bildirim Zamanı:</strong> ${new Date().toLocaleString('tr-TR')}</li>
                    </ul>
                </div>

                <p style="color: #7f1d1d; font-size: 16px;">Üretimin durmaması için konuyu acil olarak incelemenizi ve müdahale etmenizi rica ederiz.</p>
                
                <p style="color: #991b1b; font-size: 12px; text-align: center; margin-top: 30px;">Bu e-posta otonom ERP sistemi tarafından otomatik olarak oluşturulmuştur.</p>
            </div>
        </div>
        `;

        const info = await transporter.sendMail({
            from: `"Stok ERP Sistemi" <${process.env.SMTP_USER || 'erp@example.com'}>`,
            to: machine.supplier_email,
            subject: `🚨 ACİL ARIZA BİLDİRİMİ: ${machine.name}`,
            html: htmlContent,
        });

        console.log("Breakdown email sent: %s", info.messageId);
        if (!process.env.SMTP_HOST) {
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
        return true;
    } catch (error) {
        console.error("Error sending breakdown email:", error);
        return false;
    }
};

const sendLowBoxStockEmail = async (supplier, box) => {
    try {
        if (!supplier.Email) return false;
        
        const transporter = await getTransporter();

        const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0f172a; padding: 20px; text-align: center;">
                <h2 style="color: white; margin: 0;">Otomatik Kutu Sipariş Talebi</h2>
            </div>
            <div style="padding: 20px; background-color: #f8fafc;">
                <p style="color: #334155; font-size: 16px;">Sayın <strong>${supplier.ContactPerson || supplier.SupplierName}</strong>,</p>
                <p style="color: #334155; font-size: 16px;">Sistemimizde stok seviyesi kritik noktaya düşen aşağıdaki kargo kutusu için otomatik sipariş talebi oluşturulmuştur:</p>
                
                <div style="background-color: white; padding: 15px; border-radius: 6px; border: 1px solid #cbd5e1; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #0f172a;">${box.BoxName} (${box.Width}x${box.Height}x${box.Depth} cm)</h3>
                    <ul style="color: #475569; padding-left: 20px;">
                        <li><strong>Mevcut Stok:</strong> ${box.StockQuantity} Adet</li>
                        <li><strong>Kritik Seviye:</strong> ${box.MinStockLevel} Adet</li>
                        ${box.ContractNo ? `<li><strong>Sözleşme No:</strong> ${box.ContractNo}</li>` : ''}
                    </ul>
                </div>

                <p style="color: #334155; font-size: 16px;">Lütfen stoklarımıza bu kutudan en kısa sürede gönderim sağlayınız.</p>

                <p style="color: #94a3b8; font-size: 12px; text-align: center;">Bu e-posta otonom ERP sistemi tarafından otomatik olarak gönderilmiştir.</p>
            </div>
        </div>
        `;

        const info = await transporter.sendMail({
            from: `"Stok ERP Sistemi" <${process.env.SMTP_USER || 'erp@example.com'}>`,
            to: supplier.Email,
            subject: `ACİL KUTU SİPARİŞİ: ${box.BoxName}`,
            html: htmlContent,
        });

        console.log("Box email sent: %s", info.messageId);
        if (!process.env.SMTP_HOST) {
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
        
        return true;
    } catch (error) {
        console.error("Error sending box email:", error);
        return false;
    }
};

module.exports = {
    sendLowStockEmail,
    sendMachineMaintenanceReminderEmail,
    sendMachineBreakdownEmail,
    sendLowBoxStockEmail
};
