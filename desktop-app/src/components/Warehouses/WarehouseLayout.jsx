/**
 * ============================================================================
 * BİLEŞEN ADI: WarehouseLayout
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Depo tanımları, raf krokileri ve fiziki lokasyon yönetim bileşeni.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (WarehouseLayout.jsx), Depo tanımları, raf koordinatları ve depo yerleşim düzeninin (Layout) görselleştirilmesini sağlar.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const WarehouseLayout = ({ currentUser }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    
    // Seçili deponun raf bilgilerini (Shelves_Details) alırız
    const [locations, setLocations] = useState([]);
    
    const [floors, setFloors] = useState([{ id: 1, name: 'Zemin Kat', rows: 10, cols: 10, items: [] }]);
    const [activeFloorId, setActiveFloorId] = useState(1);

    const activeFloor = floors.find(f => f.id === activeFloorId) || floors[0];
    const rows = activeFloor.rows;
    const cols = activeFloor.cols;
    const items = activeFloor.items;

    const setRows = (newRows) => {
        setFloors(prev => prev.map(f => f.id === activeFloorId ? { ...f, rows: typeof newRows === 'function' ? newRows(f.rows) : newRows } : f));
    };
    const setCols = (newCols) => {
        setFloors(prev => prev.map(f => f.id === activeFloorId ? { ...f, cols: typeof newCols === 'function' ? newCols(f.cols) : newCols } : f));
    };
    const setItems = (newItems) => {
        setFloors(prev => prev.map(f => f.id === activeFloorId ? { ...f, items: typeof newItems === 'function' ? newItems(f.items) : newItems } : f));
    };
    const [loading, setLoading] = useState(true);

    const [modalData, setModalData] = useState(null); 
    const [selectedShelfCode, setSelectedShelfCode] = useState('');
    
    // Yön seçimi
    const [direction, setDirection] = useState('bottom');
    const [savingLayout, setSavingLayout] = useState(false);

    const [searchBarcode, setSearchBarcode] = useState('');
    const [highlightedShelves, setHighlightedShelves] = useState([]);

    const [products, setProducts] = useState([]);
    const [shelfDetails, setShelfDetails] = useState(null);
    const [loadingShelf, setLoadingShelf] = useState(false);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [addQuantity, setAddQuantity] = useState(1);
    const [addBatchNumber, setAddBatchNumber] = useState('');
    const [addExpirationDate, setAddExpirationDate] = useState('');
    const [submittingStock, setSubmittingStock] = useState(false);
    const [labelInput, setLabelInput] = useState('');

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        // 3. Backend API İstekleri (Veri Çekme)
        const fetchProds = async () => {
            try {
                const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/products');
                const data = await res.json();
                if (Array.isArray(data)) setProducts(data);
            } catch (err) {
                console.error(err);
            }
        }
        fetchProds();
        fetchWarehouses();
    }, []);

    useEffect(() => {
        if (selectedWarehouse) {
            const wh = warehouses.find(w => w.id == selectedWarehouse);
            if (wh && wh.Shelves_Details) {
                setLocations(wh.Shelves_Details);
            } else {
                setLocations([]);
            }
            const fetchLayout = async () => {
                try {
                    const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/wms/warehouses/${selectedWarehouse}/layout`);
                    const data = await res.json();
                    if (data.success && data.data) {
                        if (data.data.floors) {
                            setFloors(data.data.floors);
                            setActiveFloorId(data.data.floors[0]?.id || 1);
                        } else {
                            const { rows: savedRows, cols: savedCols, items: savedItems } = data.data;
                            setFloors([{
                                id: 1,
                                name: 'Zemin Kat',
                                rows: savedRows || 10,
                                cols: savedCols || 10,
                                items: savedItems || []
                            }]);
                            setActiveFloorId(1);
                        }
                    } else {
                        setFloors([{ id: 1, name: 'Zemin Kat', rows: 10, cols: 10, items: [] }]);
                        setActiveFloorId(1);
                    }
                } catch (err) {
                    console.error("Kroki çekilirken hata:", err);
                }
            };
            fetchLayout();
        } else {
            setLocations([]);
            setFloors([{ id: 1, name: 'Zemin Kat', rows: 10, cols: 10, items: [] }]);
            setActiveFloorId(1);
        }
    }, [selectedWarehouse, warehouses]);

    const handleSaveLayout = async () => {
        if (!selectedWarehouse) {
            alert("Lütfen önce bir depo seçin!");
            return;
        }
        
        setSavingLayout(true);
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/wms/warehouses/${selectedWarehouse}/layout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ floors })
            });
            const data = await res.json();
            if (data.success) {
                alert("Kroki başarıyla kaydedildi!");
            } else {
                alert("Hata: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("Kaydetme sırasında bir hata oluştu.");
        }
        setSavingLayout(false);
    };

    const fetchWarehouses = async () => {
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/warehouses');
            if (res.ok) {
                const data = await res.json();
                setWarehouses(data);
            }
        } catch (error) {
            console.error('Depolar getirilirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    // Yönlü Ekleme
    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)
    const handleAddDirection = () => {
        if (direction === 'top') {
            setRows(prev => prev + 1);
            setItems(prev => prev.map(i => ({ ...i, row: i.row + 1 })));
        } else if (direction === 'bottom') {
            setRows(prev => prev + 1);
        } else if (direction === 'left') {
            setCols(prev => prev + 1);
            setItems(prev => prev.map(i => ({ ...i, col: i.col + 1 })));
        } else if (direction === 'right') {
            setCols(prev => prev + 1);
        }
    };

    // Yönlü Çıkarma
    const handleRemoveDirection = () => {
        if (direction === 'top') {
            if (rows > 1) {
                setRows(prev => prev - 1);
                setItems(prev => prev.filter(i => i.row > 0).map(i => ({ ...i, row: i.row - 1 })));
            }
        } else if (direction === 'bottom') {
            if (rows > 1) {
                setRows(prev => prev - 1);
                setItems(prev => prev.filter(i => i.row < rows - 1));
            }
        } else if (direction === 'left') {
            if (cols > 1) {
                setCols(prev => prev - 1);
                setItems(prev => prev.filter(i => i.col > 0).map(i => ({ ...i, col: i.col - 1 })));
            }
        } else if (direction === 'right') {
            if (cols > 1) {
                setCols(prev => prev - 1);
                setItems(prev => prev.filter(i => i.col < cols - 1));
            }
        }
    };

    const handleCellClick = (r, c) => {
        const item = items.find(i => i.row === r && i.col === c);
        if (item && item.type === 'shelf') {
            setModalData({ type: 'shelf_detail', r, c, shelfCode: item.name, step: 4 });
            fetchShelfDetails(item.name);
        } else if (item && item.type === 'label') {
            setModalData({ type: 'label_detail', r, c, labelText: item.name, step: 7 });
        } else {
            setModalData({ type: 'cell', r, c, step: 1 });
        }
        setSelectedShelfCode('');
        setBarcodeInput('');
        setAddQuantity(1);
        setAddBatchNumber('');
        setAddExpirationDate('');
        setLabelInput('');
    };

    const fetchShelfDetails = async (shelfCode) => {
        if (!selectedWarehouse) return;
        setLoadingShelf(true);
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/wms/warehouses/${selectedWarehouse}/shelves/${shelfCode}/stock`);
            const data = await res.json();
            if (data.success) {
                setShelfDetails(data);
            } else {
                setShelfDetails(null);
            }
        } catch (err) {
            console.error(err);
        }
        setLoadingShelf(false);
    };

    const clearShelf = async () => {
        if (!modalData || !modalData.shelfCode) return;
        if (!window.confirm("Bu raftaki tüm ürünler silinecek (çıkış yapılacak). Emin misiniz?")) return;
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/wms/warehouses/${selectedWarehouse}/shelves/${modalData.shelfCode}/clear`, {
                method: 'POST',
                body: JSON.stringify({ userId: currentUser?.id })
            });
            const data = await res.json();
            if (data.success) {
                alert("Raf boşaltıldı.");
                fetchShelfDetails(modalData.shelfCode);
            } else {
                alert("Hata: " + data.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const submitStock = async (e) => {
        e.preventDefault();
        if (!modalData || !modalData.shelfCode) return;
        
        const product = products.find(p => {
            const searchVal = barcodeInput.trim();
            const cleanBarcode = p.Barcode ? p.Barcode.replace(/[\[\]"]/g, '') : '';
            const searchInField = (field) => {
                if (!field) return false;
                if (typeof field === 'string') return field.toLowerCase().includes(searchVal.toLowerCase());
                if (Array.isArray(field)) return field.some(i => i.toLowerCase().includes(searchVal.toLowerCase()));
                return JSON.stringify(field).toLowerCase().includes(searchVal.toLowerCase());
            };
            const matchBarcode = cleanBarcode.split(',').map(b => b.trim()).includes(searchVal);
            const matchName = p.ProductName && p.ProductName.toLowerCase().includes(searchVal.toLowerCase());
            const matchCat = p.Category && p.Category.toLowerCase().includes(searchVal.toLowerCase());
            const matchBrand = p.Brand && p.Brand.toLowerCase().includes(searchVal.toLowerCase());
            const matchWeb = searchInField(p.web_categories) || searchInField(p.web_subcategories) || searchInField(p.web_subtitles);
            return matchBarcode || matchName || matchCat || matchBrand || matchWeb;
        });
        
        if (!product) {
            alert("Girdiğiniz barkod veya isim ile ürün bulunamadı!");
            return;
        }

        if (!addBatchNumber || !addBatchNumber.trim()) {
            alert("Lütfen Parti No giriniz!");
            return;
        }

        setSubmittingStock(true);
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/wms/stock-entry', {
                method: 'POST',
                body: JSON.stringify({
                    productId: product.Id,
                    warehouseId: selectedWarehouse,
                    batchNumber: addBatchNumber.trim(),
                    expirationDate: addExpirationDate || null,
                    shelfAllocations: [{ shelfCode: modalData.shelfCode, quantity: Number(addQuantity) }],
                    userId: currentUser?.id
                })
            });
            const data = await res.json();
            if (data.success) {
                alert("Stok eklendi!");
                setBarcodeInput('');
                setAddQuantity(1);
                setAddBatchNumber('');
                setAddExpirationDate('');
                fetchShelfDetails(modalData.shelfCode);
                setModalData({ ...modalData, step: 4 });
            } else {
                alert("Hata: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("Bir hata oluştu.");
        }
        setSubmittingStock(false);
    };

    const handleSearchProduct = async (e) => {
        e.preventDefault();
        if (!searchBarcode.trim()) {
            setHighlightedShelves([]);
            return;
        }
        
        const product = products.find(p => {
            const cleanBarcode = p.Barcode ? p.Barcode.replace(/[\[\]"]/g, '') : '';
            const searchVal = searchBarcode.trim();
            const searchInField = (field) => {
                if (!field) return false;
                if (typeof field === 'string') return field.toLowerCase().includes(searchVal.toLowerCase());
                if (Array.isArray(field)) return field.some(i => i.toLowerCase().includes(searchVal.toLowerCase()));
                return JSON.stringify(field).toLowerCase().includes(searchVal.toLowerCase());
            };
            const matchBarcode = cleanBarcode.split(',').map(b => b.trim()).includes(searchVal);
            const matchName = p.ProductName && p.ProductName.toLowerCase().includes(searchVal.toLowerCase());
            const matchCat = p.Category && p.Category.toLowerCase().includes(searchVal.toLowerCase());
            const matchBrand = p.Brand && p.Brand.toLowerCase().includes(searchVal.toLowerCase());
            const matchWeb = searchInField(p.web_categories) || searchInField(p.web_subcategories) || searchInField(p.web_subtitles);
            return matchBarcode || matchName || matchCat || matchBrand || matchWeb;
        });

        if (!product) {
            alert('Girdiğiniz barkod veya isim ile ürün bulunamadı!');
            setHighlightedShelves([]);
            return;
        }

        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/wms/warehouses/${selectedWarehouse}/products/${product.Id}/shelves`);
            const data = await res.json();
            if (data.success) {
                setHighlightedShelves(data.data);
                if (data.data.length === 0) {
                    alert('Bu ürün seçili depodaki hiçbir rafta bulunamadı.');
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleBulkClick = (targetType, index) => {
        setModalData({ type: 'bulk', targetType, index, step: 1 });
    };

    const confirmShelf = () => {
        if (!selectedShelfCode || !modalData) return;
        
        const loc = locations.find(l => l.shelfCode === selectedShelfCode);
        if (!loc) return;

        let newItems = [...items];

        if (modalData.type === 'cell') {
            const existingItemIndex = newItems.findIndex(i => i.row === modalData.r && i.col === modalData.c);
            if (existingItemIndex >= 0) newItems.splice(existingItemIndex, 1);
            newItems.push({ row: modalData.r, col: modalData.c, type: 'shelf', name: loc.shelfCode });
        } else if (modalData.type === 'bulk') {
            const isRow = modalData.targetType === 'row';
            const index = modalData.index;
            // O satır/sütundaki mevcut öğeleri temizle
            newItems = newItems.filter(i => isRow ? i.row !== index : i.col !== index);
            const limit = isRow ? cols : rows;
            for (let i = 0; i < limit; i++) {
                newItems.push({ 
                    row: isRow ? index : i, 
                    col: isRow ? i : index, 
                    type: 'shelf', 
                    name: loc.shelfCode 
                });
            }
        }

        setItems(newItems);
        setModalData(null);
    };

    const addCorridor = () => {
        if (!modalData) return;
        
        let newItems = [...items];
        if (modalData.type === 'cell') {
            const existingItemIndex = newItems.findIndex(i => i.row === modalData.r && i.col === modalData.c);
            if (existingItemIndex >= 0) newItems.splice(existingItemIndex, 1);
            newItems.push({ row: modalData.r, col: modalData.c, type: 'corridor', name: '' });
        } else if (modalData.type === 'bulk') {
            const isRow = modalData.targetType === 'row';
            const index = modalData.index;
            // O satır/sütundaki her şeyi sil ve koridor ekle
            newItems = newItems.filter(i => isRow ? i.row !== index : i.col !== index);
            const limit = isRow ? cols : rows;
            for (let i = 0; i < limit; i++) {
                newItems.push({ 
                    row: isRow ? index : i, 
                    col: isRow ? i : index, 
                    type: 'corridor', 
                    name: '' 
                });
            }
        }
        
        setItems(newItems);
        setModalData(null);
    };

    const addLabel = () => {
        if (!modalData || !labelInput.trim()) return;
        
        let newItems = [...items];
        if (modalData.type === 'cell') {
            const existingItemIndex = newItems.findIndex(i => i.row === modalData.r && i.col === modalData.c);
            if (existingItemIndex >= 0) newItems.splice(existingItemIndex, 1);
            newItems.push({ row: modalData.r, col: modalData.c, type: 'label', name: labelInput.trim() });
        }
        
        setItems(newItems);
        setLabelInput('');
        setModalData(null);
    };

    const deleteItem = () => {
        if (!modalData) return;
        let newItems = [...items];

        if (modalData.type === 'cell') {
            const existingItemIndex = newItems.findIndex(i => i.row === modalData.r && i.col === modalData.c);
            if (existingItemIndex >= 0) newItems.splice(existingItemIndex, 1);
            // Boş beyaz alan olarak işaretle
            newItems.push({ row: modalData.r, col: modalData.c, type: 'empty', name: '' });
        } else if (modalData.type === 'bulk') {
            const isRow = modalData.targetType === 'row';
            const index = modalData.index;
            // O satır/sütundaki her şeyi sil ve empty ekle
            newItems = newItems.filter(i => isRow ? i.row !== index : i.col !== index);
            const limit = isRow ? cols : rows;
            for (let i = 0; i < limit; i++) {
                newItems.push({ 
                    row: isRow ? index : i, 
                    col: isRow ? i : index, 
                    type: 'empty', 
                    name: '' 
                });
            }
        }

        setItems(newItems);
        setModalData(null);
    };

    const renderGrid = () => {
        if (!selectedWarehouse) return null;

        const grid = [];
        
        // Sütun genişliklerini içeriğe göre hesapla
        const colWidths = [];
        for (let c = 0; c < cols; c++) {
            let maxLen = 0;
            items.forEach(i => {
                if (i.col === c && i.name) {
                    if (i.name.length > maxLen) maxLen = i.name.length;
                }
            });
            colWidths[c] = maxLen > 5 ? Math.max(55, maxLen * 7.5 + 16) : 55;
        }

        // Sütun Başlıkları (En üst satır)
        const colHeaders = [];
        // Sol üst köşe boşluk
        colHeaders.push(<div key="corner" style={{ minWidth: '34px', height: '34px' }}></div>);
        for (let c = 0; c < cols; c++) {
            colHeaders.push(
                <div 
                    key={`col-head-${c}`} 
                    className="grid-col-header"
                    onClick={() => handleBulkClick('col', c)}
                    style={{
                        minWidth: `${colWidths[c]}px`,
                        maxWidth: `${colWidths[c]}px`,
                        width: `${colWidths[c]}px`,
                        height: '24px',
                        margin: '0 2px',
                        backgroundColor: '#cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#334155',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        marginBottom: '4px'
                    }}
                    title="Tüm Sütunu Seç"
                >
                    ▼
                </div>
            );
        }
        grid.push(<div key="col-headers" style={{ display: 'flex' }}>{colHeaders}</div>);

        // Satırlar
        for (let r = 0; r < rows; r++) {
            const cells = [];
            
            // Satır Başlığı (En sol)
            cells.push(
                <div 
                    key={`row-head-${r}`} 
                    className="grid-row-header"
                    onClick={() => handleBulkClick('row', r)}
                    style={{
                        minWidth: '24px',
                        height: '55px',
                        margin: '2px 4px 2px 0',
                        backgroundColor: '#cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#334155',
                        cursor: 'pointer',
                        borderRadius: '4px'
                    }}
                    title="Tüm Satırı Seç"
                >
                    ▶
                </div>
            );

            for (let c = 0; c < cols; c++) {
                const item = items.find(i => i.row === r && i.col === c);
                
                let bgColor = '#f8fafc';
                let textColor = '#64748b';
                let content = '+';
                let borderStyle = '1px dashed #cbd5e1';
                let cellWidth = `${colWidths[c]}px`;
                let cellHeight = '55px';
                let cellMargin = '2px';
                let borderRadius = '4px';

                if (item) {
                    if (item.type === 'shelf') {
                        const isHighlighted = highlightedShelves.includes(item.name);
                        bgColor = isHighlighted ? '#dc2626' : '#334155';
                        textColor = 'white';
                        content = item.name;
                        borderStyle = isHighlighted ? '2px solid #991b1b' : '1px solid #1e293b';
                    } else if (item.type === 'corridor') {
                        bgColor = '#e2e8f0';
                        textColor = '#94a3b8';
                        content = ''; // Koridor boş
                        borderStyle = 'none';
                        cellWidth = `${colWidths[c] + 4}px`;
                        cellHeight = '59px';
                        cellMargin = '0px';
                        borderRadius = '0px';
                    } else if (item.type === 'empty') {
                        bgColor = 'white';
                        textColor = 'transparent';
                        content = ''; // Bomboş beyaz
                        borderStyle = 'none'; 
                        cellWidth = `${colWidths[c] + 4}px`;
                        cellHeight = '59px';
                        cellMargin = '0px';
                        borderRadius = '0px';
                    } else if (item.type === 'label') {
                        bgColor = '#fef3c7';
                        textColor = '#92400e';
                        content = item.name;
                        borderStyle = '1px solid #d97706';
                    }
                }

                cells.push(
                    <div 
                        key={`${r}-${c}`} 
                        onClick={() => handleCellClick(r, c)}
                        style={{
                            border: borderStyle,
                            height: cellHeight, 
                            minWidth: cellWidth, 
                            maxWidth: cellWidth,
                            width: cellWidth,
                            margin: cellMargin,
                            boxSizing: 'border-box',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: bgColor,
                            color: textColor,
                            cursor: 'pointer',
                            borderRadius: borderRadius,
                            fontWeight: item && item.type === 'shelf' ? 'bold' : 'normal',
                            boxShadow: item && item.type === 'shelf' ? '0 2px 4px -1px rgba(0, 0, 0, 0.1)' : 'none',
                            transition: 'all 0.2s ease',
                            padding: '0 4px',
                            textAlign: 'center',
                            fontSize: '11px',
                            wordBreak: 'break-word',
                            lineHeight: '1.2',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: item && item.type === 'label' ? 'nowrap' : 'normal'
                        }}
                        title={item ? (item.type === 'shelf' ? item.name : (item.type === 'label' ? item.name : 'Koridor')) : 'Boş'}
                        onMouseEnter={(e) => {
                            if(!item) e.currentTarget.style.backgroundColor = '#e2e8f0';
                        }}
                        onMouseLeave={(e) => {
                            if(!item) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                    >
                        {content}
                    </div>
                );
            }
            grid.push(
                <div key={r} style={{ display: 'flex' }}>
                    {cells}
                </div>
            );
        }

        // Yerleştirilen raflar
        const placedShelfCodes = floors.flatMap(f => f.items.filter(i => i.type === 'shelf').map(i => i.name));
        const availableLocations = locations.filter(l => !placedShelfCodes.includes(l.shelfCode));

        // 5. Arayüz (UI) Çizimi ve Render Edilmesi

        return (
            <div className="layout-grid-container" style={{ marginTop: '20px', position: 'relative' }}>
                <style>{`
                    .layout-grid-container .grid-col-header, .layout-grid-container .grid-row-header {
                        opacity: 0.15;
                        background-color: #f1f5f9 !important;
                        color: #94a3b8 !important;
                        transition: all 0.2s ease;
                    }
                    .layout-grid-container:hover .grid-col-header, .layout-grid-container:hover .grid-row-header {
                        opacity: 0.65;
                    }
                    .layout-grid-container .grid-col-header:hover, .layout-grid-container .grid-row-header:hover {
                        opacity: 1 !important;
                        background-color: #334155 !important;
                        color: white !important;
                        transform: scale(1.05);
                    }
                `}</style>
                <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', padding: '10px 0' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                        {grid}
                    </div>
                </div>

                {/* Yönlü Ekleme / Çıkarma Kontrolleri */}
                <div style={{ 
                    marginTop: '20px', 
                    padding: '16px', 
                    backgroundColor: '#f8fafc', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Krokiyi Boyutlandır:</span>
                    <select 
                        value={direction} 
                        onChange={(e) => setDirection(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                        <option value="top">Üst Taraf</option>
                        <option value="bottom">Alt Taraf</option>
                        <option value="left">Sol Taraf</option>
                        <option value="right">Sağ Taraf</option>
                    </select>
                    
                    <button 
                        onClick={handleAddDirection}
                        style={{ padding: '8px 16px', backgroundColor: '#334155', color: 'white', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s' }}
                    >
                        + Genişlet
                    </button>
                    <button 
                        onClick={handleRemoveDirection}
                        style={{ padding: '8px 16px', backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s' }}
                    >
                        - Daralt
                    </button>
                </div>

                {/* Inline Modal */}
                {modalData && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        border: '1px solid #cbd5e1',
                        zIndex: 10,
                        minWidth: '250px'
                    }}>
                        {modalData.step === 1 && (
                            <>
                                <h4 style={{ marginTop: 0, marginBottom: '16px', color: '#0f172a', fontSize: '15px' }}>
                                    {modalData.type === 'bulk' ? `Tüm ${modalData.targetType === 'row' ? 'Satır' : 'Sütun'} İçin Seçim Yapın:` : 'Bu hücre için işlem seçin:'}
                                </h4>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button 
                                        onClick={() => setModalData({...modalData, step: 2})}
                                        style={{ padding: '8px 12px', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        Raf Ekle
                                    </button>
                                    <button 
                                        onClick={addCorridor}
                                        style={{ padding: '8px 12px', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        Koridor
                                    </button>
                                    <button 
                                        onClick={deleteItem}
                                        style={{ padding: '8px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        Sil
                                    </button>
                                    {modalData.type === 'cell' && (
                                        <button 
                                            onClick={() => setModalData({...modalData, step: 6})}
                                            style={{ padding: '8px 12px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #d97706', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Metin Ekle
                                        </button>
                                    )}
                                </div>
                                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                    <button 
                                        onClick={() => setModalData(null)}
                                        style={{ padding: '6px 12px', backgroundColor: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                                    >
                                        İptal
                                    </button>
                                </div>
                            </>
                        )}
                        
                        {modalData.step === 2 && (
                            <>
                                <h4 style={{ marginTop: 0, marginBottom: '16px', color: '#0f172a', fontSize: '15px' }}>Mevcut Raflardan Seçin</h4>
                                {availableLocations.length > 0 ? (
                                    <>
                                        <select
                                            value={selectedShelfCode}
                                            onChange={e => setSelectedShelfCode(e.target.value)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '12px' }}
                                        >
                                            <option value="">Seçiniz...</option>
                                            {availableLocations.map(l => (
                                                <option key={l.shelfCode} value={l.shelfCode}>{l.shelfCode}</option>
                                            ))}
                                        </select>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button 
                                                onClick={confirmShelf}
                                                disabled={!selectedShelfCode}
                                                style={{ padding: '8px 12px', backgroundColor: selectedShelfCode ? '#334155' : '#94a3b8', color: 'white', border: 'none', borderRadius: '4px', cursor: selectedShelfCode ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
                                            >
                                                Kaydet
                                            </button>
                                            <button 
                                                onClick={() => setModalData({...modalData, step: 1})}
                                                style={{ padding: '8px 12px', backgroundColor: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                Geri
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>Bu depoda eklenecek boşta raf kalmadı veya hiç raf oluşturulmamış.</p>
                                        <button 
                                            onClick={() => setModalData(null)}
                                            style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Kapat
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {modalData.step === 4 && (
                            <div style={{ minWidth: '350px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px' }}>
                                    <h4 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>Raf Detayı: {modalData.shelfCode}</h4>
                                    <button 
                                        onClick={() => setModalData({...modalData, step: 5})}
                                        style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                    >
                                        + Stok Ekle
                                    </button>
                                </div>

                                {loadingShelf ? (
                                    <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', margin: '20px 0' }}>Yükleniyor...</p>
                                ) : shelfDetails ? (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '4px', color: '#334155' }}>
                                            <div><strong style={{ color: '#0f172a' }}>Maks. Hacim:</strong> {shelfDetails.maxVolume.toFixed(2)} cm³</div>
                                            <div><strong style={{ color: '#0f172a' }}>Boş Yer:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>{shelfDetails.emptyVolume.toFixed(2)} cm³</span></div>
                                        </div>

                                        <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#0f172a' }}>Raftaki Ürünler</h5>
                                        {shelfDetails.products && shelfDetails.products.length > 0 ? (() => {
                                            const sW = parseFloat(shelfDetails.shelfDimensions?.width) || 0;
                                            const sH = parseFloat(shelfDetails.shelfDimensions?.height) || 0;
                                            const sD = parseFloat(shelfDetails.shelfDimensions?.depth) || 0;
                                            
                                            const grouped = {};
                                            shelfDetails.products.forEach(p => {
                                                const key = p.product_id || p.ProductName;
                                                if (!grouped[key]) {
                                                    grouped[key] = {
                                                        product_id: p.product_id,
                                                        ProductName: p.ProductName,
                                                        Barcode: p.Barcode,
                                                        Width: p.Width,
                                                        Height: p.Height,
                                                        Depth: p.Depth,
                                                        Volume: p.Volume,
                                                        package_capacity: p.package_capacity,
                                                        unit_type: p.unit_type || 'Adet',
                                                        package_name: p.package_name || 'Kap',
                                                        is_stackable: p.is_stackable,
                                                        max_stack_limit: p.max_stack_limit,
                                                        items: []
                                                    };
                                                }
                                                grouped[key].items.push(p);
                                            });

                                            return (
                                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '250px', overflowY: 'auto' }}>
                                                    {Object.values(grouped).map((group, idx) => {
                                                        const cleanBarcode = group.Barcode ? group.Barcode.replace(/[\[\]"]/g, '') : '';
                                                        let maxItems = '∞';
                                                        
                                                        const pW = parseFloat(group.Width) || 0;
                                                        const pH = parseFloat(group.Height) || 0;
                                                        const pD = parseFloat(group.Depth) || 0;
                                                        
                                                        if (sW > 0 && sH > 0 && sD > 0 && pW > 0 && pH > 0 && pD > 0) {
                                                            const usableW = Math.max(0, sW - 10);
                                                            const usableH = Math.max(0, sH - 5);
                                                            const usableD = Math.max(0, sD - 5);

                                                            const wCount = Math.floor(usableW / pW);
                                                            const dCount = Math.floor(usableD / pD);
                                                            const baseCount = wCount * dCount;
                                                            
                                                            let hCount = Math.floor(usableH / pH);
                                                            const isStackable = group.is_stackable === 1 || group.is_stackable === true || group.is_stackable === '1';
                                                            
                                                            if (isStackable) {
                                                                const stackLimit = parseInt(group.max_stack_limit) || 1;
                                                                if (hCount > stackLimit) hCount = stackLimit;
                                                            } else {
                                                                hCount = 1;
                                                            }
                                                            
                                                            maxItems = baseCount * hCount;
                                                        } else {
                                                            const volPerItem = (parseFloat(group.Volume) || 0) / (parseFloat(group.package_capacity) || 1);
                                                            maxItems = volPerItem > 0 ? Math.floor(shelfDetails.maxVolume / volPerItem) : '∞';
                                                        }

                                                        const totalQty = group.items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0);

                                                        const maxTotalQty = maxItems !== '∞' ? maxItems * (parseFloat(group.package_capacity) || 1) : '∞';

                                                        const formatUnitStr = (qty, u) => {
                                                            if ((u === 'gr' || u === 'ml') && qty >= 1000) {
                                                                return `${+(qty / 1000).toFixed(2)} ${u === 'gr' ? 'kg' : 'L'}`;
                                                            }
                                                            return `${qty} ${u}`;
                                                        };
                                                        const formatDualStr = (qty, cap, u) => {
                                                            if ((u === 'gr' || u === 'ml') && (qty >= 1000 || (cap !== '∞' && cap >= 1000))) {
                                                                const targetU = u === 'gr' ? 'kg' : 'L';
                                                                const q = +(qty / 1000).toFixed(2);
                                                                if (cap !== '∞' && cap > 0) {
                                                                    const c = +(cap / 1000).toFixed(2);
                                                                    return `${q} / ${c} ${targetU}`;
                                                                }
                                                                return `${q} ${targetU}`;
                                                            }
                                                            if (cap !== '∞' && cap > 0) return `${qty} / ${cap} ${u}`;
                                                            return `${qty} ${u}`;
                                                        };

                                                        return (
                                                            <li key={group.product_id || idx} style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#334155', backgroundColor: '#fff', marginBottom: '6px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: group.items.length > 0 ? '6px' : '0' }}>
                                                                    <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{group.ProductName} <small style={{ color: '#64748b', fontWeight: 'normal' }}>({cleanBarcode})</small></span>
                                                                    <span style={{ fontWeight: 'bold', color: '#0f172a', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', textAlign: 'right' }}>
                                                                        {formatDualStr(totalQty, maxTotalQty, group.unit_type)}
                                                                        {group.unit_type !== 'Adet' && group.package_capacity > 0 && maxItems !== '∞' && (
                                                                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontWeight: 'normal' }}>
                                                                                ({Math.ceil(totalQty / group.package_capacity)} / {maxItems} {group.package_name})
                                                                            </div>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                {group.items.map((item, itemIdx) => (
                                                                    <div key={item.id || itemIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '4px', marginTop: '4px', fontSize: '12px', borderLeft: '3px solid #3b82f6' }}>
                                                                        <div>
                                                                            <span style={{ fontWeight: '600', color: '#334155' }}>Parti: {item.batch_number || 'Belirtilmedi'}</span>
                                                                            {item.expiration_date && (
                                                                                <span style={{ marginLeft: '8px', color: '#64748b' }}>SKT: {new Date(item.expiration_date).toLocaleDateString('tr-TR')}</span>
                                                                            )}
                                                                        </div>
                                                                        <span style={{ fontWeight: '700', color: '#10b981' }}>{formatUnitStr(item.quantity, group.unit_type)}</span>
                                                                    </div>
                                                                ))}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            );
                                        })() : (
                                            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '10px 0' }}>Bu raf şu an boş.</p>
                                        )}
                                    </div>
                                ) : (
                                    <p style={{ color: '#ef4444', fontSize: '13px' }}>Raf detayı alınamadı.</p>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                                    <button 
                                        onClick={clearShelf}
                                        style={{ padding: '8px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                    >
                                        Raftaki Ürünleri Boşalt
                                    </button>
                                    <div>
                                        <button 
                                            onClick={() => setModalData({...modalData, step: 1})}
                                            style={{ padding: '8px 12px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginRight: '8px' }}
                                        >
                                            Krokiden Kaldır
                                        </button>
                                        <button 
                                            onClick={() => setModalData(null)}
                                            style={{ padding: '8px 12px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                        >
                                            Kapat
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {modalData.step === 5 && (
                            <div style={{ minWidth: '320px' }}>
                                <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '16px' }}>Stok Ekle ({modalData.shelfCode})</h4>
                                <form onSubmit={submitStock}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Barkod veya Ürün Adı Okutun *</label>
                                        <input 
                                            type="text" 
                                            value={barcodeInput}
                                            onChange={e => setBarcodeInput(e.target.value)}
                                            autoFocus
                                            placeholder="Barkod okutun..."
                                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                            required
                                        />
                                        {(() => {
                                            if (!barcodeInput || !shelfDetails) return null;
                                            const searchVal = barcodeInput.trim();
                                            if (!searchVal) return null;
                                            const product = products.find(p => {
                                                const cleanBarcode = p.Barcode ? p.Barcode.replace(/[\[\]"]/g, '') : '';
                                                const searchInField = (field) => {
                                                    if (!field) return false;
                                                    if (typeof field === 'string') return field.toLowerCase().includes(searchVal.toLowerCase());
                                                    if (Array.isArray(field)) return field.some(i => i.toLowerCase().includes(searchVal.toLowerCase()));
                                                    return JSON.stringify(field).toLowerCase().includes(searchVal.toLowerCase());
                                                };
                                                const matchBarcode = cleanBarcode.split(',').map(b => b.trim()).includes(searchVal);
                                                const matchName = p.ProductName && p.ProductName.toLowerCase().includes(searchVal.toLowerCase());
                                                const matchCat = p.Category && p.Category.toLowerCase().includes(searchVal.toLowerCase());
                                                const matchBrand = p.Brand && p.Brand.toLowerCase().includes(searchVal.toLowerCase());
                                                const matchWeb = searchInField(p.web_categories) || searchInField(p.web_subcategories) || searchInField(p.web_subtitles);
                                                return matchBarcode || matchName || matchCat || matchBrand || matchWeb;
                                            });
                                            if (!product) return <div style={{marginTop: '6px', fontSize: '12px', color: '#ef4444'}}>Ürün bulunamadı.</div>;
                                            
                                            let maxItems = '∞';
                                            const sW = parseFloat(shelfDetails.shelfDimensions?.width) || 0;
                                            const sH = parseFloat(shelfDetails.shelfDimensions?.height) || 0;
                                            const sD = parseFloat(shelfDetails.shelfDimensions?.depth) || 0;
                                            
                                            const pW = parseFloat(product.Width) || 0;
                                            const pH = parseFloat(product.Height) || 0;
                                            const pD = parseFloat(product.Depth) || 0;
                                        
                                            if (sW > 0 && sH > 0 && sD > 0 && pW > 0 && pH > 0 && pD > 0) {
                                                const usableW = Math.max(0, sW - 10);
                                                const usableH = Math.max(0, sH - 5);
                                                const usableD = Math.max(0, sD - 5);
                                                const wCount = Math.floor(usableW / pW);
                                                const dCount = Math.floor(usableD / pD);
                                                let hCount = Math.floor(usableH / pH);
                                                const isStackable = product.is_stackable === 1 || product.is_stackable === true || product.is_stackable === '1';
                                                
                                                if (isStackable) {
                                                    const stackLimit = parseInt(product.max_stack_limit) || 1;
                                                    if (hCount > stackLimit) hCount = stackLimit;
                                                } else {
                                                    hCount = 1;
                                                }
                                                maxItems = (wCount * dCount) * hCount;
                                            } else {
                                                const volPerItem = (parseFloat(product.Volume) || 0) / (parseFloat(product.package_capacity) || 1);
                                                maxItems = volPerItem > 0 ? Math.floor(shelfDetails.maxVolume / volPerItem) : '∞';
                                            }
                                            
                                            
                                            const totalOnShelfQty = shelfDetails.products 
                                                ? shelfDetails.products.filter(p => p.product_id === product.Id).reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0)
                                                : 0;
                                                
                                            let remainingBoxes = '∞';
                                            if (maxItems !== '∞') {
                                                const usedBoxes = Math.ceil(totalOnShelfQty / (parseFloat(product.package_capacity) || 1));
                                                remainingBoxes = Math.max(0, maxItems - usedBoxes);
                                            }
                                            
                                            return (
                                                <div style={{marginTop: '8px', padding: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px'}}>
                                                    <div style={{fontSize: '13px', color: '#166534', fontWeight: 'bold'}}>{product.ProductName} <small style={{color: '#15803d', fontWeight: 'normal'}}>({product.package_capacity} {product.unit_type} / {product.package_name || 'Kap'})</small></div>
                                                    <div style={{fontSize: '12px', color: '#15803d', marginTop: '4px'}}>
                                                        Bu rafa sığabilecek boş kapasite: <strong>{remainingBoxes === '∞' ? 'Sınırsız (Ebat tanımlanmamış)' : `${remainingBoxes} ${product.package_name || 'Kap'}`}</strong>
                                                        {remainingBoxes !== '∞' && totalOnShelfQty > 0 && <span style={{opacity: 0.8, marginLeft: '6px'}}>(Rafta zaten {totalOnShelfQty} {product.unit_type} var)</span>}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Parti No *</label>
                                        <input 
                                            type="text" 
                                            value={addBatchNumber}
                                            onChange={e => setAddBatchNumber(e.target.value)}
                                            placeholder="Örn: PRT-2026-001"
                                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Son Kullanma Tarihi (SKT)</label>
                                        <input 
                                            type="date" 
                                            value={addExpirationDate}
                                            onChange={e => setAddExpirationDate(e.target.value)}
                                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Miktar *</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={addQuantity}
                                            onChange={e => setAddQuantity(e.target.value)}
                                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                            required
                                        />
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <button 
                                            type="button"
                                            onClick={() => setModalData({...modalData, step: 4})}
                                            style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            İptal
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={submittingStock}
                                            style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: submittingStock ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                        >
                                            {submittingStock ? 'Ekleniyor...' : 'Stoğa Ekle'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {modalData.step === 6 && (
                            <div style={{ minWidth: '280px' }}>
                                <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '16px' }}>Metin Kutusu Ekle</h4>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Metin Giriniz</label>
                                    <input 
                                        type="text"
                                        value={labelInput}
                                        onChange={e => setLabelInput(e.target.value)}
                                        autoFocus
                                        placeholder="Sipariş Masası, Başlangıç vb."
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <button 
                                        type="button"
                                        onClick={() => setModalData({...modalData, step: 1})}
                                        style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        Geri
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={addLabel}
                                        disabled={!labelInput.trim()}
                                        style={{ padding: '8px 16px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #d97706', borderRadius: '4px', cursor: !labelInput.trim() ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: !labelInput.trim() ? 0.5 : 1 }}
                                    >
                                        Kaydet
                                    </button>
                                </div>
                            </div>
                        )}

                        {modalData.step === 7 && (
                            <div style={{ minWidth: '280px' }}>
                                <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '16px' }}>📝 Metin Kutusu</h4>
                                <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #d97706', marginBottom: '16px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#92400e' }}>{modalData.labelText}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <button 
                                        onClick={() => {
                                            setModalData({...modalData, type: 'cell', step: 1});
                                        }}
                                        style={{ padding: '8px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                    >
                                        Kaldır
                                    </button>
                                    <div>
                                        <button 
                                            onClick={() => {
                                                setLabelInput(modalData.labelText);
                                                setModalData({...modalData, type: 'cell', step: 6});
                                            }}
                                            style={{ padding: '8px 12px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #d97706', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginRight: '8px' }}
                                        >
                                            Düzenle
                                        </button>
                                        <button 
                                            onClick={() => setModalData(null)}
                                            style={{ padding: '8px 12px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                        >
                                            Kapat
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: 'calc(100vh - 120px)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>Depo Krokisi Yönetimi</h2>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>Deponuzun fiziksel yapısını oluşturun ve rafları konumlandırın.</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Depo Seçin:</div>
                    <select 
                        value={selectedWarehouse}
                        onChange={(e) => {
                            setSelectedWarehouse(e.target.value);
                            setFloors([{ id: 1, name: 'Zemin Kat', rows: 10, cols: 10, items: [] }]);
                            setActiveFloorId(1);
                            setModalData(null);
                            setDirection('bottom');
                            setSearchBarcode('');
                            setHighlightedShelves([]);
                        }}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', minWidth: '200px' }}
                        disabled={loading}
                    >
                        <option value="">-- Seçiniz --</option>
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>
                
                {selectedWarehouse && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, marginLeft: '24px' }}>
                        <form onSubmit={handleSearchProduct} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Ürün Bul:</div>
                            <input 
                                type="text"
                                value={searchBarcode}
                                onChange={e => setSearchBarcode(e.target.value)}
                                placeholder="Barkod veya Ürün Adı"
                                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '200px' }}
                            />
                            <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Ara
                            </button>
                            {highlightedShelves.length > 0 && (
                                <button type="button" onClick={() => { setHighlightedShelves([]); setSearchBarcode(''); }} style={{ padding: '8px 16px', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Temizle
                                </button>
                            )}
                        </form>
                    </div>
                )}
            </div>

            {selectedWarehouse ? (
                <div style={{ 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    padding: '24px',
                    backgroundColor: '#f1f5f9' 
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
                            {warehouses.find(w => w.id == selectedWarehouse)?.name} Krokisi
                        </h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                                <div style={{ width: '16px', height: '16px', backgroundColor: '#334155', borderRadius: '4px' }}></div> Dolu/Raf
                            </span>
                            <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                                <div style={{ width: '16px', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></div> Koridor
                            </span>
                            <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                                <div style={{ width: '16px', height: '16px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '4px' }}></div> Seçilebilir Alan
                            </span>
                            <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                                <div style={{ width: '16px', height: '16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '4px' }}></div> Boş (Silinmiş)
                            </span>
                            <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                                <div style={{ width: '16px', height: '16px', backgroundColor: '#fef3c7', border: '1px solid #d97706', borderRadius: '4px' }}></div> Metin
                            </span>
                        </div>
                    </div>
                    
                    {/* Kat Sekmeleri */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', overflowX: 'auto' }}>
                        {floors.map(floor => (
                            <button
                                key={floor.id}
                                onClick={() => setActiveFloorId(floor.id)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: activeFloorId === floor.id ? '#3b82f6' : '#e2e8f0',
                                    color: activeFloorId === floor.id ? 'white' : '#334155',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {floor.name}
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                const newId = Math.max(...floors.map(f => f.id), 0) + 1;
                                const newFloorName = "Kat " + newId;
                                setFloors([...floors, { id: newId, name: newFloorName, rows: 10, cols: 10, items: [] }]);
                                setActiveFloorId(newId);
                            }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: '1px dashed #94a3b8',
                                backgroundColor: 'transparent',
                                color: '#475569',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            + Kat Ekle
                        </button>
                        <button
                            onClick={() => {
                                if (floors.length <= 1) return;
                                const newFloors = floors.filter(f => f.id !== activeFloorId);
                                setFloors(newFloors);
                                setActiveFloorId(newFloors[0].id);
                            }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: '1px solid #ef4444',
                                backgroundColor: '#fef2f2',
                                color: '#ef4444',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                marginLeft: 'auto'
                            }}
                        >
                            Katı Sil
                        </button>
                    </div>
                    
                    {renderGrid()}
                    
                    <div style={{ marginTop: '30px', padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Bilgi:</h4>
                        <ul style={{ fontSize: '13px', color: '#64748b', margin: 0, paddingLeft: '20px' }}>
                            <li>Izgaranın üstündeki "Seç" ve solundaki ok (▶) tuşlarına basarak tüm satırı veya tüm sütunu aynı anda Koridor yapabilir veya silebilirsiniz.</li>
                            <li>Hücrelere tıklayarak o alana müdahale edebilir veya depodaki mevcut rafları krokiye yerleştirebilirsiniz.</li>
                            <li>Kroki boyutunu değiştirmek için ızgaranın altındaki "Boyutlandır" panelinden yön seçip "Genişlet" veya "Daralt" butonlarını kullanabilirsiniz.</li>
                        </ul>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <button
                            onClick={handleSaveLayout}
                            disabled={savingLayout}
                            style={{
                                padding: '12px 28px',
                                backgroundColor: '#334155',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: '600',
                                fontSize: '14px',
                                cursor: savingLayout ? 'not-allowed' : 'pointer',
                                opacity: savingLayout ? 0.7 : 1,
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {savingLayout ? 'Kaydediliyor...' : 'Krokiyi Kaydet'}
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <p style={{ color: '#64748b' }}>Lütfen krokiyi görüntülemek veya düzenlemek için yukarıdan bir depo seçiniz.</p>
                </div>
            )}
        </div>
    );
};

export default WarehouseLayout;

