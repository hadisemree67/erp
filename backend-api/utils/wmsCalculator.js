/**
 * 3D Bin Packing algoritması
 * Verilen ürünleri belirtilen boyutlardaki (W, H, D) ve maxWeight kapasitesindeki tek bir kutuya sığdırmaya çalışır.
 * Sığmayan ürünleri geri döndürür.
 */
function packSingleBox(units, boxW, boxH, boxD, maxWeight) {
    let spaces = [{ w: boxW, h: boxH, d: boxD }];
    let currentWeight = 0;
    let unpacked = [];
    
    for (const unit of units) {
        if (currentWeight + unit.weight > maxWeight) {
            unpacked.push(unit);
            continue;
        }
        
        let placed = false;
        // Bir ürünün kutuya konulabileceği 6 olası rotasyonu
        const rotations = [
            { w: unit.w, h: unit.h, d: unit.d },
            { w: unit.w, h: unit.d, d: unit.h },
            { w: unit.h, h: unit.w, d: unit.d },
            { w: unit.h, h: unit.d, d: unit.w },
            { w: unit.d, h: unit.w, d: unit.h },
            { w: unit.d, h: unit.h, d: unit.w }
        ];
        
        // Alanları hacimlerine göre (küçükten büyüğe) sıralayarak boşlukları verimli doldur
        spaces.sort((a, b) => (a.w * a.h * a.d) - (b.w * b.h * b.d));
        
        for (let i = 0; i < spaces.length; i++) {
            const space = spaces[i];
            for (const rot of rotations) {
                if (rot.w <= space.w && rot.h <= space.h && rot.d <= space.d) {
                    placed = true;
                    spaces.splice(i, 1);
                    
                    // Kalan 3 boyutlu boşlukları hesapla
                    const s1 = { w: space.w - rot.w, h: space.h, d: space.d };
                    const s2 = { w: rot.w, h: space.h - rot.h, d: space.d };
                    const s3 = { w: rot.w, h: rot.h, d: space.d - rot.d };
                    
                    if (s1.w > 0 && s1.h > 0 && s1.d > 0) spaces.push(s1);
                    if (s2.w > 0 && s2.h > 0 && s2.d > 0) spaces.push(s2);
                    if (s3.w > 0 && s3.h > 0 && s3.d > 0) spaces.push(s3);
                    
                    currentWeight += unit.weight;
                    break;
                }
            }
            if (placed) break;
        }
        if (!placed) unpacked.push(unit);
    }
    return unpacked;
}

module.exports = { packSingleBox };
