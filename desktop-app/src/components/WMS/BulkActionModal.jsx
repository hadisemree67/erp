/**
 * ============================================================================
 * DOSYA ADI: BulkActionModal.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - WMS Operasyonları / Toplu Stok İşlemleri Modalı
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Depodaki birden fazla stok kalemi üzerinde toplu sayım düzeltmesi, toplu durum değiştirme (örn: karantinaya alma) veya toplu lokasyon/raf taşıma işlemlerini gerçekleştiren araçtır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Toplu WMS İşlem Mantığı, Lucide İkonları
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - StockList.jsx veya InventoryList.jsx üzerinden seçilen kalemleri `/api/wms/bulk-action` rotasıyla işler.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (BulkActionModal.jsx), Mal kabul, stok giriş/çıkış, raf transferleri ve genel depo envanter işlemlerini (Warehouse Management System) yönetir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const BulkActionModal = ({ isOpen, onClose, selectedIds, currentUser, onActionSuccess }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [actionType, setActionType] = useState('ADD'); // ADD, REMOVE, ZERO_OUT, TRANSFER
    const [quantity, setQuantity] = useState('');
    const [description, setDescription] = useState('');
    const [warehouses, setWarehouses] = useState([]);
    const [shelves, setShelves] = useState([]);
    const [targetWarehouseId, setTargetWarehouseId] = useState('');
    const [targetShelfCode, setTargetShelfCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        if (isOpen) {
            // Durumu sıfırlas when opened
            setActionType('ADD');
            setQuantity('');
            setDescription('');
            setTargetWarehouseId('');
            setTargetShelfCode('');
            setError(null);
            
            // Fetch warehouses
            // 3. Backend API İstekleri (Veri Çekme)
            const fetchWarehouses = async () => {
                try {
                    const res = await apiFetch('http://localhost:3000/api/warehouses');
                    const data = await res.json();
                    if (Array.isArray(data)) setWarehouses(data);
                } catch (err) {
                    console.error('Depolar yüklenemedi', err);
                }
            };
            fetchWarehouses();
        }
    }, [isOpen]);

    useEffect(() => {
        if (actionType === 'TRANSFER' && targetWarehouseId) {
            const selectedWh = warehouses.find(w => w.id.toString() === targetWarehouseId.toString());
            if (selectedWh && selectedWh.Shelves) {
                setShelves(selectedWh.Shelves);
                if (selectedWh.Shelves.length > 0) {
                    setTargetShelfCode(selectedWh.Shelves[0]);
                } else {
                    setTargetShelfCode('');
                }
            } else {
                setShelves([]);
                setTargetShelfCode('');
            }
        }
    }, [targetWarehouseId, warehouses, actionType]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await apiFetch('http://localhost:3000/api/wms/bulk-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
                body: JSON.stringify({
                    balanceIds: selectedIds,
                    actionType,
                    quantity: quantity ? parseInt(quantity) : null,
                    targetWarehouseId,
                    targetShelfCode,
                    userId: currentUser?.id,
                    description
                })
            });

            const data = await res.json();
            if (data.success) {
                onActionSuccess();
            } else {
                setError(data.message || 'Bir hata oluştu.');
            }
        } catch (err) {
            setError('Sunucu bağlantı hatası.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <h2 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Toplu İşlemler ({selectedIds.length} Kayıt)</h2>
                {error && <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '6px', marginBottom: '16px', border: '1px solid #fecaca' }}>{error}</div>}
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <button 
                        type="button"
                        onClick={() => setActionType('ADD')} 
                        style={{ flex: 1, padding: '10px', backgroundColor: actionType === 'ADD' ? '#10b981' : '#f1f5f9', color: actionType === 'ADD' ? 'white' : '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                    >Stok Arttır</button>
                    <button 
                        type="button"
                        onClick={() => setActionType('REMOVE')} 
                        style={{ flex: 1, padding: '10px', backgroundColor: actionType === 'REMOVE' ? '#f59e0b' : '#f1f5f9', color: actionType === 'REMOVE' ? 'white' : '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                    >Stok Düşür</button>
                    <button 
                        type="button"
                        onClick={() => setActionType('ZERO_OUT')} 
                        style={{ flex: 1, padding: '10px', backgroundColor: actionType === 'ZERO_OUT' ? '#ef4444' : '#f1f5f9', color: actionType === 'ZERO_OUT' ? 'white' : '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                    >Tümünü Sıfırla</button>
                    <button 
                        type="button"
                        onClick={() => setActionType('TRANSFER')} 
                        style={{ flex: 1, padding: '10px', backgroundColor: actionType === 'TRANSFER' ? '#3b82f6' : '#f1f5f9', color: actionType === 'TRANSFER' ? 'white' : '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', minWidth: '100%' }}
                    >Toplu Depo/Raf Transferi</button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {(actionType === 'ADD' || actionType === 'REMOVE') && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Miktar (Her kayıt için)</label>
                            <input 
                                type="number" 
                                min="1" 
                                value={quantity} 
                                onChange={e => setQuantity(e.target.value)} 
                                required 
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }} 
                            />
                        </div>
                    )}

                    {actionType === 'TRANSFER' && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Hedef Depo Seçiniz</label>
                                <select 
                                    value={targetWarehouseId} 
                                    onChange={e => setTargetWarehouseId(e.target.value)} 
                                    required 
                                    style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                                >
                                    <option value="">-- Depo Seç --</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Hedef Raf Seçiniz</label>
                                <select 
                                    value={targetShelfCode} 
                                    onChange={e => setTargetShelfCode(e.target.value)} 
                                    required 
                                    disabled={!targetWarehouseId || shelves.length === 0}
                                    style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                                >
                                    <option value="">{shelves.length > 0 ? '-- Raf Seç --' : 'Önce Depo Seçiniz'}</option>
                                    {shelves.map((s, idx) => (
                                        <option key={idx} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Açıklama / Sebep</label>
                        <input 
                            type="text" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            placeholder={actionType === 'ZERO_OUT' ? 'Örn: Su Baskını Nedeniyle Zayi' : 'Örn: Toplu İşlem'}
                            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }} 
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>İptal</button>
                        <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', backgroundColor: '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: 'white' }}>
                            {loading ? 'İşleniyor...' : 'Onayla ve Uygula'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkActionModal;
