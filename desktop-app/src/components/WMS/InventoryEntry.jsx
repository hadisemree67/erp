/**
 * ============================================================================
 * BİLEŞEN ADI: InventoryEntry
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Depo (WMS), stok giriş-çıkış, envanter ve raf işlemlerini yöneten ekran.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (InventoryEntry.jsx), Mal kabul, stok giriş/çıkış, raf transferleri ve genel depo envanter işlemlerini (Warehouse Management System) yönetir.
 */

import { apiFetch } from '../../utils/api';
import React, { useState, useEffect } from 'react';
import ShelfBarcodeScanner from './ShelfBarcodeScanner';
import Barcode from 'react-barcode';

const InventoryEntry = ({ currentUser, initialMaterialName = '', editItem = null, onCancel, onSuccess }) => {
    const isEditProduct = !!editItem;
    const isAddStock = !!initialMaterialName && !editItem;

    // 1. Durum (State) Tanımlamaları ve Hook'lar

    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [shelves, setShelves] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [brandList, setBrandList] = useState([]);
    const [showNewBrandInput, setShowNewBrandInput] = useState(false);
    const [newBrandName, setNewBrandName] = useState('');
    const [addingBrand, setAddingBrand] = useState(false);

    // Scanning Modal states
    const [warehouseSearchBarcode, setWarehouseSearchBarcode] = useState('');
    const [shelfSearchBarcode, setShelfSearchBarcode] = useState('');
    const [scanningModal, setScanningModal] = useState({ open: false, type: null }); // type: 'warehouse' | 'shelf'

    // Barcode States
    const parseInitialBarcodes = () => {
        if (!editItem || !editItem.barcode) return [''];
        try {
            const parsed = JSON.parse(editItem.barcode);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            return [editItem.barcode];
        } catch (e) {
            return [editItem.barcode];
        }
    };
    const [barcodes, setBarcodes] = useState(parseInitialBarcodes());
    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [currentScanningIndex, setCurrentScanningIndex] = useState(null);

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleBarcodeChange = (index, value) => {
        const newBarcodes = [...barcodes];
        newBarcodes[index] = value;
        setBarcodes(newBarcodes);

        if (value.trim() !== '') {
            const existingProduct = products.find(p => {
                if (!p.Barcode) return false;
                try {
                    const parsed = JSON.parse(p.Barcode);
                    return Array.isArray(parsed) && parsed.includes(value.trim());
                } catch (err) {
                    return p.Barcode === value.trim();
                }
            });

            if (existingProduct) {
                setFormData(prev => ({
                    ...prev,
                    materialName: existingProduct.ProductName || '',
                    brand: existingProduct.Brand || '',
                    unit_type: existingProduct.unit_type || 'Adet',
                    package_name: existingProduct.package_name || '',
                    package_capacity: existingProduct.package_capacity || '',
                    width: existingProduct.Width || '',
                    height: existingProduct.Height || '',
                    depth: existingProduct.Depth || '',
                    is_stackable: existingProduct.is_stackable === 1 || existingProduct.is_stackable === true,
                    max_stack_limit: existingProduct.max_stack_limit || ''
                }));
            }
        }
    };

    const addBarcodeField = () => {
        setBarcodes([...barcodes, '']);
    };

    const removeBarcodeField = (index) => {
        const newBarcodes = barcodes.filter((_, i) => i !== index);
        if (newBarcodes.length === 0) newBarcodes.push('');
        setBarcodes(newBarcodes);
    };

    const getBatch = () => editItem && editItem.batches && editItem.batches.length > 0 ? editItem.batches[0] : null;
    const batch = getBatch();

    const [formData, setFormData] = useState({
        materialName: editItem ? editItem.product_name : initialMaterialName,
        brand: editItem ? editItem.brand || '' : '',
        warehouseId: batch ? batch.warehouse_id || '' : '',
        shelfAllocations: [{
            shelfCode: batch ? batch.shelf_code || '' : '',
            quantity: batch ? batch.quantity || '' : ''
        }],
        batchNumber: batch ? batch.batch_number || '' : '',
        lead_time_days: editItem ? (editItem.product?.lead_time_days || editItem.lead_time_days || '') : '',
        supplierId: batch ? batch.supplier_id || '' : (editItem && editItem.product ? editItem.product.supplier_id || '' : ''),
        shelf_life_months: editItem ? (editItem.product?.shelf_life_months || editItem.shelf_life_months || '') : '',
        unit_type: editItem ? (editItem.product?.unit_type || editItem.unit_type || 'Adet') : 'Adet',
        package_name: editItem ? (editItem.product?.package_name || editItem.package_name || '') : '',
        package_capacity: editItem ? (editItem.product?.package_capacity || editItem.package_capacity || '') : '',
        description: editItem ? (editItem.product?.Description || editItem.Description || '') : '',
        width: editItem ? (editItem.product?.Width || editItem.product_width || '') : '',
        height: editItem ? (editItem.product?.Height || editItem.product_height || '') : '',
        depth: editItem ? (editItem.product?.Depth || editItem.product_depth || '') : '',
        weight: editItem ? (editItem.product?.Weight || editItem.product_weight || '') : '',
        is_stackable: editItem ? ((editItem.product?.is_stackable === 1 || editItem.product?.is_stackable === true) || (editItem.is_stackable === 1 || editItem.is_stackable === true)) : false,
        max_stack_limit: editItem ? (editItem.product?.max_stack_limit || editItem.max_stack_limit || '') : '',
        critical_stock_level: editItem ? (editItem.product?.critical_stock_level || editItem.critical_stock_level || '') : '',
        contract_start_date: editItem ? (editItem.product?.contract_start_date ? editItem.product.contract_start_date.split('T')[0] : (editItem.contract_start_date ? editItem.contract_start_date.split('T')[0] : '')) : '',
        contract_end_date: editItem ? (editItem.product?.contract_end_date ? editItem.product.contract_end_date.split('T')[0] : (editItem.contract_end_date ? editItem.contract_end_date.split('T')[0] : '')) : ''
    });




    const [contractFile, setContractFile] = useState(null);
    const [removeContract, setRemoveContract] = useState(false);
    const [suppliersData, setSuppliersData] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);


    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)


    useEffect(() => {
        if (editItem) {
            const p = editItem.product || editItem;
            if (p.suppliers && p.suppliers.length > 0) {
                setSuppliersData(p.suppliers.map(s => ({
                    ...s,
                    localId: Math.random().toString(),
                    contract_start_date: s.contract_start_date ? s.contract_start_date.split('T')[0] : '',
                    contract_end_date: s.contract_end_date ? s.contract_end_date.split('T')[0] : ''
                })));
            } else if (p.supplier_id) {
                setSuppliersData([{
                    supplier_id: p.supplier_id,
                    contract_start_date: p.contract_start_date ? p.contract_start_date.split('T')[0] : '',
                    contract_end_date: p.contract_end_date ? p.contract_end_date.split('T')[0] : '',
                    contract_file: p.contract_file,
                    localId: Math.random().toString()
                }]);
            } else {
                setSuppliersData([]);
            }
        } else {
            setSuppliersData([]);
        }
    }, [editItem]);

    const [success, setSuccess] = useState(false);
    const [shelfCapacities, setShelfCapacities] = useState({});
    const [allShelvesCapacity, setAllShelvesCapacity] = useState({});

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchProducts = async () => {
        try {
            const res = await apiFetch('http://localhost:3000/api/products');
            const data = await res.json();
            if (Array.isArray(data)) {
                // Sadece Hammadde olanları filtrele
                setProducts(data.filter(p => p.Category === 'Hammadde'));
            }
        } catch (err) {
            console.error('Products fetch error:', err);
        }
    };

    const fetchBrands = async () => {
        try {
            const res = await apiFetch('http://localhost:3000/api/brands');
            const data = await res.json();
            if (Array.isArray(data)) setBrandList(data);
        } catch (err) { console.warn("Sessiz Hata Yakalandı:", err.message); }
    };

    const handleAddBrand = async () => {
        if (!newBrandName.trim()) return;
        setAddingBrand(true);
        try {
            const res = await apiFetch('http://localhost:3000/api/brands', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
                body: JSON.stringify({ name: newBrandName.trim() })
            });
            const data = await res.json();
            if (data.success) {
                await fetchBrands();
                setFormData({ ...formData, brand: data.name });
                setShowNewBrandInput(false);
                setNewBrandName('');
            }
        } catch (err) { console.warn("Sessiz Hata Yakalandı:", err.message); } finally {
            setAddingBrand(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                await fetchProducts();
                await fetchBrands();
                const [whRes, supRes] = await Promise.all([
                    apiFetch('http://localhost:3000/api/warehouses'),
                    apiFetch('http://localhost:3000/api/suppliers')
                ]);
                const whData = await whRes.json();
                const supData = await supRes.json();

                if (Array.isArray(whData)) setWarehouses(whData.filter(w => w.warehouse_type === 'HAMMADDE'));
                if (supData && Array.isArray(supData.data)) setSuppliers(supData.data);
            } catch (err) {
                console.error(err);
                setError('Veriler yüklenirken hata oluştu.');
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!formData.warehouseId) {
            setShelves([]);
            setFormData(prev => ({ ...prev, shelfAllocations: [{ shelfCode: '', quantity: prev.shelfAllocations[0]?.quantity || '' }] }));
            return;
        }

        const selectedWh = warehouses.find(w => w.id.toString() === formData.warehouseId.toString());
        if (selectedWh && selectedWh.Shelves) {
            setShelves(selectedWh.Shelves);
            setFormData(prev => {
                const existingCode = prev.shelfAllocations[0]?.shelfCode;
                if (existingCode && selectedWh.Shelves.includes(existingCode)) {
                    return prev;
                }
                const existingAlloc = prev.shelfAllocations[0] || {};
                if (selectedWh.Shelves.length > 0) {
                    const sCode = selectedWh.Shelves.includes(existingAlloc.shelfCode) ? existingAlloc.shelfCode : selectedWh.Shelves[0];
                    return { ...prev, shelfAllocations: [{ shelfCode: sCode, quantity: existingAlloc.quantity !== undefined ? existingAlloc.quantity : '' }] };
                } else {
                    return { ...prev, shelfAllocations: [{ shelfCode: '', quantity: existingAlloc.quantity !== undefined ? existingAlloc.quantity : '' }] };
                }
            });
        } else {
            setShelves([]);
            setFormData(prev => ({ ...prev, shelfAllocations: [{ shelfCode: '', quantity: prev.shelfAllocations[0]?.quantity !== undefined ? prev.shelfAllocations[0].quantity : '' }] }));
        }
    }, [formData.warehouseId, warehouses]);

    /**
     * @param {number} warehouse_id 
     * @param {string} shelf_code 
     * Barkod okuyucudan gelen rafı doğrudan state'e ekler (immutability kurallarına uygun).
     */
    const handleShelfFound = (warehouse_id, shelf_code) => {
        setFormData(prev => {
            const newAllocations = [...prev.shelfAllocations];
            if (newAllocations.length > 0) {
                newAllocations[0] = { ...newAllocations[0], shelfCode: shelf_code };
            } else {
                newAllocations.push({ shelfCode: shelf_code, quantity: '' });
            }
            return { ...prev, warehouseId: warehouse_id, shelfAllocations: newAllocations };
        });
    };

    useEffect(() => {
        const existingProduct = products.find(p => p.ProductName && p.ProductName.toLowerCase() === formData.materialName.trim().toLowerCase());
        const targetProductId = existingProduct ? existingProduct.Id : null;

        if (!formData.warehouseId) {
            setShelfCapacities({});
            return;
        }

        const fetchCapacities = async () => {
            const newCaps = { ...shelfCapacities };
            let hasChanges = false;

            // Eğer formda manuel ölçüler girildiyse (eksik ölçüleri tamamlama veya yeni ürün) bunları API'ye gönder.
            const queryParams = new URLSearchParams({
                warehouseId: formData.warehouseId
            });
            if (targetProductId) queryParams.append('productId', targetProductId);

            if (formData.width && formData.height && formData.depth) {
                queryParams.append('pW', formData.width);
                queryParams.append('pH', formData.height);
                queryParams.append('pD', formData.depth);
                queryParams.append('pVol', (parseFloat(formData.width) * parseFloat(formData.height) * parseFloat(formData.depth)).toString());
                queryParams.append('pStack', formData.is_stackable ? '1' : '0');
                if (formData.is_stackable && formData.max_stack_limit) queryParams.append('pLimit', formData.max_stack_limit);
                if (formData.package_capacity) queryParams.append('pCap', formData.package_capacity);
            }

            for (const alloc of formData.shelfAllocations) {
                if (alloc.shelfCode) {
                    try {
                        queryParams.set('shelfCode', alloc.shelfCode);
                        const res = await apiFetch(`http://localhost:3000/api/wms/shelf-capacity?${queryParams.toString()}`);
                        const data = await res.json();
                        if (data.success && data.hasVolumeInfo) {
                            if (JSON.stringify(newCaps[alloc.shelfCode]) !== JSON.stringify(data)) {
                                newCaps[alloc.shelfCode] = data;
                                hasChanges = true;
                            }
                        } else {
                            if (newCaps[alloc.shelfCode] !== null) {
                                newCaps[alloc.shelfCode] = null;
                                hasChanges = true;
                            }
                        }
                    } catch (e) { console.warn("Sessiz Hata Yakalandı:", e.message); }
                }
            }
            if (hasChanges) {
                setShelfCapacities(newCaps);
            }
        };
        fetchCapacities();
    }, [formData.productId, formData.warehouseId, formData.shelfAllocations, formData.width, formData.height, formData.depth, formData.is_stackable, formData.max_stack_limit, formData.package_capacity]);

    useEffect(() => {
        if (formData.warehouseId) {
            const existingProduct = products.find(p => p.ProductName && p.ProductName.toLowerCase() === formData.materialName.trim().toLowerCase());
            const pId = existingProduct ? existingProduct.Id : (editItem ? editItem.product_id : 'new');
            const qs = `warehouseId=${formData.warehouseId}&productId=${pId}&w=${formData.width || 0}&h=${formData.height || 0}&d=${formData.depth || 0}&stackable=${formData.is_stackable ? 1 : 0}&max_stack=${formData.max_stack_limit || 1}&pCap=${formData.package_capacity || 1}`;

            apiFetch(`http://localhost:3000/api/wms/warehouse-capacities?${qs}`)
                .then(r => r.json())
                .then(d => {
                    if (d.success) setAllShelvesCapacity(d.data);
                }).catch(e => { });
        } else {
            setAllShelvesCapacity({});
        }
    }, [formData.warehouseId, formData.materialName, products, editItem, formData.width, formData.height, formData.depth, formData.is_stackable, formData.max_stack_limit, formData.package_capacity]);

    useEffect(() => {
        return; // DEVRE DIŞI BIRAKILDI: Sonsuz döngü ve sunucu çökmelerini önlemek için.
        if (!shelves || shelves.length === 0 || !allShelvesCapacity || Object.keys(allShelvesCapacity).length === 0) return;

        setFormData(prev => {
            let changed = false;
            const newAllocations = prev.shelfAllocations.map((alloc, index) => {
                const capCurrent = allShelvesCapacity[alloc.shelfCode];
                const isCurrentFull = alloc.shelfCode && capCurrent && (capCurrent.maxItems === 0 || !capCurrent.physicallyFits);

                if (!alloc.shelfCode || isCurrentFull) {
                    const otherSelectedShelves = prev.shelfAllocations.filter((_, i) => i !== index).map(a => a.shelfCode).filter(Boolean);
                    const sortedShelves = [...shelves].sort((a, b) => {
                        const capA = allShelvesCapacity[a];
                        const capB = allShelvesCapacity[b];
                        const isFullA = capA && (capA.maxItems === 0 || !capA.physicallyFits);
                        const isFullB = capB && (capB.maxItems === 0 || !capB.physicallyFits);

                        const usedA = otherSelectedShelves.includes(a);
                        const usedB = otherSelectedShelves.includes(b);
                        if (usedA && !usedB) return 1;
                        if (!usedA && usedB) return -1;

                        if (isFullA && !isFullB) return 1;
                        if (!isFullA && isFullB) return -1;

                        const hasSameA = capA && capA.hasSameProduct;
                        const hasSameB = capB && capB.hasSameProduct;
                        if (hasSameA && !hasSameB) return -1;
                        if (!hasSameA && hasSameB) return 1;

                        const maxA = capA ? (capA.maxItems === Infinity ? 9999999 : capA.maxItems) : 0;
                        const maxB = capB ? (capB.maxItems === Infinity ? 9999999 : capB.maxItems) : 0;
                        if (maxA !== maxB) return maxB - maxA;

                        const effA = capA ? capA.efficiency : 0;
                        const effB = capB ? capB.efficiency : 0;
                        return effB - effA;
                    });

                    const bestShelf = sortedShelves[0];
                    const bestCap = allShelvesCapacity[bestShelf];
                    const isBestFull = bestCap && (bestCap.maxItems === 0 || !bestCap.physicallyFits);

                    if (bestShelf && !isBestFull && alloc.shelfCode !== bestShelf) {
                        changed = true;
                        return { ...alloc, shelfCode: bestShelf };
                    }
                }
                return alloc;
            });
            return changed ? { ...prev, shelfAllocations: newAllocations } : prev;
        });
    }, [allShelvesCapacity, shelves]);

    const handleAllocationChange = (index, field, value) => {
        const newAllocations = [...formData.shelfAllocations];
        newAllocations[index][field] = value;
        setFormData({ ...formData, shelfAllocations: newAllocations });
        setError(null);
        setSuccess(false);
    };

    const addAllocationField = () => {
        setFormData({
            ...formData,
            shelfAllocations: [...formData.shelfAllocations, { shelfCode: '', quantity: '' }]
        });
    };

    const removeAllocationField = (index) => {
        const newAllocations = formData.shelfAllocations.filter((_, i) => i !== index);
        if (newAllocations.length === 0) newAllocations.push({ shelfCode: '', quantity: '' });
        setFormData({ ...formData, shelfAllocations: newAllocations });
    };

    useEffect(() => {
        if (products.length > 0 && formData.materialName && !editItem) {
            const existingProduct = products.find(p => p.ProductName && p.ProductName.toLowerCase() === formData.materialName.trim().toLowerCase());
            if (existingProduct && !formData.brand && (!barcodes || barcodes.length === 0 || (barcodes.length === 1 && barcodes[0] === ''))) {
                setFormData(prev => ({
                    ...prev,
                    brand: existingProduct.Brand || '',
                    unit_type: existingProduct.unit_type || 'Adet',
                    package_name: existingProduct.package_name || '',
                    package_capacity: existingProduct.package_capacity || '',
                    width: existingProduct.Width || '',
                    height: existingProduct.Height || '',
                    depth: existingProduct.Depth || '',
                    weight: existingProduct.Weight || '',
                    is_stackable: existingProduct.is_stackable === 1 || existingProduct.is_stackable === true,
                    max_stack_limit: existingProduct.max_stack_limit || '',
                    supplierId: existingProduct.supplier_id || '',
                    unitPrice: existingProduct.PurchasePrice || '',
                    shelf_life_months: existingProduct.shelf_life_months || '',
                    critical_stock_level: existingProduct.critical_stock_level || '',
                    description: existingProduct.Description || '',
                    contract_start_date: existingProduct.contract_start_date ? new Date(existingProduct.contract_start_date).toISOString().split('T')[0] : '',
                    contract_end_date: existingProduct.contract_end_date ? new Date(existingProduct.contract_end_date).toISOString().split('T')[0] : ''
                }));

                // Tedarikçi bilgilerini de yükle
                if (existingProduct.suppliers && existingProduct.suppliers.length > 0) {
                    setSuppliersData(existingProduct.suppliers.map(s => ({
                        ...s,
                        localId: Math.random().toString(),
                        contract_start_date: s.contract_start_date ? s.contract_start_date.split('T')[0] : '',
                        contract_end_date: s.contract_end_date ? s.contract_end_date.split('T')[0] : ''
                    })));
                } else if (existingProduct.supplier_id) {
                    setSuppliersData([{
                        supplier_id: existingProduct.supplier_id,
                        contract_start_date: existingProduct.contract_start_date ? existingProduct.contract_start_date.split('T')[0] : '',
                        contract_end_date: existingProduct.contract_end_date ? existingProduct.contract_end_date.split('T')[0] : '',
                        contract_file: existingProduct.contract_file,
                        localId: Math.random().toString()
                    }]);
                }

                let parsedBarcodes = [''];
                try {
                    const parsed = JSON.parse(existingProduct.Barcode);
                    if (Array.isArray(parsed) && parsed.length > 0) parsedBarcodes = parsed;
                    else if (existingProduct.Barcode) parsedBarcodes = [existingProduct.Barcode];
                } catch (err) {
                    if (existingProduct.Barcode) parsedBarcodes = [existingProduct.Barcode];
                }
                setBarcodes(parsedBarcodes);
            }
        }
    }, [products, formData.materialName, editItem]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setError(null);
        setSuccess(false);

        if (name === 'materialName') {
            const existingProduct = products.find(p => p.ProductName && p.ProductName.toLowerCase() === value.trim().toLowerCase());
            if (existingProduct) {
                setFormData(prev => ({
                    ...prev,
                    materialName: value,
                    brand: existingProduct.Brand || '',
                    unit_type: existingProduct.unit_type || 'Adet',
                    package_name: existingProduct.package_name || '',
                    package_capacity: existingProduct.package_capacity || '',
                    unitPrice: existingProduct.PurchasePrice || '',
                    shelf_life_months: existingProduct.shelf_life_months || '',
                    critical_stock_level: existingProduct.critical_stock_level || '',
                    width: existingProduct.Width || '',
                    height: existingProduct.Height || '',
                    depth: existingProduct.Depth || '',
                    weight: existingProduct.Weight || '',
                    is_stackable: existingProduct.is_stackable === 1 || existingProduct.is_stackable === true,
                    max_stack_limit: existingProduct.max_stack_limit || '',
                    description: existingProduct.Description || ''
                }));

                // Tedarikçi bilgilerini de yükle
                if (existingProduct.suppliers && existingProduct.suppliers.length > 0) {
                    setSuppliersData(existingProduct.suppliers.map(s => ({
                        ...s,
                        localId: Math.random().toString(),
                        contract_start_date: s.contract_start_date ? s.contract_start_date.split('T')[0] : '',
                        contract_end_date: s.contract_end_date ? s.contract_end_date.split('T')[0] : ''
                    })));
                } else if (existingProduct.supplier_id) {
                    setSuppliersData([{
                        supplier_id: existingProduct.supplier_id,
                        contract_start_date: existingProduct.contract_start_date ? existingProduct.contract_start_date.split('T')[0] : '',
                        contract_end_date: existingProduct.contract_end_date ? existingProduct.contract_end_date.split('T')[0] : '',
                        contract_file: existingProduct.contract_file,
                        localId: Math.random().toString()
                    }]);
                } else {
                    setSuppliersData([]);
                }

                let parsedBarcodes = [''];
                try {
                    const parsed = JSON.parse(existingProduct.Barcode);
                    if (Array.isArray(parsed) && parsed.length > 0) parsedBarcodes = parsed;
                    else if (existingProduct.Barcode) parsedBarcodes = [existingProduct.Barcode];
                } catch (err) {
                    if (existingProduct.Barcode) parsedBarcodes = [existingProduct.Barcode];
                }
                setBarcodes(parsedBarcodes);
            } else {
                // Malzeme bulunamadı, tedarikçileri sıfırla
                setSuppliersData([]);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        if (!formData.materialName.trim()) {
            setError('Lütfen bir malzeme adı giriniz.');
            setLoading(false);
            return;
        }

        try {
            let targetProductId = null;

            const createProductFormData = (existingProduct = null) => {
                const fd = new FormData();
                fd.append('ProductName', formData.materialName.trim());
                fd.append('Category', 'Hammadde');
                fd.append('Brand', formData.brand.trim());
                fd.append('Barcode', JSON.stringify(barcodes.filter(b => b.trim() !== '')));

                if (existingProduct) {
                    fd.append('Width', formData.width || existingProduct.Width || 0);
                    fd.append('Height', formData.height || existingProduct.Height || 0);
                    fd.append('Depth', formData.depth || existingProduct.Depth || 0);
                    fd.append('Weight', formData.weight || existingProduct.Weight || 0);
                    fd.append('is_stackable', formData.is_stackable ? 1 : 0);
                    fd.append('max_stack_limit', formData.is_stackable ? (formData.max_stack_limit || 999) : 1);
                    fd.append('unit_type', formData.unit_type || existingProduct.unit_type || 'Adet');
                    fd.append('package_capacity', formData.package_capacity || existingProduct.package_capacity || 1);
                    fd.append('package_name', formData.package_name || existingProduct.package_name || '');
                    fd.append('critical_stock_level', formData.critical_stock_level || existingProduct.critical_stock_level || 0);
                    fd.append('shelf_life_months', formData.shelf_life_months !== '' ? formData.shelf_life_months : 0);
                    fd.append('Description', formData.description !== '' ? formData.description : '');
                } else {
                    fd.append('Width', formData.width || 0);
                    fd.append('Height', formData.height || 0);
                    fd.append('Depth', formData.depth || 0);
                    fd.append('Weight', formData.weight || 0);
                    fd.append('is_stackable', formData.is_stackable ? 1 : 0);
                    fd.append('max_stack_limit', formData.is_stackable ? (formData.max_stack_limit || 999) : 1);
                    fd.append('unit_type', formData.unit_type || 'Adet');
                    fd.append('package_capacity', formData.package_capacity || 1);
                    fd.append('package_name', formData.package_name || '');
                    fd.append('critical_stock_level', formData.critical_stock_level || 0);
                    fd.append('shelf_life_months', formData.shelf_life_months !== '' ? formData.shelf_life_months : 0);
                    fd.append('Description', formData.description !== '' ? formData.description : '');
                }

                // Add suppliers data and files
                const validSuppliers = suppliersData.filter(s => s.supplier_id);
                fd.append('suppliers', JSON.stringify(validSuppliers.map(s => ({
                    supplier_id: s.supplier_id,
                    contract_start_date: s.contract_start_date,
                    contract_end_date: s.contract_end_date,
                    unit_price: s.unit_price,
                    lead_time_days: s.lead_time_days,
                    remove_contract: s.remove_contract,
                    contract_file: s.contract_file,
                    localId: s.localId
                }))));

                validSuppliers.forEach((s, index) => {
                    if (s.fileObject) {
                        fd.append('contractFile_' + (s.localId || index), s.fileObject);
                    }
                });

                return fd;
            };

            if (editItem) {
                // Update product (Name, Brand, etc.)
                await apiFetch(`http://localhost:3000/api/products/${editItem.product_id}`, {
                    method: 'PUT',
                    headers: { 'x-user-id': currentUser?.id },
                    body: createProductFormData(editItem.product)
                });

                // Update stock balance
                if (batch) {
                    await apiFetch(`http://localhost:3000/api/wms/stock/${batch.balance_id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
                        body: JSON.stringify({
                            quantity: Number(formData.shelfAllocations[0].quantity),
                            batch_number: formData.batchNumber,
                            expiration_date: batch && batch.expiration_date ? batch.expiration_date.split('T')[0] : '',
                            warehouse_id: formData.warehouseId,
                            shelf_code: formData.shelfAllocations[0].shelfCode,
                            supplier_id: formData.supplierId,
                            unit_price: (batch && batch.unit_price) ? batch.unit_price : (editItem && editItem.product ? editItem.product.PurchasePrice || '' : '')
                        })
                    });
                }

                setSuccess(true);
                if (onSuccess) {
                    setTimeout(() => onSuccess(), 500);
                }
                setLoading(false);
                return;
            }

            const existingProduct = products.find(p => p.ProductName && p.ProductName.toLowerCase() === formData.materialName.trim().toLowerCase());

            if (existingProduct) {
                targetProductId = existingProduct.Id;

                // Ensure the brand or barcode updates on existing material
                await apiFetch(`http://localhost:3000/api/products/${existingProduct.Id}`, {
                    method: 'PUT',
                    headers: { 'x-user-id': currentUser?.id },
                    body: createProductFormData(existingProduct)
                });
            } else {
                // Create material
                const prodRes = await apiFetch('http://localhost:3000/api/products', {
                    method: 'POST',
                    headers: { 'x-user-id': currentUser?.id },
                    body: createProductFormData()
                });
                const prodData = await prodRes.json();
                if (prodData.success) {
                    targetProductId = prodData.productId;
                    await fetchProducts(); // Refresh list
                } else {
                    throw new Error(prodData.message || 'Yeni malzeme oluşturulamadı.');
                }
            }

            const res = await apiFetch('http://localhost:3000/api/wms/stock-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
                body: JSON.stringify({
                    productId: targetProductId,
                    warehouseId: formData.warehouseId,
                    shelfAllocations: formData.shelfAllocations.map(a => ({ ...a, quantity: parseInt(a.quantity) })),
                    batchNumber: formData.batchNumber,
                    expirationDate: null,
                    supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
                    unitPrice: null,
                    userId: currentUser?.id,
                    description: (formData.description ? formData.description + ' | ' : '') + `Birim: ${formData.unit_type}`
                })
            });

            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setFormData(prev => ({
                    ...prev,
                    shelfAllocations: prev.shelfAllocations.map(a => ({ ...a, quantity: '' })),
                    batchNumber: '',
                    expirationDate: '',
                    description: ''
                }));
                if (onSuccess) {
                    setTimeout(() => onSuccess(), 500);
                }
            } else {
                setError(data.message || 'Stok girişi sırasında hata oluştu');
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Sunucu hatası');
        } finally {
            setLoading(false);
        }
    };

    const handleWarehouseBarcodeSearch = (e) => {
        const val = e.target.value;
        setWarehouseSearchBarcode(val);
        if (val.trim() === '') return;

        const found = warehouses.find(w =>
            (w.barcode && w.barcode === val.trim()) ||
            (w.name && w.name.toLowerCase() === val.trim().toLowerCase())
        );
        if (found) {
            setFormData(prev => ({ ...prev, warehouseId: found.id }));
            setScanningModal({ open: false, type: null });
            setWarehouseSearchBarcode('');
        }
    };

    const handleShelfBarcodeSearch = (e) => {
        const val = e.target.value;
        setShelfSearchBarcode(val);
        if (val.trim() === '') return;

        const found = shelves.find(s => s.toLowerCase() === val.trim().toLowerCase());
        if (found) {
            setFormData(prev => {
                const newAllocations = [...prev.shelfAllocations];
                const emptyIndex = newAllocations.findIndex(a => a.shelfCode === '' || a.quantity === '');
                if (emptyIndex !== -1) {
                    newAllocations[emptyIndex].shelfCode = found;
                } else {
                    newAllocations.push({ shelfCode: found, quantity: '' });
                }
                return { ...prev, shelfAllocations: newAllocations };
            });
            setScanningModal({ open: false, type: null });
            setShelfSearchBarcode('');
        }
    };

    const handleCreateMaterial = () => { };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>
                        {editItem ? 'Malzeme Düzenle (Envanter)' : 'Yeni Malzeme Girişi (Envanter)'}
                    </h2>
                    <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                        {editItem ? 'Malzeme adını, markasını ve ilk stok girişini güncelleyebilirsiniz.' : 'Sisteme yeni bir hammadde/malzeme tanımlayın ve ilk stok girişini yapın.'}
                    </p>
                </div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                {error && <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '6px', marginBottom: '20px', border: '1px solid #fecaca' }}>{error}</div>}
                {success && <div style={{ padding: '12px', backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '6px', marginBottom: '20px', border: '1px solid #a7f3d0' }}>Envanter girişi başarıyla kaydedildi!</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>


                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <ShelfBarcodeScanner onShelfFound={handleShelfFound} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Malzeme Adı *</label>
                            <input
                                type="text"
                                name="materialName"
                                value={formData.materialName}
                                onChange={handleChange}
                                required
                                disabled={isAddStock || isEditProduct}
                                placeholder="Örn: Un, Şeker, Tuz..."
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: (isAddStock || isEditProduct) ? '#f1f5f9' : 'white', fontSize: '15px' }}
                                list="material-suggestions"
                            />
                            {!isAddStock && !isEditProduct && (
                                <datalist id="material-suggestions">
                                    {products.map(p => (
                                        <option key={p.Id} value={p.ProductName} />
                                    ))}
                                </datalist>
                            )}
                        </div>

                        {!isAddStock && (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Marka (İsteğe Bağlı)</label>
                                        {!showNewBrandInput && (
                                            <button type="button" onClick={() => setShowNewBrandInput(true)} title="Yeni Marka Ekle" style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>+</button>
                                        )}
                                    </div>
                                    {showNewBrandInput ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="text" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBrand(); } }} placeholder="Yeni Marka Adı" style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                            <button type="button" onClick={handleAddBrand} disabled={addingBrand} style={{ padding: '0 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>{addingBrand ? '...' : 'Ekle'}</button>
                                            <button type="button" onClick={() => setShowNewBrandInput(false)} style={{ padding: '0 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>İptal</button>
                                        </div>
                                    ) : (
                                        <select name="brand" value={formData.brand} onChange={handleChange} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '15px' }}>
                                            <option value="">Seçiniz...</option>
                                            {Array.isArray(brandList) && brandList.map(b => (
                                                <option key={b.id} value={b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Barkodlar <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(Okutun veya yazın)</span></label>
                                        <button type="button" onClick={addBarcodeField} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>+</button>
                                    </div>
                                    {barcodes.map((barcode, index) => (
                                        <div key={index} style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', position: 'relative', alignItems: 'center' }}>
                                                <div
                                                    style={{ position: 'absolute', left: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', cursor: 'pointer', zIndex: 10 }}
                                                    onClick={() => {
                                                        setCurrentScanningIndex(index);
                                                        setScannedBarcode('');
                                                        setIsBarcodeModalOpen(true);
                                                        setTimeout(() => document.getElementById('inventory-barcode-input')?.focus(), 100);
                                                    }}
                                                    title="Barkod okutmak için tıklayın"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={barcode}
                                                    onChange={(e) => handleBarcodeChange(index, e.target.value)}
                                                    placeholder={`Barkod ${index + 1} okutun veya yazın`}
                                                    style={{ flex: 1, padding: '12px 10px 12px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '15px' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        let newCode = '869'; // Türkiye GS1
                                                        for (let i = 0; i < 9; i++) {
                                                            newCode += Math.floor(Math.random() * 10).toString();
                                                        }
                                                        let sum = 0;
                                                        for (let i = 0; i < 12; i++) {
                                                            sum += parseInt(newCode[i]) * (i % 2 === 0 ? 1 : 3);
                                                        }
                                                        const checkSum = (10 - (sum % 10)) % 10;
                                                        handleBarcodeChange(index, newCode + checkSum);
                                                    }}
                                                    style={{ marginLeft: '8px', padding: '0 12px', background: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer', height: '42px', fontWeight: '600', fontSize: '13px' }}
                                                >
                                                    Oluştur
                                                </button>
                                                {barcodes.length > 1 && (
                                                    <button type="button" onClick={() => removeBarcodeField(index)} style={{ marginLeft: '8px', padding: '0 10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', height: '42px' }}>✕</button>
                                                )}
                                            </div>

                                            {/* Eğer barkod varsa resmini göster */}
                                            {barcode && barcode.trim().length > 0 && (
                                                <div style={{ marginTop: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px' }}>
                                                    <Barcode value={barcode} format={barcode.length === 13 ? "EAN13" : "CODE128"} width={1.8} height={50} fontSize={14} background="#ffffff" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {(() => {
                        const existingProduct = products.find(p => p.ProductName && p.ProductName.toLowerCase() === formData.materialName.trim().toLowerCase());
                        const isNew = !existingProduct && formData.materialName.trim() !== '';
                        const needsDimensions = existingProduct && (!existingProduct.Width || existingProduct.Width == 0);
                        const isEditing = !!editItem;

                        if (!isNew && !needsDimensions && !isEditing) return null;

                        return (
                            <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0', borderLeft: '4px solid #0284C7', marginTop: '16px', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                    <h4 style={{ margin: '0', color: '#0F172A', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        📦 {isNew ? 'Ambalaj & Fiziksel Ölçüler' : 'Ambalaj & Fiziksel Ölçüleri Tamamla'}
                                    </h4>
                                    <div
                                        style={{ color: '#94A3B8', cursor: 'help' }}
                                        title={isNew ? '3D stok ve raf hesabı için gereklidir' : 'Bu malzemenin sistemde fiziksel boyutları (hacmi) eksik. 3D raf algoritması için ölçüleri tamamlayınız.'}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                    {/* Sol Sütun: Ambalaj Bilgisi */}
                                    <div>
                                        <h5 style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748B', fontWeight: 'bold', letterSpacing: '0.5px' }}>🔹 AMBALAJ BİLGİSİ</h5>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Ambalaj Tipi</label>
                                                <input type="text" name="package_name" value={formData.package_name} onChange={handleChange} placeholder="Örn: Varil, IBC Tank, Çuval, Koli" style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff' }} />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Ambalaj Kapasitesi & Birim</label>
                                                <div style={{ display: 'flex' }}>
                                                    <input type="number" name="package_capacity" value={formData.package_capacity} onChange={handleChange} min="0.001" step="any" placeholder="Miktar (Örn: 100)" style={{ padding: '10px 12px', borderRadius: '6px 0 0 6px', border: '1px solid #CBD5E1', borderRight: 'none', backgroundColor: '#fff', flex: '1' }} />
                                                    <select name="unit_type" value={formData.unit_type} onChange={handleChange} style={{ padding: '10px 12px', borderRadius: '0 6px 6px 0', border: '1px solid #CBD5E1', backgroundColor: '#F1F5F9', color: '#334155', fontWeight: '500', width: '120px' }}>
                                                        <option value="Adet">Adet</option>
                                                        <option value="Litre">Litre (L)</option>
                                                        <option value="Kg">Kg</option>
                                                        <option value="Gram">Gram</option>
                                                        <option value="Metre">Metre</option>
                                                        <option value="Koli">Koli</option>
                                                        <option value="Paket">Paket</option>
                                                        <option value="Çuval">Çuval</option>
                                                        <option value="Ton">Ton</option>
                                                        <option value="m²">m²</option>
                                                        <option value="m³">m³</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sağ Sütun: Fiziksel Boyutlar */}
                                    <div>
                                        <h5 style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748B', fontWeight: 'bold', letterSpacing: '0.5px' }}>🔹 FİZİKSEL BOYUTLAR (1 KAP İÇİN)</h5>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '12px' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Genişlik (cm):</label>
                                                <input type="number" name="width" value={formData.width} onChange={handleChange} min="0" step="0.1" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff' }} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '12px' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Yükseklik (cm):</label>
                                                <input type="number" name="height" value={formData.height} onChange={handleChange} min="0" step="0.1" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff' }} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '12px' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Derinlik (cm):</label>
                                                <input type="number" name="depth" value={formData.depth} onChange={handleChange} min="0" step="0.1" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff' }} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '12px' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Ağırlık (kg/gr):</label>
                                                <input type="number" name="weight" value={formData.weight} onChange={handleChange} min="0" step="0.01" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff' }} />
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer', fontWeight: '500' }}>
                                                    <input type="checkbox" name="is_stackable" checked={formData.is_stackable} onChange={e => setFormData({ ...formData, is_stackable: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#0284C7' }} />
                                                    Üst Üste İstiflenebilir
                                                </label>

                                                {formData.is_stackable && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <label style={{ fontSize: '12px', color: '#64748B' }}>Kat:</label>
                                                        <input type="number" name="max_stack_limit" value={formData.max_stack_limit} onChange={handleChange} min="2" style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', width: '60px', backgroundColor: '#fff', fontSize: '13px' }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {!isEditProduct && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Depo Seçiniz *</label>
                                        <button type="button" onClick={() => setScanningModal({ open: true, type: 'warehouse' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: 0 }} title="Barkod Okut">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0284c7' }}>
                                                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                                                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                                                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                                                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                                                <rect width="10" height="10" x="7" y="7" rx="2" />
                                            </svg>
                                        </button>
                                    </div>
                                    <select
                                        name="warehouseId"
                                        value={formData.warehouseId}
                                        onChange={handleChange}
                                        required
                                        style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '15px' }}
                                    >
                                        <option value="">-- Depo Seç --</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Raf Tahsisleri *</label>
                                        <button type="button" onClick={() => setScanningModal({ open: true, type: 'shelf' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: 0 }} title="Barkod Okut">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0284c7' }}>
                                                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                                                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                                                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                                                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                                                <rect width="10" height="10" x="7" y="7" rx="2" />
                                            </svg>
                                        </button>
                                    </div>
                                    {!editItem && (
                                        <button type="button" onClick={addAllocationField} disabled={!formData.warehouseId || shelves.length === 0} style={{ padding: '6px 12px', backgroundColor: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            + Yeni Raf Ekle
                                        </button>
                                    )}
                                </div>

                                {formData.shelfAllocations.map((allocation, index) => {
                                    const capData = shelfCapacities[allocation.shelfCode];

                                    return (
                                        <div key={index} style={{ marginBottom: '16px' }}>
                                            {/* Kontroller: raf seç | kutu+toplam | sil — hepsi aynı hizada */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '12px', alignItems: 'center' }}>
                                                <select
                                                    value={allocation.shelfCode}
                                                    onChange={(e) => handleAllocationChange(index, 'shelfCode', e.target.value)}
                                                    required
                                                    disabled={!formData.warehouseId || shelves.length === 0}
                                                    style={{ width: '100%', maxWidth: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: formData.warehouseId ? 'white' : '#f1f5f9', fontSize: '15px' }}
                                                >
                                                    <option value="">{shelves.length > 0 ? '-- Raf Seç --' : 'Önce Depo Seçiniz'}</option>
                                                    {(() => {
                                                        const otherSelectedShelves = formData.shelfAllocations.filter((_, i) => i !== index).map(a => a.shelfCode).filter(Boolean);
                                                        const sortedShelves = [...shelves].sort((a, b) => {
                                                            const capA = allShelvesCapacity[a];
                                                            const capB = allShelvesCapacity[b];
                                                            const isFullA = capA && (capA.maxItems === 0 || !capA.physicallyFits);
                                                            const isFullB = capB && (capB.maxItems === 0 || !capB.physicallyFits);

                                                            const usedA = otherSelectedShelves.includes(a);
                                                            const usedB = otherSelectedShelves.includes(b);
                                                            if (usedA && !usedB) return 1;
                                                            if (!usedA && usedB) return -1;

                                                            if (isFullA && !isFullB) return 1;
                                                            if (!isFullA && isFullB) return -1;

                                                            const hasSameA = capA && capA.hasSameProduct;
                                                            const hasSameB = capB && capB.hasSameProduct;
                                                            if (hasSameA && !hasSameB) return -1;
                                                            if (!hasSameA && hasSameB) return 1;

                                                            const maxA = capA ? (capA.maxItems === Infinity ? 9999999 : capA.maxItems) : 0;
                                                            const maxB = capB ? (capB.maxItems === Infinity ? 9999999 : capB.maxItems) : 0;
                                                            if (maxA !== maxB) return maxB - maxA;

                                                            const effA = capA ? capA.efficiency : 0;
                                                            const effB = capB ? capB.efficiency : 0;
                                                            return effB - effA;
                                                        });

                                                        return sortedShelves.map((s, idx) => {
                                                            const cap = allShelvesCapacity[s];
                                                            const isFull = cap && (cap.maxItems === 0 || !cap.physicallyFits);
                                                            const isRecommended = !isFull && idx === 0 && cap;

                                                            let text = s;
                                                            if (isFull) {
                                                                text += ' (Dolu / Sığmıyor)';
                                                            } else if (isRecommended) {
                                                                const tags = [];
                                                                if (cap.hasSameProduct) tags.push('Ürün Zaten Var');
                                                                else if (!cap.hasSameCorridor) tags.push('Risk Dağıtımı (Farklı Koridor)');
                                                                tags.push(`%${cap.efficiency} Verim`);
                                                                text = `⭐ ${s} (Önerilen - Maks. ${cap.maxPackages} ${formData.package_name || 'Kap'}, ${tags.join(', ')})`;
                                                            } else if (cap) {
                                                                const tags = [`%${cap.efficiency} Verim`];
                                                                if (cap.hasSameProduct) tags.push('Ürün Zaten Var');
                                                                text += ` - Maks. ${cap.maxPackages} ${formData.package_name || 'Kap'} (${tags.join(', ')})`;
                                                            }

                                                            return (
                                                                <option key={idx} value={s} disabled={isFull} style={{ color: isFull ? '#94a3b8' : (isRecommended ? '#047857' : 'inherit'), fontWeight: isRecommended ? 'bold' : 'normal' }}>
                                                                    {text}
                                                                </option>
                                                            );
                                                        });
                                                    })()}
                                                </select>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>{formData.package_name || 'Kutu/Koli/Tank vb.'} Adedi</div>
                                                        <input
                                                            type="number"
                                                            value={allocation.packageQuantity !== undefined ? allocation.packageQuantity : (allocation.quantity ? (parseFloat(allocation.quantity) / (parseFloat(formData.package_capacity) || 1)) : '')}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                const total = val * (parseFloat(formData.package_capacity) || 1);
                                                                const newAllocations = [...formData.shelfAllocations];
                                                                newAllocations[index].packageQuantity = e.target.value;
                                                                newAllocations[index].quantity = isNaN(total) ? '' : total;
                                                                setFormData({ ...formData, shelfAllocations: newAllocations });
                                                            }}
                                                            min="0" step="any"
                                                            placeholder="Adet"
                                                            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Toplam {formData.unit_type} *</div>
                                                        <input
                                                            type="number"
                                                            value={allocation.quantity}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                const packages = val / (parseFloat(formData.package_capacity) || 1);
                                                                const newAllocations = [...formData.shelfAllocations];
                                                                newAllocations[index].quantity = e.target.value;
                                                                newAllocations[index].packageQuantity = isNaN(packages) ? '' : packages;
                                                                setFormData({ ...formData, shelfAllocations: newAllocations });
                                                            }}
                                                            required
                                                            min="0.001" step="any"
                                                            placeholder="Toplam Miktar"
                                                            style={{ padding: '12px', borderRadius: '6px', border: `1px solid ${capData && allocation.quantity && (parseFloat(allocation.quantity) > capData.maxItems || !capData.physicallyFits) ? '#ef4444' : '#cbd5e1'}`, fontSize: '15px' }}
                                                        />
                                                    </div>
                                                </div>

                                                {!editItem && formData.shelfAllocations.length > 1 && (
                                                    <button type="button" onClick={() => removeAllocationField(index)} style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', height: '47px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Rafı Kaldır">
                                                        ✕
                                                    </button>
                                                )}
                                            </div>

                                            {/* Uyarı / Kapasite mesajları — grid dışında, kayma yok */}
                                            {capData ? (
                                                <div style={{ marginTop: '6px', fontSize: '12px', color: '#0369a1', fontWeight: '500' }}>
                                                    {(() => {
                                                        const qty = capData.maxItems;
                                                        const u = formData.unit_type || 'Adet';
                                                        let formattedQty = `${qty} ${u}`;
                                                        if ((u === 'gr' || u === 'ml') && qty >= 1000) {
                                                            formattedQty = `${+(qty / 1000).toFixed(2)} ${u === 'gr' ? 'kg' : 'L'}`;
                                                        }
                                                        return <>ℹ️ Doluluk: %{capData.fillPercentage} ({capData.currentFilled} / {capData.maxVolume} cm³) · 📦 Boş Hacim: {capData.emptyVolume} cm³ (Maks: {formattedQty} / {capData.maxPackages} {formData.package_name || 'Kap'} sığar)</>;
                                                    })()}
                                                </div>
                                            ) : allocation.shelfCode ? (
                                                <div style={{ marginTop: '6px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                                                    ℹ️ Hacim bilgisi tanımlanmamış.
                                                </div>
                                            ) : null}
                                            {capData && !capData.physicallyFits && (
                                                <div style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
                                                    ⚠️ Ürün bu rafa fiziksel olarak sığmıyor! (Boyut Uyuşmazlığı)
                                                </div>
                                            )}
                                            {capData && capData.physicallyFits && allocation.quantity && parseFloat(allocation.quantity) > capData.maxItems && (
                                                <div style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
                                                    {capData.isStackable === false || (capData.isStackable && capData.maxStackLimit < 999) ? (
                                                        `⚠️ Uyarı: Bu ürün ambalaj yapısı gereği üst üste en fazla ${capData.isStackable ? capData.maxStackLimit : 1} kat dizilebilir. Seçilen rafın alanına göre bu rafa maksimum ${capData.maxItems} ${formData.unit_type} (${capData.maxPackages} ${formData.package_name || 'Kap'}) koyabilirsiniz.`
                                                    ) : (
                                                        `⚠️ Seçilen ürünün boyutlarına göre bu rafa en fazla ${capData.maxItems} ${formData.unit_type} (${capData.maxPackages} ${formData.package_name || 'Kap'}) sığabilir!`
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {!isAddStock && (
                        <>

                            {/* MULTIPLE SUPPLIERS SECTION */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#334155', margin: 0 }}>Tedarikçiler ve Sözleşmeler</h3>
                                    <button
                                        type="button"
                                        onClick={() => setSuppliersData([...suppliersData, { supplier_id: '', unit_price: '', lead_time_days: '', contract_start_date: '', contract_end_date: '', localId: Math.random().toString() }])}
                                        style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <span style={{ fontSize: '16px' }}>+</span> Tedarikçi Ekle
                                    </button>
                                </div>

                                {suppliersData.length === 0 && (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '14px', backgroundColor: 'white', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                                        Henüz tedarikçi eklenmedi. Yeni bir tedarikçi eklemek için yukarıdaki butonu kullanın.
                                    </div>
                                )}

                                {suppliersData.map((sup, index) => {
                                    const hasActiveContract = sup.contract_start_date && sup.contract_end_date && new Date(sup.contract_end_date) >= new Date();
                                    const hasExistingContract = sup.contract_file && !sup.remove_contract;

                                    return (
                                        <div key={sup.localId} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '15px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', position: 'relative' }}>
                                            <button
                                                type="button"
                                                onClick={() => setSuppliersData(suppliersData.filter(s => s.localId !== sup.localId))}
                                                style={{ position: 'absolute', top: '10px', right: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                                                title="Tedarikçiyi Sil"
                                            >
                                                ×
                                            </button>

                                            <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '30px' }}>
                                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Tedarikçi Seçimi *</label>
                                                <select
                                                    value={sup.supplier_id}
                                                    onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, supplier_id: e.target.value } : s))}
                                                    required
                                                    disabled={hasActiveContract && !sup.isNew}
                                                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: (hasActiveContract && !sup.isNew) ? '#f1f5f9' : 'white', fontSize: '14px' }}
                                                >
                                                    <option value="">-- Tedarikçi Seç --</option>
                                                    {suppliers.map(s => (
                                                        <option key={s.Id} value={s.Id}>{s.SupplierName}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr 1fr', gap: '15px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Tedarik Süresi (Gün)</label>
                                                    <input type="number" step="1" value={sup.lead_time_days || ''} onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, lead_time_days: e.target.value } : s))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Birim Fiyat (TL)</label>
                                                    <input type="number" step="0.01" value={sup.unit_price || ''} onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, unit_price: e.target.value } : s))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Sözleşme Başlangıç</label>
                                                    <input
                                                        type="date"
                                                        value={sup.contract_start_date}
                                                        onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, contract_start_date: e.target.value } : s))}
                                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Sözleşme Bitiş</label>
                                                    <input
                                                        type="date"
                                                        value={sup.contract_end_date}
                                                        onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, contract_end_date: e.target.value } : s))}
                                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Sözleşme Dosyası (İsteğe Bağlı PDF/Dosya)</label>

                                                <input
                                                    type="file"
                                                    onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, fileObject: e.target.files[0], remove_contract: false } : s))}
                                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px' }}
                                                />

                                                {hasExistingContract && !sup.fileObject && (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', marginTop: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '14px' }}>📄</span>
                                                            <a href={`http://localhost:3000${sup.contract_file}`} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: '500', fontSize: '13px' }}>
                                                                Mevcut Sözleşmeyi Görüntüle
                                                            </a>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, remove_contract: true } : s))}
                                                            style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                                                        >
                                                            Dosyayı Kaldır
                                                        </button>
                                                    </div>
                                                )}

                                                {sup.fileObject && (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', marginTop: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '14px' }}>📁</span>
                                                            <span style={{ color: '#1d4ed8', fontSize: '13px', fontWeight: '500' }}>
                                                                {sup.fileObject.name}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, fileObject: null } : s));
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* END MULTIPLE SUPPLIERS SECTION */}
                        </>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px', marginBottom: '15px' }}>
                        {!isEditProduct && (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Tedarikçi (Bu Parti İçin)</label>
                                    <select
                                        name="supplierId"
                                        value={formData.supplierId}
                                        onChange={handleChange}
                                        style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '15px' }}
                                    >
                                        <option value="">-- Tedarikçi Seç --</option>
                                        {suppliersData.filter(sup => sup.supplier_id).map(sup => {
                                            const supplierInfo = suppliers.find(s => s.Id.toString() === sup.supplier_id.toString());
                                            return supplierInfo ? (
                                                <option key={sup.localId} value={supplierInfo.Id}>{supplierInfo.SupplierName}</option>
                                            ) : null;
                                        })}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Parti (Batch) Numarası</label>
                                    <input
                                        type="text"
                                        name="batchNumber"
                                        value={formData.batchNumber}
                                        onChange={handleChange}
                                        placeholder="Örn: BATCH-2023-A"
                                        style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                                    />
                                </div>
                            </>
                        )}
                        {!isAddStock && (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Raf Ömrü (Ay)</label>
                                <input
                                    type="number"
                                    name="shelf_life_months"
                                    value={formData.shelf_life_months}
                                    onChange={handleChange}
                                    step="1"
                                    min="0"
                                    placeholder="Örn: 6"
                                    style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                                />
                            </div>
                        )}
                        {!isAddStock && (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Birim Türü</label>
                                <select
                                    name="unit_type"
                                    value={formData.unit_type}
                                    onChange={handleChange}
                                    style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '15px' }}
                                >
                                    <option value="Adet">Adet</option>
                                    <option value="Litre">Litre (L)</option>
                                    <option value="Kg">Kg</option>
                                    <option value="Gram">Gram</option>
                                    <option value="Metre">Metre</option>
                                    <option value="Koli">Koli</option>
                                    <option value="Paket">Paket</option>
                                    <option value="Çuval">Çuval</option>
                                    <option value="Ton">Ton</option>
                                    <option value="m²">m²</option>
                                    <option value="m³">m³</option>
                                </select>
                            </div>
                        )}
                        {!isAddStock && (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Kritik Stok Seviyesi (Min Stok)</label>
                                <input
                                    type="number"
                                    name="critical_stock_level"
                                    value={formData.critical_stock_level}
                                    onChange={handleChange}
                                    min="0"
                                    placeholder="Uyarı için minimum stok"
                                    style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                                />
                            </div>
                        )}
                    </div>


                    {!isAddStock && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Açıklama / İrsaliye No (İsteğe Bağlı)</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="3"
                                    style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px', resize: 'vertical' }}
                                ></textarea>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', gap: '12px' }}>
                        {editItem && (
                            <button type="button" onClick={onCancel} style={{
                                padding: '12px 30px',
                                borderRadius: '6px',
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                color: '#475569',
                                fontWeight: '600',
                                fontSize: '15px',
                                cursor: 'pointer'
                            }}>
                                İptal
                            </button>
                        )}
                        <button type="submit" disabled={loading} style={{
                            padding: '12px 30px',
                            borderRadius: '6px',
                            backgroundColor: '#10b981',
                            border: 'none',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '15px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                        }}>
                            {loading ? 'Kaydediliyor...' : (editItem ? 'Değişiklikleri Kaydet' : 'Envantere Ekle')}
                        </button>
                    </div>
                </form>
            </div>

            {isBarcodeModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '400px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', animation: 'pulse 2s infinite' }}><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Lütfen Barkodu Okutun</h3>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Cihazınızla ürün barkodunu tarayın.</p>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (scannedBarcode.trim() && currentScanningIndex !== null) {
                                handleBarcodeChange(currentScanningIndex, scannedBarcode.trim());
                            }
                            setIsBarcodeModalOpen(false);
                        }}>
                            <input
                                id="inventory-barcode-input"
                                type="text"
                                value={scannedBarcode}
                                onChange={(e) => setScannedBarcode(e.target.value)}
                                placeholder="Barkod bekleniyor..."
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #3b82f6', fontSize: '16px', textAlign: 'center', outline: 'none' }}
                                autoComplete="off"
                            />
                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <button type="button" onClick={() => setIsBarcodeModalOpen(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>İptal</button>
                                <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: 'white' }}>Ekle</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Scanning Modal */}
            {scanningModal.open && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: '#0f172a' }}>{scanningModal.type === 'warehouse' ? 'Depo' : 'Raf'} Barkodu Okut</h3>
                            <button type="button" onClick={() => setScanningModal({ open: false, type: null })} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        <input
                            type="text"
                            value={scanningModal.type === 'warehouse' ? warehouseSearchBarcode : shelfSearchBarcode}
                            onChange={scanningModal.type === 'warehouse' ? handleWarehouseBarcodeSearch : handleShelfBarcodeSearch}
                            placeholder="Barkod okuyucuyu kullanın..."
                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid #0284c7', backgroundColor: '#f0f9ff', fontSize: '16px', boxSizing: 'border-box' }}
                            autoFocus
                        />
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '12px', textAlign: 'center' }}>Barkod okutulduğunda otomatik kapanacaktır.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryEntry;

