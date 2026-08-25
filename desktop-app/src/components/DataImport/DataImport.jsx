/**
 * ============================================================================
 * BİLEŞEN ADI: DataImport
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Dış kaynaklı verileri (Excel vb.) sisteme aktarma modülü.
 * ============================================================================
 */
/*
 * ÖZET:
 * Bu dosya (DataImport.jsx), sisteme Excel (.xlsx) veya .csv dosyalarından toplu veri aktarmak için kullanılır.
 */

import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { apiFetch } from '../../utils/api';

const MODULES = [
    {
        id: 'customers',
        name: 'Müşteriler / Cariler',
        endpoint: 'http://localhost:3000/api/customers',
        fields: [
            { key: 'CustomerName', label: 'Firma / Müşteri Adı', required: true },
            { key: 'Phone', label: 'Telefon', required: false },
            { key: 'Email', label: 'E-Posta', required: false },
            { key: 'Address', label: 'Adres', required: false }
        ]
    },
    {
        id: 'products',
        name: 'Ürünler',
        endpoint: 'http://localhost:3000/api/products',
        fields: [
            { key: 'ProductName', label: 'Ürün Adı', required: true },
            { key: 'Barcode', label: 'Barkod (Ürün Kodu)', required: true },
            { key: 'Brand', label: 'Marka', required: false },
            { key: 'Category', label: 'Kategori', required: false },
            { key: 'PurchasePrice', label: 'Alış Fiyatı', required: false },
            { key: 'SalePrice', label: 'Satış Fiyatı', required: false },
            { key: 'StockQuantity', label: 'Stok Miktarı', required: false },
            { key: 'supply_type', label: 'Tedarik Tipi (MANUFACTURE/PURCHASE)', required: false },
            { key: 'unit_type', label: 'Birim (Adet, Kg vb.)', required: false }
        ]
    }
];

const DataImport = ({ currentUser }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [selectedModule, setSelectedModule] = useState('');
    const [excelData, setExcelData] = useState([]);
    const [excelHeaders, setExcelHeaders] = useState([]);
    const [mapping, setMapping] = useState({}); // { dbField: excelHeader }
    const [step, setStep] = useState(1);
    const [importStatus, setImportStatus] = useState({ total: 0, success: 0, failed: 0, logs: [] });
    const [isImporting, setIsImporting] = useState(false);

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const workbook = new ExcelJS.Workbook();
            const arrayBuffer = await file.arrayBuffer();
            await workbook.xlsx.load(arrayBuffer);
            
            const ws = workbook.worksheets[0];
            if (!ws) {
                alert('Excel dosyası boş veya geçersiz.');
                return;
            }

            let headers = [];
            let rows = [];

            ws.eachRow((row, rowNumber) => {
                if (rowNumber === 1) {
                    // İlk satır başlıklar
                    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                        headers[colNumber] = cell.value ? cell.value.toString().trim() : `Sütun ${colNumber}`;
                    });
                } else {
                    let rowData = {};
                    let hasData = false;
                    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                        const header = headers[colNumber];
                        if (header) {
                            rowData[header] = cell.value;
                            hasData = true;
                        }
                    });
                    if (hasData) {
                        rows.push(rowData);
                    }
                }
            });

            // Boş başlıkları temizle (dizideki empty sloları siler)
            const cleanHeaders = Object.values(headers).filter(h => h);

            if (rows.length > 0) {
                setExcelHeaders(cleanHeaders);
                setExcelData(rows);
                setStep(2);
                
                // Otomatik eşleştirme denemesi (isime göre)
                const mod = MODULES.find(m => m.id === selectedModule);
                if (mod) {
                    const initialMap = {};
                    mod.fields.forEach(f => {
                        const match = headers.find(h => h.toLowerCase().includes(f.label.toLowerCase()) || f.label.toLowerCase().includes(h.toLowerCase()) || h.toLowerCase() === f.key.toLowerCase());
                        if (match) initialMap[f.key] = match;
                    });
                    setMapping(initialMap);
                }
            } else {
                alert('Excel dosyasında okunacak veri bulunamadı.');
            }
        } catch (error) {
            console.error('Excel okuma hatası:', error);
            alert('Excel dosyası okunamadı. Lütfen geçerli bir .xlsx dosyası seçin.');
        }
    };

    const handleMappingChange = (dbField, excelHeader) => {
        setMapping(prev => ({
            ...prev,
            [dbField]: excelHeader
        }));
    };

    // 3. Backend API İstekleri (Veri Çekme / Gönderme)
    const handleImport = async () => {
        const mod = MODULES.find(m => m.id === selectedModule);
        if (!mod) return;

        setIsImporting(true);
        setStep(3);
        setImportStatus({ total: excelData.length, success: 0, failed: 0, logs: [] });

        let successCount = 0;
        let failedCount = 0;
        let logs = [];

        for (let i = 0; i < excelData.length; i++) {
            const row = excelData[i];
            const payload = {};
            
            let hasRequired = true;
            mod.fields.forEach(f => {
                const mappedHeader = mapping[f.key];
                const value = mappedHeader ? row[mappedHeader] : '';
                payload[f.key] = value;
                if (f.required && !value) {
                    hasRequired = false;
                }
            });

            // Ürünler için özel ayarlar
            if (selectedModule === 'products') {
                if (!payload.supply_type) payload.supply_type = 'MANUFACTURE';
                if (!payload.unit_type) payload.unit_type = 'Adet';
                // Barkod api tarafında dizi bekliyor olabilir veya DB string tutuyorsa:
                if (payload.Barcode) {
                    payload.Barcode = JSON.stringify([payload.Barcode.toString()]);
                }
            }

            if (!hasRequired) {
                failedCount++;
                logs.push(`Satır ${i + 2}: Gerekli alanlar eksik. (Atlandı)`);
                setImportStatus(prev => ({ ...prev, failed: failedCount, logs }));
                continue;
            }

            try {
                const res = await apiFetch(mod.endpoint, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-User-Id': currentUser?.id
                    },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                
                if (data.success) {
                    successCount++;
                } else {
                    failedCount++;
                    logs.push(`Satır ${i + 2}: Hata - ${data.message}`);
                }
            } catch (err) {
                failedCount++;
                logs.push(`Satır ${i + 2}: Sunucu Hatası - ${err.message}`);
            }

            setImportStatus({ total: excelData.length, success: successCount, failed: failedCount, logs });
        }

        setIsImporting(false);
    };

    const resetImport = () => {
        setStep(1);
        setExcelData([]);
        setExcelHeaders([]);
        setMapping({});
        setImportStatus({ total: 0, success: 0, failed: 0, logs: [] });
    };

    const activeModule = MODULES.find(m => m.id === selectedModule);

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ color: '#0f172a', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Veri İçe Aktarma (Excel)</h1>
                    <p style={{ color: '#64748b', marginTop: '8px', margin: 0 }}>Excel (.xlsx) dosyanızı yükleyerek topluca kayıt ekleyin.</p>
                </div>
                {step > 1 && (
                    <button onClick={resetImport} style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                        Başa Dön
                    </button>
                )}
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {step === 1 && (
                    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1e293b' }}>İçe Aktarılacak Modülü Seçin:</label>
                            <select 
                                value={selectedModule} 
                                onChange={(e) => setSelectedModule(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                            >
                                <option value="">-- Modül Seçiniz --</option>
                                {MODULES.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        {selectedModule && (
                            <div style={{ border: '2px dashed #cbd5e1', padding: '40px', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                                <svg style={{ width: '48px', height: '48px', color: '#94a3b8', margin: '0 auto 16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#334155' }}>Excel Dosyasını Yükleyin</h3>
                                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>.xlsx veya .csv formatında olmalıdır. İlk satırın başlıkları içermesi gerekir.</p>
                                <input 
                                    type="file" 
                                    accept=".xlsx, .xls, .csv" 
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                    id="excel-upload"
                                />
                                <label htmlFor="excel-upload" style={{ display: 'inline-block', backgroundColor: '#3b82f6', color: 'white', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                    Dosya Seç
                                </label>
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && activeModule && (
                    <div>
                        <div style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
                            <strong>{excelData.length}</strong> adet satır okundu. Lütfen sistemdeki alanlarla, Excel dosyanızdaki sütun başlıklarını eşleştirin.
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                            {activeModule.fields.map(f => (
                                <div key={f.key} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: '600', color: '#1e293b' }}>{f.label}</span>
                                        {f.required && <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>*Zorunlu</span>}
                                    </div>
                                    <select 
                                        value={mapping[f.key] || ''} 
                                        onChange={(e) => handleMappingChange(f.key, e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    >
                                        <option value="">-- Eşleştirilmedi --</option>
                                        {excelHeaders.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                            <button onClick={resetImport} style={{ padding: '12px 24px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                İptal
                            </button>
                            <button onClick={handleImport} style={{ padding: '12px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16,185,129,0.3)' }}>
                                {excelData.length} Kaydı İçe Aktar
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <h2 style={{ color: '#0f172a', fontSize: '20px', marginBottom: '8px' }}>
                                {isImporting ? 'Aktarım Devam Ediyor...' : 'Aktarım Tamamlandı'}
                            </h2>
                            <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '99px', height: '12px', overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    backgroundColor: '#3b82f6', 
                                    width: `${importStatus.total > 0 ? ((importStatus.success + importStatus.failed) / importStatus.total) * 100 : 0}%`,
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>
                            <p style={{ marginTop: '12px', color: '#64748b', fontWeight: '600' }}>
                                {importStatus.success + importStatus.failed} / {importStatus.total} tamamlandı
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ backgroundColor: '#dcfce3', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #86efac' }}>
                                <div style={{ fontSize: '32px', fontWeight: '800', color: '#166534' }}>{importStatus.success}</div>
                                <div style={{ color: '#15803d', fontWeight: '600', marginTop: '4px' }}>Başarılı</div>
                            </div>
                            <div style={{ backgroundColor: '#fee2e2', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #fca5a5' }}>
                                <div style={{ fontSize: '32px', fontWeight: '800', color: '#991b1b' }}>{importStatus.failed}</div>
                                <div style={{ color: '#b91c1c', fontWeight: '600', marginTop: '4px' }}>Hatalı / Atlanan</div>
                            </div>
                        </div>

                        {importStatus.logs.length > 0 && (
                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '200px', overflowY: 'auto', fontSize: '13px', color: '#475569' }}>
                                <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>Hata Logları</h4>
                                {importStatus.logs.map((log, idx) => (
                                    <div key={idx} style={{ marginBottom: '4px' }}>• {log}</div>
                                ))}
                            </div>
                        )}

                        {!isImporting && (
                            <div style={{ textAlign: 'center', marginTop: '32px' }}>
                                <button onClick={resetImport} style={{ padding: '12px 32px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                    Yeni Dosya Yükle
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataImport;


