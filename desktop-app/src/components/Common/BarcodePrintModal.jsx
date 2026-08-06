/**
 * ============================================================================
 * DOSYA ADI: BarcodePrintModal.jsx
 * MODÜL / KATMAN: Önyüz Ortak Bileşen (Common Component) - Barkod Yazdırma
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistem içerisindeki ürün, kutu veya sepet barkodlarının termal etiket
 *   yazıcılarından veya normal yazıcılardan çıkarılması için kullanılan pop-up pencere.
 * ============================================================================
 */
import React, { useState, useRef } from 'react';
import Barcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';

const BarcodePrintModal = ({ isOpen, onClose, barcodeValue, title }) => {
    // barcodeValue tek bir barkod stringi veya string dizisi olabilir
    const barcodesList = Array.isArray(barcodeValue) ? barcodeValue : (barcodeValue ? [barcodeValue] : []);
    
    const [copies, setCopies] = useState(1);
    const [selectedBarcode, setSelectedBarcode] = useState('');
    const printRef = useRef(null);

    // Modal açıldığında veya barkod değeri değiştiğinde seçili barkodu güncelle
    React.useEffect(() => {
        if (isOpen && barcodesList.length > 0) {
            setSelectedBarcode(barcodesList[0]);
        }
    }, [isOpen, barcodeValue]);

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `Barkod_${selectedBarcode}`
    });

    if (!isOpen) return null;

    // A4 kağıtları çok sayıda etiket alabilir. Ancak standart termal etiket yazıcıları her sayfaya 1 etiket basar.
    // 'copies' değeri kadar barkod kapsayıcısı render edeceğiz.
    // Yazdırma CSS'i: Termal yazıcılar için her etikette "page-break-after: always;" kullanılır.
    // Termal barkod etiketleri ile uyumlu çalışacak temel CSS stilleri uygulandı.
    
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '450px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Barkod Yazdır</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>×</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', border: '1px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                        {title && <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center', color: '#000', wordBreak: 'break-all' }}>{title}</div>}
                        <Barcode value={selectedBarcode || 'BOS'} height={60} width={1.8} fontSize={14} />
                    </div>

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {barcodesList.length > 1 && (
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>Yazdırılacak Barkod Seçimi:</label>
                                <select 
                                    value={selectedBarcode} 
                                    onChange={(e) => setSelectedBarcode(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}
                                >
                                    {barcodesList.map((b, idx) => (
                                        <option key={idx} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Yazdırılacak Adet:</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="500"
                            value={copies} 
                            onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px', color: '#0f172a', backgroundColor: 'white' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>İptal</button>
                    <button onClick={handlePrint} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Yazdır
                    </button>
                </div>
            </div>

            {/* Gizli Yazdırma Alanı (Yazıcıya gönderilen kısım) */}
            <div style={{ display: 'none' }}>
                <div ref={printRef}>
                    <style>
                        {`
                            @media print {
                                @page { size: auto; margin: 0; }
                                body { margin: 0; padding: 0; }
                                .label-container {
                                    page-break-after: always;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    justify-content: center;
                                    height: 100vh; /* Adjusts to label height for thermal printers */
                                    padding: 10px;
                                    box-sizing: border-box;
                                    text-align: center;
                                }
                            }
                        `}
                    </style>
                    {Array.from({ length: copies }).map((_, i) => (
                        <div key={i} className="label-container">
                            {title && <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#000', fontFamily: 'sans-serif', maxWidth: '90%', wordBreak: 'break-all' }}>{title}</div>}
                            <Barcode value={selectedBarcode || 'BOS'} height={70} width={2} fontSize={16} margin={0} displayValue={true} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BarcodePrintModal;
