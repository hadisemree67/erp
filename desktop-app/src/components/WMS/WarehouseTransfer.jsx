/**
 * ============================================================================
 * DOSYA ADI: WarehouseTransfer.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - WMS Operasyonları / Depolar ve Raflar Arası Transfer
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Bir depodan diğerine şubeler arası mal sevkiyatını (İrsaliyeli Transfer) veya aynı depo içinde bir raftan başka bir rafa hücre taşıma (Put-away / Replenishment) işlemlerini gerçekleştirir.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Kaynak ve Hedef Depo/Raf Seçimi, Miktar Doğrulama, Lucide İkonları
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - `/api/wms/transfer` API rotasına istek atarak kaynak depodan stoğu düşer, hedef depoya/rafa ekler.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const WarehouseTransfer = ({ currentUser }) => {
    const [stocks, setStocks] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [shelves, setShelves] = useState([]);
    
    const [selectedStockId, setSelectedStockId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [targetWarehouseId, setTargetWarehouseId] = useState('');
    const [targetShelfCode, setTargetShelfCode] = useState('');
    const [description, setDescription] = useState('');

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchStocks();
        fetchWarehouses();
    }, []);

    const fetchStocks = async () => {
        try {
            const res = await apiFetch('http://localhost:3000/api/wms/stock-list');
            const data = await res.json();
            if (data.success) {
                setStocks(data.data.filter(s => s.quantity > 0) || []);
            }
        } catch (error) {
            console.error('Stoklar getirilemedi:', error);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const res = await apiFetch('http://localhost:3000/api/warehouses');
            const data = await res.json();
            if (Array.isArray(data)) {
                setWarehouses(data);
            }
        } catch (error) {
            console.error('Depolar getirilemedi:', error);
        }
    };

    const handleWarehouseChange = (e) => {
        const wId = e.target.value;
        setTargetWarehouseId(wId);
        setTargetShelfCode('');
        
        const selectedWh = warehouses.find(w => w.id.toString() === wId);
        if (selectedWh && selectedWh.Shelves) {
            setShelves(selectedWh.Shelves);
        } else {
            setShelves([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const res = await apiFetch('http://localhost:3000/api/wms/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    balanceId: selectedStockId,
                    quantity: quantity,
                    targetWarehouseId: targetWarehouseId,
                    targetShelfCode: targetShelfCode,
                    userId: currentUser?.id,
                    description: description
                })
            });
            const data = await res.json();
            
            if (data.success) {
                setMessage({ text: 'Transfer başarıyla tamamlandı.', type: 'success' });
                // Reset form
                setSelectedStockId('');
                setQuantity('');
                setTargetWarehouseId('');
                setTargetShelfCode('');
                setDescription('');
                fetchStocks(); // Refresh stock list
            } else {
                setMessage({ text: data.message || 'Transfer başarısız.', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Sunucu bağlantı hatası.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const selectedStock = stocks.find(s => s.balance_id.toString() === selectedStockId);

    return (
        <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Depo Transferi</h2>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>Stokları depolar ve raflar arasında transfer edin.</p>

            {message.text && (
                <div style={{ padding: '16px', marginBottom: '24px', borderRadius: '8px', backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#166534' : '#991b1b' }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>Transfer Edilecek Stok</label>
                    <select
                        value={selectedStockId}
                        onChange={(e) => setSelectedStockId(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                        required
                    >
                        <option value="">-- Stok Seçin --</option>
                        {stocks.map(stock => (
                            <option key={stock.balance_id} value={stock.balance_id}>
                                {stock.ProductName} - Mevcut Depo: {stock.warehouse_name} ({stock.shelf_code}) - Parti: {stock.batch_number || 'Yok'} - Miktar: {stock.quantity}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>Mevcut Miktar</label>
                    <input
                        type="text"
                        value={selectedStock ? selectedStock.quantity : ''}
                        disabled
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>Transfer Miktarı</label>
                    <input
                        type="number"
                        min="1"
                        max={selectedStock ? selectedStock.quantity : ''}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Örn: 5"
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                        required
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>Hedef Depo</label>
                    <select
                        value={targetWarehouseId}
                        onChange={handleWarehouseChange}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                        required
                    >
                        <option value="">-- Depo Seçin --</option>
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>Hedef Raf</label>
                    <select
                        value={targetShelfCode}
                        onChange={(e) => setTargetShelfCode(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                        required
                        disabled={!targetWarehouseId || shelves.length === 0}
                    >
                        <option value="">-- Raf Seçin --</option>
                        {shelves.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>Transfer Nedeni / Açıklama</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Örn: Kusurlu ürün iadesi, şube talebi vb."
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                        required
                    />
                </div>
                
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>İşlemi Gerçekleştiren</label>
                    <input
                        type="text"
                        value={currentUser?.name || currentUser?.username || 'Bilinmeyen Kullanıcı'}
                        disabled
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b' }}
                    />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                        type="submit"
                        disabled={loading || !selectedStockId || !quantity || !targetWarehouseId || !targetShelfCode}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: (loading || !selectedStockId || !quantity || !targetWarehouseId || !targetShelfCode) ? '#94a3b8' : '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: (loading || !selectedStockId || !quantity || !targetWarehouseId || !targetShelfCode) ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {loading ? 'Transfer Ediliyor...' : 'Transferi Tamamla'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default WarehouseTransfer;
