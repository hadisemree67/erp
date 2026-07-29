const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '../src/components');

const editIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const deleteIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

function updateFile(relativePath, transformFn) {
    const fullPath = path.join(componentsDir, relativePath);
    if (!fs.existsSync(fullPath)) {
        console.error('File not found:', fullPath);
        return;
    }
    let content = fs.readFileSync(fullPath, 'utf8');
    const updated = transformFn(content);
    if (content !== updated) {
        fs.writeFileSync(fullPath, updated, 'utf8');
        console.log('Successfully updated:', relativePath);
    } else {
        console.log('No changes made to (or already updated):', relativePath);
    }
}

// 1. CustomerList.jsx
updateFile('Customers/CustomerList.jsx', (content) => {
    let res = content.replace(
        `<tr key={c.Id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>`,
        `<tr key={c.Id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>`
    );
    const oldBtns = `<button
                                            onClick={() => handleEditClick(c)}
                                            style={{
                                                padding: '6px 14px',
                                                marginRight: '8px',
                                                backgroundColor: '#f1f5f9',
                                                color: '#3b82f6',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '13px'
                                            }}
                                        >
                                            Düzenle
                                        </button>
                                        <button
                                            onClick={() => handleDelete(c.Id, c.CustomerName)}
                                            style={{
                                                padding: '6px 14px',
                                                backgroundColor: '#fee2e2',
                                                color: '#ef4444',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '13px'
                                            }}
                                        >
                                            Sil
                                        </button>`;
    const newBtns = `<div className="action-container" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                                            <button onClick={() => handleEditClick(c)} title="Düzenle" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#0f172a'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                                ${editIconSvg}
                                            </button>
                                            <button onClick={() => handleDelete(c.Id, c.CustomerName)} title="Sil" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                                ${deleteIconSvg}
                                            </button>
                                        </div>`;
    res = res.replace(oldBtns, newBtns);
    return res;
});

// 2. SupplierList.jsx
updateFile('Suppliers/SupplierList.jsx', (content) => {
    let res = content.replace(
        `<tr key={supplier.Id} style={{ borderBottom: '1px solid #f1f5f9' }}>`,
        `<tr key={supplier.Id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>`
    );
    const oldBtns = `<button 
                                            onClick={() => handleEdit(supplier)}
                                            style={{ padding: '6px 12px', marginRight: '8px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#3b82f6', cursor: 'pointer', fontWeight: '500' }}>
                                            Düzenle
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(supplier.Id)}
                                            style={{ padding: '6px 12px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', fontWeight: '500' }}>
                                            Sil
                                        </button>`;
    const newBtns = `<div className="action-container" style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
                                            <button onClick={() => handleEdit(supplier)} title="Düzenle" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#0f172a'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                                ${editIconSvg}
                                            </button>
                                            <button onClick={() => handleDelete(supplier.Id)} title="Sil" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                                ${deleteIconSvg}
                                            </button>
                                        </div>`;
    res = res.replace(oldBtns, newBtns);
    return res;
});

// 3. MachineList.jsx
updateFile('Production/MachineList.jsx', (content) => {
    let res = content.replace(
        `<tr key={m.id} style={{ borderBottom: '1px solid #e2e8f0' }}>`,
        `<tr key={m.id} className="hover-row" style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s' }}>`
    );
    const oldBtns = `<button onClick={() => handleEdit(m)} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '8px', fontSize: '12px', fontWeight: 'bold' }}>Düzenle</button>
                                    <button onClick={() => handleDelete(m.id)} style={{ padding: '6px 12px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Sil</button>`;
    const newBtns = `<div className="action-container" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                                        <button onClick={() => handleEdit(m)} title="Düzenle" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#0f172a'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                            ${editIconSvg}
                                        </button>
                                        <button onClick={() => handleDelete(m.id)} title="Sil" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                            ${deleteIconSvg}
                                        </button>
                                    </div>`;
    res = res.replace(oldBtns, newBtns);
    return res;
});

// 4. ProductionList.jsx
updateFile('Production/ProductionList.jsx', (content) => {
    let res = content.replace(
        `<tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'transparent' }}>`,
        `<tr key={o.id} className="hover-row" style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'transparent' }}>`
    );
    res = res.replace(
        `<td style={{ padding: '12px', display: 'flex', gap: '8px' }}>`,
        `<td style={{ padding: '12px' }}>\n                                        <div className="action-container" style={{ display: 'flex', gap: '8px' }}>`
    );
    if (res.includes(`<div className="action-container"`)) {
        res = res.replace(
            `                                            </button>\n                                        )}\n                                    </td>`,
            `                                            </button>\n                                        )}\n                                        </div>\n                                    </td>`
        );
    }
    return res;
});

// 5. ProductionRequests.jsx
updateFile('Production/ProductionRequests.jsx', (content) => {
    let res = content.replace(
        `<tr key={req.id} className="req-row-hover" style={{`,
        `<tr key={req.id} className="hover-row req-row-hover" style={{`
    );
    res = res.replace(
        `<div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>`,
        `<div className="action-container" style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>`
    );
    return res;
});

// 6. PurchaseOrders.jsx
updateFile('Purchasing/PurchaseOrders.jsx', (content) => {
    let res = content.replace(
        `<tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>`,
        `<tr key={order.id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>`
    );
    res = res.replace(
        `<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>`,
        `<div className="action-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>`
    );
    return res;
});

// 7. PurchaseRequests.jsx
updateFile('Purchasing/PurchaseRequests.jsx', (content) => {
    let res = content.replaceAll(
        `className="req-row-hover"`,
        `className="hover-row req-row-hover"`
    );
    res = res.replaceAll(
        `<div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>`,
        `<div className="action-container" style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>`
    );
    return res;
});

// 8. StockList.jsx
updateFile('WMS/StockList.jsx', (content) => {
    let res = content.replace(
        `<div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>`,
        `<div className="action-container" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>`
    );
    return res;
});

// 9. GoodsReceipt.jsx
updateFile('WMS/GoodsReceipt.jsx', (content) => {
    let res = content.replace(
        `<tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>`,
        `<tr key={order.id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>`
    );
    const oldTd = `<td style={{ padding: '16px', textAlign: 'center' }}>
                                        <button 
                                            onClick={() => openModal(order)}
                                            style={{ padding: '8px 16px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                                        >
                                            Depoya Al
                                        </button>
                                    </td>`;
    const newTd = `<td style={{ padding: '16px', textAlign: 'center' }}>
                                        <div className="action-container" style={{ display: 'flex', justifyContent: 'center' }}>
                                            <button 
                                                onClick={() => openModal(order)}
                                                style={{ padding: '8px 16px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                                            >
                                                Depoya Al
                                            </button>
                                        </div>
                                    </td>`;
    res = res.replace(oldTd, newTd);
    return res;
});

// 10. FinanceAccounts.jsx
updateFile('Finance/FinanceAccounts.jsx', (content) => {
    let res = content.replace(
        `<tr key={item.id}>`,
        `<tr key={item.id} className="hover-row">`
    );
    res = res.replace(
        `<div style={{ display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}>`,
        `<div className="action-container" style={{ display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}>`
    );
    return res;
});

// 11. LeaveManagement.jsx
updateFile('Employees/LeaveManagement.jsx', (content) => {
    let res = content.replace(
        `<tr key={leave.id} style={{ borderBottom: '1px solid #f1f5f9' }}>`,
        `<tr key={leave.id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>`
    );
    return res;
});

// 12. ActivityLog.jsx
updateFile('ActivityLog.jsx', (content) => {
    let res = content.replace(
        `<tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>`,
        `<tr key={log.id} className="hover-row" style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s' }}>`
    );
    res = res.replace(
        `<div style={{ display: 'flex', justifyContent: 'flex-end' }}>`,
        `<div className="action-container" style={{ display: 'flex', justifyContent: 'flex-end' }}>`
    );
    return res;
});

console.log('All list upgrades completed!');
