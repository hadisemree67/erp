const { packSingleBox } = require('../../utils/wmsCalculator');

describe('WMS 3D Bin Packing Alogritması', () => {
    it('küçük ürünler büyük bir kutuya sığabilmelidir', () => {
        const units = [
            { w: 10, h: 10, d: 10, weight: 1 },
            { w: 10, h: 10, d: 10, weight: 1 }
        ];
        
        // Kutu: 20x20x20, kapasite 5kg
        const unpacked = packSingleBox(units, 20, 20, 20, 5);
        expect(unpacked.length).toBe(0); // Hiçbiri dışarıda kalmamalı
    });

    it('kapasite veya boyut aşıldığında ürünler sığmamalı ve geri dönmelidir', () => {
        const units = [
            { w: 30, h: 30, d: 30, weight: 10 } // Bu ürün çok büyük ve ağır
        ];
        
        // Kutu: 20x20x20, kapasite 5kg
        const unpacked = packSingleBox(units, 20, 20, 20, 5);
        expect(unpacked.length).toBe(1); // 1 ürün sığamadı
    });

    it('ağırlık sınırına takılan ürün dışarıda kalmalıdır', () => {
        const units = [
            { w: 5, h: 5, d: 5, weight: 4 },
            { w: 5, h: 5, d: 5, weight: 2 }
        ];
        
        // Kutu hacmi çok geniş ama maxWeight sadece 5kg
        const unpacked = packSingleBox(units, 50, 50, 50, 5);
        // İlk ürün 4kg sığar (kalan: 1kg). İkinci ürün 2kg sığmaz.
        expect(unpacked.length).toBe(1); 
        expect(unpacked[0].weight).toBe(2);
    });
});
