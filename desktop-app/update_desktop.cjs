const fs = require('fs');

const path = './src/components/Orders/CustomerOrders.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Paketleniyor to getStatusStyle
content = content.replace(
    /case 'Hazır': return \{ bg: '#dcfce3', color: '#16a34a', label: 'Toplandı \(Hazır\)' \};/,
    `case 'Hazır': return { bg: '#dcfce3', color: '#16a34a', label: 'Toplandı (Hazır)' };
              case 'Paketleniyor': return { bg: '#fef3c7', color: '#d97706', label: 'Paketleniyor' };`
);

// 2. Add Paketleniyor to Tabs
content = content.replace(
    /\{ id: 'Hazır', label: 'Toplandı \(Hazır\)' \},/,
    `{ id: 'Hazır', label: 'Toplandı (Hazır)' },
                        { id: 'Paketleniyor', label: 'Paketleniyor' },`
);

// 3. Add Paketleniyor to Filter array for stats
content = content.replace(
    /orders\.filter\(o => \['Beklemede', 'Onaylandı', 'Hazırlanıyor', 'Hazır', 'Paketlendi'\]\.includes\(o\.OrderStatus\)\)\.length/,
    `orders.filter(o => ['Beklemede', 'Onaylandı', 'Hazırlanıyor', 'Hazır', 'Paketleniyor', 'Paketlendi'].includes(o.OrderStatus)).length`
);

// 4. Update the detail modal to show the full audit trail
const searchStr = `<div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '2px' }}>Ödeme Şekli:</div>`;
const replacement = `<div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '2px' }}>Ödeme Şekli:</div>`;

const auditHtml = `
                                          <div style={{ gridColumn: '1 / -1', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>İşlem Geçmişi</div>
                                              
                                              {selectedOrderDetail.PickerName && (
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                      <span style={{ fontSize: '12px', color: '#64748b' }}>Toplayan: <b>{selectedOrderDetail.PickerName}</b></span>
                                                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedOrderDetail.PickedDate ? new Date(selectedOrderDetail.PickedDate).toLocaleString('tr-TR') : '-'}</span>
                                                  </div>
                                              )}
                                              {selectedOrderDetail.PackerName && (
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                      <span style={{ fontSize: '12px', color: '#64748b' }}>Paketleyen: <b>{selectedOrderDetail.PackerName}</b></span>
                                                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedOrderDetail.PackedDate ? new Date(selectedOrderDetail.PackedDate).toLocaleString('tr-TR') : '-'}</span>
                                                  </div>
                                              )}
                                              {selectedOrderDetail.ShipUserName && (
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                      <span style={{ fontSize: '12px', color: '#64748b' }}>Kargoya Veren: <b>{selectedOrderDetail.ShipUserName}</b></span>
                                                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedOrderDetail.ShippedDate ? new Date(selectedOrderDetail.ShippedDate).toLocaleString('tr-TR') : '-'}</span>
                                                  </div>
                                              )}
                                              {!selectedOrderDetail.PickerName && !selectedOrderDetail.PackerName && !selectedOrderDetail.ShipUserName && (
                                                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Henüz işlem yapılmamış.</span>
                                              )}
                                          </div>
`;

content = content.replace(searchStr, auditHtml + searchStr);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated CustomerOrders.jsx successfully!");
