async function test() {
  const form = new FormData();
  form.append('ProductName', 'saasg');
  form.append('Barcode', '["asf","asga"]');
  form.append('Category', 'Anne & Bebek Bakımı');
  form.append('Brand', 'CeraVe');
  form.append('Formula', '[]');
  form.append('Location', '');
  form.append('ProductionTime', '');
  form.append('PurchasePrice', '0');
  form.append('SalePrice', '0');
  form.append('StockQuantity', '0');
  form.append('existingImages', '[]');

  try {
    const response = await fetch('http://localhost:3000/api/products/9', {
      method: 'PUT',
      body: form
    });
    const text = await response.text();
    console.log('Response:', text);
  } catch (err) {
    console.error(err);
  }
}
test();
