/*
 * ÖZET:
 * Bu dosya (EInvoiceModal.jsx), Finansal hesaplar, e-fatura modalları ve genel bütçe göstergelerini içerir.
 */

import React from 'react';

const EInvoiceModal = ({ isOpen, onClose, invoiceData }) => {
    if (!isOpen || !invoiceData) return null;

    // Sayısal hesaplamalar - Eski veriler veya alan gelmediğinde subtitle içerisinden çıkar
    const rawReceived = Number(invoiceData.received_quantity);
    const rawOrdered = Number(invoiceData.quantity);
    let parsedQty = rawReceived > 0 ? rawReceived : rawOrdered;
    
    let parsedUnitPrice = Number(invoiceData.unit_price);
    let parsedUnitType = invoiceData.unit_type;

    if (!parsedQty && typeof invoiceData.subtitle === 'string') {
        const match = invoiceData.subtitle.match(/\(([\d,.]+)\s*([a-zA-ZğüşıöçĞÜŞİÖÇ]+)\s*[×xX]\s*([\d,.]+)\s*₺/);
        if (match) {
            if (!parsedQty || isNaN(parsedQty)) {
                parsedQty = Number(match[1].replace(/\./g, '').replace(',', '.'));
            }
            if (!parsedUnitType) {
                parsedUnitType = match[2];
            }
            if (!parsedUnitPrice || isNaN(parsedUnitPrice)) {
                parsedUnitPrice = Number(match[3].replace(/\./g, '').replace(',', '.'));
            }
        }
    }

    const qty = parsedQty || 1;
    
    const supplierPrice = Number(invoiceData.supplier_unit_price);
    const productPrice = Number(invoiceData.product_price);
    
    // Birim Fiyat (Öncelik: Siparişteki unit_price, sonra Tedarikçi Anlaşma Fiyatı, sonra Ürün PurchasePrice)
    const unitPrice = (parsedUnitPrice && parsedUnitPrice > 0) 
        ? parsedUnitPrice 
        : (supplierPrice > 0 ? supplierPrice : (productPrice > 0 ? productPrice : 0));
        
    const totalWithoutKDV = (invoiceData.total_price && Number(invoiceData.total_price) > 0 && Number(invoiceData.unit_price) > 0) 
        ? Number(invoiceData.total_price) 
        : (qty * unitPrice);
        
    const kdvRate = 20; // Standart %20 KDV
    const kdvAmount = totalWithoutKDV * (kdvRate / 100);
    const grandTotal = totalWithoutKDV + kdvAmount;

    // TL Formatter
    const formatTL = (num) => {
        return Number(num).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
    };

    // Tarih ve Saat Formatter
    const dateObj = invoiceData.date ? new Date(invoiceData.date) : new Date();
    const dateFormatted = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '-');
    const timeFormatted = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Deterministic ETTN (GUID benzeri) üretimi
    const generateETTN = (idStr) => {
        const seed = (idStr || '12345').toString();
        const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return `94C8053B-1611-4F7D-93BA-C6B01F3B${hash.toString(16).toUpperCase().padStart(4, '0')}`;
    };

    const ettn = generateETTN(invoiceData.raw_id || invoiceData.id);
    const faturaNo = `EPR202600000${(invoiceData.raw_id || invoiceData.id || 12).toString().replace(/[^0-9]/g, '').padStart(4, '0')}`;
    const productCode = invoiceData.product_code || `STK-${invoiceData.raw_id || '01'}`;

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div className="e-invoice-modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
            padding: '20px'
        }}>
            {/* CSS Print Styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    .e-invoice-print-wrapper, .e-invoice-print-wrapper * {
                        visibility: visible !important;
                    }
                    .e-invoice-print-wrapper {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 15px !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
                    }
                    .e-invoice-no-print {
                        display: none !important;
                    }
                }
            `}</style>

            {/* Üst Kontrol Barı (Yazdır / Kapat) - Çıktıda Görünmez */}
            <div className="e-invoice-no-print" style={{
                width: '100%',
                maxWidth: '880px',
                backgroundColor: '#0f172a',
                color: 'white',
                padding: '16px 24px',
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>GİB e-Fatura / Malzeme Kabul İrsaliyesi</h3>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Karşılıklı imzalayıp nüsha olarak saklayabilirsiniz.</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => window.print()}
                        style={{
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                            <rect x="6" y="14" width="12" height="8"></rect>
                        </svg>
                        Faturayı Yazdır (Çıktı Al)
                    </button>

                    <button
                        onClick={onClose}
                        style={{
                            backgroundColor: '#334155',
                            color: '#e2e8f0',
                            border: '1px solid #475569',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        ✖ Kapat
                    </button>
                </div>
            </div>

            {/* A4 Fatura Belge Alanı (Print Edilecek Alan) */}
            <div className="e-invoice-print-wrapper" style={{
                width: '100%',
                maxWidth: '880px',
                backgroundColor: 'white',
                color: '#000',
                padding: '40px',
                borderRadius: '0 0 12px 12px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                fontFamily: 'Arial, sans-serif',
                fontSize: '12px',
                lineHeight: '1.4'
            }}>
                {/* 1. Üst Başlık Bölümü (3 Sütun) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 240px', gap: '20px', marginBottom: '16px', borderBottom: '2px solid #000', paddingBottom: '16px' }}>
                    
                    {/* Sol Sütun: Firma & Cari Bilgileri */}
                    <div>
                        <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '4px 0', marginBottom: '12px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>FİRMA (STOK ERP SİSTEMLERİ)</div>
                            <div>Adres: Merkez Mah. Atatürk Cad. No: 1 OSB / İstanbul</div>
                            <div>VKN: 9876543210 | Vergi Dairesi: İKİTELLİ</div>
                        </div>

                        <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '4px 0' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>EFATURA CARİ (TEDARİKÇİ / MÜŞTERİ)</div>
                            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{invoiceData.supplier_name || 'GENEL TEDARİKÇİ VE TİCARET A.Ş.'}</div>
                            <div>Adres: {invoiceData.supplier_address || 'Atatürk Cad. Sanayi Sitesi 3. Blok No: 12 / İstanbul'}</div>
                            <div>VKN: 1111111111 | Vergi Dairesi: BÜYÜKMÜKELLEFLER</div>
                            <div style={{ marginTop: '4px', fontStyle: 'italic' }}>Teslimat Adresi: Fabrika Ana Depo / Tesellüm Kantarı</div>
                        </div>
                    </div>

                    {/* Orta Sütun: GİB Logo & e-Fatura ibaresi */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '10px' }}>
                        <div style={{ width: '70px', height: '70px', borderRadius: '50%', border: '3px solid #dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', position: 'relative' }}>
                            <span style={{ fontSize: '28px', fontWeight: '900', color: '#dc2626', fontStyle: 'italic', fontFamily: 'serif' }}>Gİ</span>
                        </div>
                        <div style={{ marginTop: '8px', fontWeight: 'bold', fontSize: '15px', color: '#dc2626', letterSpacing: '0.5px' }}>
                            e-Fatura
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b', textAlign: 'center', marginTop: '2px' }}>
                            T.C. Hazine ve Maliye Bakanlığı
                        </div>
                    </div>

                    {/* Sağ Sütun: QR Kod & Fatura Üst Bilgileri */}
                    <div>
                        {/* QR Kod Placeholder */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                            <div style={{ width: '100px', height: '100px', border: '1px solid #000', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
                                <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {/* Basit QR Desen Simülasyonu */}
                                    <rect x="5" y="5" width="28" height="28" fill="black" />
                                    <rect x="10" y="10" width="18" height="18" fill="white" />
                                    <rect x="14" y="14" width="10" height="10" fill="black" />
                                    <rect x="67" y="5" width="28" height="28" fill="black" />
                                    <rect x="72" y="10" width="18" height="18" fill="white" />
                                    <rect x="76" y="14" width="10" height="10" fill="black" />
                                    <rect x="5" y="67" width="28" height="28" fill="black" />
                                    <rect x="10" y="72" width="18" height="18" fill="white" />
                                    <rect x="14" y="76" width="10" height="10" fill="black" />
                                    <rect x="40" y="10" width="20" height="5" fill="black" />
                                    <rect x="40" y="20" width="5" height="15" fill="black" />
                                    <rect x="50" y="30" width="15" height="5" fill="black" />
                                    <rect x="40" y="45" width="20" height="10" fill="black" />
                                    <rect x="10" y="45" width="20" height="10" fill="black" />
                                    <rect x="70" y="45" width="20" height="10" fill="black" />
                                    <rect x="45" y="65" width="20" height="25" fill="black" />
                                    <rect x="75" y="75" width="15" height="15" fill="black" />
                                </svg>
                            </div>
                        </div>

                        {/* Metada Tablosu */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '11px' }}>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #000' }}>
                                    <td style={{ fontWeight: 'bold', padding: '3px 6px', borderRight: '1px solid #000', backgroundColor: '#f8fafc' }}>ÖZELLEŞTİRME NO:</td>
                                    <td style={{ padding: '3px 6px' }}>TR1.2</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #000' }}>
                                    <td style={{ fontWeight: 'bold', padding: '3px 6px', borderRight: '1px solid #000', backgroundColor: '#f8fafc' }}>FATURA TİPİ:</td>
                                    <td style={{ padding: '3px 6px' }}>SATIN ALMA / KABUL</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #000' }}>
                                    <td style={{ fontWeight: 'bold', padding: '3px 6px', borderRight: '1px solid #000', backgroundColor: '#f8fafc' }}>FATURA NO:</td>
                                    <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#0f172a' }}>{faturaNo}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #000' }}>
                                    <td style={{ fontWeight: 'bold', padding: '3px 6px', borderRight: '1px solid #000', backgroundColor: '#f8fafc' }}>FATURA TARİHİ:</td>
                                    <td style={{ padding: '3px 6px' }}>{dateFormatted}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #000' }}>
                                    <td style={{ fontWeight: 'bold', padding: '3px 6px', borderRight: '1px solid #000', backgroundColor: '#f8fafc' }}>FATURA ZAMANI:</td>
                                    <td style={{ padding: '3px 6px' }}>{timeFormatted}</td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 'bold', padding: '3px 6px', borderRight: '1px solid #000', backgroundColor: '#f8fafc' }}>SENARYO:</td>
                                    <td style={{ padding: '3px 6px' }}>TİCARİ İRSALİYE</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>

                {/* 2. ETTN Barı */}
                <div style={{ border: '1px solid #000', padding: '6px 12px', marginBottom: '16px', fontWeight: 'bold', backgroundColor: '#f8fafc', fontSize: '12px', letterSpacing: '0.5px' }}>
                    ETTN: {ettn}
                </div>

                {/* 3. Malzeme Tablosu */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '16px', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#e2e8f0', borderBottom: '2px solid #000' }}>
                            <th style={{ padding: '8px', borderRight: '1px solid #000', width: '30px', textAlign: 'center' }}>#</th>
                            <th style={{ padding: '8px', borderRight: '1px solid #000', width: '90px' }}>Stok Kodu</th>
                            <th style={{ padding: '8px', borderRight: '1px solid #000' }}>Mal / Hizmet</th>
                            <th style={{ padding: '8px', borderRight: '1px solid #000', width: '80px', textAlign: 'center' }}>Miktar</th>
                            <th style={{ padding: '8px', borderRight: '1px solid #000', width: '90px', textAlign: 'right' }}>Birim Fiyat</th>
                            <th style={{ padding: '8px', borderRight: '1px solid #000', width: '60px', textAlign: 'center' }}>KDV</th>
                            <th style={{ padding: '8px', borderRight: '1px solid #000', width: '90px', textAlign: 'right' }}>KDV Tutar</th>
                            <th style={{ padding: '8px', borderRight: '1px solid #000', width: '70px', textAlign: 'center' }}>Vergiler</th>
                            <th style={{ padding: '8px', width: '100px', textAlign: 'right' }}>Tutar</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ borderBottom: '1px solid #000' }}>
                            <td style={{ padding: '10px 8px', borderRight: '1px solid #000', textAlign: 'center' }}>1</td>
                            <td style={{ padding: '10px 8px', borderRight: '1px solid #000', fontWeight: 'bold' }}>{productCode}</td>
                            <td style={{ padding: '10px 8px', borderRight: '1px solid #000', fontWeight: 'bold', color: '#0f172a' }}>
                                {invoiceData.title || invoiceData.product_name || 'Tedarik Edilen Malzeme'}
                                {invoiceData.subtitle && (
                                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'normal', marginTop: '2px' }}>
                                        {invoiceData.subtitle}
                                    </div>
                                )}
                            </td>
                            <td style={{ padding: '10px 8px', borderRight: '1px solid #000', textAlign: 'center', fontWeight: 'bold' }}>
                                {qty} {parsedUnitType || invoiceData.unit_type || 'Adet'}
                            </td>
                            <td style={{ padding: '10px 8px', borderRight: '1px solid #000', textAlign: 'right' }}>
                                {formatTL(unitPrice)}
                            </td>
                            <td style={{ padding: '10px 8px', borderRight: '1px solid #000', textAlign: 'center' }}>
                                %{kdvRate}
                            </td>
                            <td style={{ padding: '10px 8px', borderRight: '1px solid #000', textAlign: 'right' }}>
                                {formatTL(kdvAmount)}
                            </td>
                            <td style={{ padding: '10px 8px', borderRight: '1px solid #000', textAlign: 'center' }}>
                                -
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                                {formatTL(totalWithoutKDV)}
                            </td>
                        </tr>
                        {/* Boş satır (şablon doldurma) */}
                        <tr style={{ height: '30px' }}>
                            <td style={{ borderRight: '1px solid #000' }}></td>
                            <td style={{ borderRight: '1px solid #000' }}></td>
                            <td style={{ borderRight: '1px solid #000' }}></td>
                            <td style={{ borderRight: '1px solid #000' }}></td>
                            <td style={{ borderRight: '1px solid #000' }}></td>
                            <td style={{ borderRight: '1px solid #000' }}></td>
                            <td style={{ borderRight: '1px solid #000' }}></td>
                            <td style={{ borderRight: '1px solid #000' }}></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                {/* 4. Açıklama & Alt Özet Tablosu */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', marginBottom: '30px' }}>
                    {/* Açıklama Kutusu */}
                    <div>
                        <div style={{ border: '1px solid #000', padding: '10px', minHeight: '120px', backgroundColor: '#f8fafc' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>
                                Açıklama ve Tesellüm Notu:
                            </div>
                            <p style={{ margin: 0, fontSize: '11px', color: '#334155', lineHeight: '1.5' }}>
                                İşbu belge, 6102 sayılı T.T.K. ve 213 sayılı V.U.K. hükümlerine uygun olarak düzenlenmiş resmi Malzeme Teslim ve Kabul İrsaliyesi (e-Fatura eşdeğeri) tutanağıdır. Belirtilen mal/hizmet depoya eksiksiz ve hasarsız olarak teslim alınmış olup, karşılıklı iki nüsha olarak imza altına alınmıştır.
                            </p>
                        </div>
                    </div>

                    {/* Özet Tablosu */}
                    <div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '12px' }}>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #000' }}>
                                    <td style={{ padding: '6px 10px', fontWeight: 'bold', borderRight: '1px solid #000', backgroundColor: '#f8fafc' }}>Mal Hizmet Toplam Tutarı:</td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600' }}>{formatTL(totalWithoutKDV)}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #000' }}>
                                    <td style={{ padding: '6px 10px', fontWeight: 'bold', borderRight: '1px solid #000', backgroundColor: '#f8fafc' }}>Toplam İskonto:</td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#64748b' }}>0,00 ₺</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #000' }}>
                                    <td style={{ padding: '6px 10px', fontWeight: 'bold', borderRight: '1px solid #000', backgroundColor: '#f8fafc' }}>Hesaplanan KDV (%20):</td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600' }}>{formatTL(kdvAmount)}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #000' }}>
                                    <td style={{ padding: '6px 10px', fontWeight: 'bold', borderRight: '1px solid #000', backgroundColor: '#e2e8f0' }}>Vergiler Dahil Toplam Tutar:</td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>{formatTL(grandTotal)}</td>
                                </tr>
                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    <td style={{ padding: '8px 10px', fontWeight: 'bold', borderRight: '1px solid #000', fontSize: '13px' }}>Ödenecek Tutar:</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px', color: '#16a34a' }}>{formatTL(grandTotal)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 5. Karşılıklı İmza Alanları (Teslim Eden / Teslim Alan) */}
                <div style={{ borderTop: '2px solid #000', paddingTop: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        {/* Sol İmza: Teslim Eden */}
                        <div style={{ border: '2px solid #000', padding: '16px', borderRadius: '4px', backgroundColor: '#f8fafc' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', marginBottom: '12px', color: '#0f172a' }}>
                                ✍️ TESLİM EDEN (TEDARİKÇİ / SÜRÜCÜ)
                            </div>
                            <div style={{ marginBottom: '8px', fontSize: '11px' }}>
                                <strong>Firma / Yetkili:</strong> {invoiceData.supplier_name || 'Tedarikçi Yetkilisi'}
                            </div>
                            <div style={{ marginBottom: '8px', fontSize: '11px' }}>
                                <strong>Adı Soyadı:</strong> ................................................................
                            </div>
                            <div style={{ marginBottom: '12px', fontSize: '11px' }}>
                                <strong>Tarih / Saat:</strong> ...... / ...... / 2026   -   ..... : .....
                            </div>
                            <div style={{ height: '70px', border: '1px dashed #94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '11px', backgroundColor: '#fff' }}>
                                [ İmza / Kaşe Alanı ]
                            </div>
                        </div>

                        {/* Sağ İmza: Teslim Alan */}
                        <div style={{ border: '2px solid #000', padding: '16px', borderRadius: '4px', backgroundColor: '#f8fafc' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', marginBottom: '12px', color: '#0f172a' }}>
                                ✍️ TESLİM ALAN (DEPO / MALZEME KABUL)
                            </div>
                            <div style={{ marginBottom: '8px', fontSize: '11px' }}>
                                <strong>Firma:</strong> STOK KONTROL YÖNETİMİ DEPO BİRİMİ
                            </div>
                            <div style={{ marginBottom: '8px', fontSize: '11px' }}>
                                <strong>Adı Soyadı:</strong> ................................................................
                            </div>
                            <div style={{ marginBottom: '12px', fontSize: '11px' }}>
                                <strong>Tarih / Saat:</strong> ...... / ...... / 2026   -   ..... : .....
                            </div>
                            <div style={{ height: '70px', border: '1px dashed #94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '11px', backgroundColor: '#fff' }}>
                                [ İmza / Kaşe Alanı ]
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                    Stok ERP Sistemleri - Güvenli e-Fatura ve Depo Kabul İrsaliyesi Altyapısı
                </div>
            </div>
        </div>
    );
};

export default EInvoiceModal;
