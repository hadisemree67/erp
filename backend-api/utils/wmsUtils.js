/**
 * ============================================================================
 * BİLEŞEN ADI: wmsUtils
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
/*
 * Bu modül, Depo (WMS) sistemindeki ortak hesaplama ve kapasite kontrol
 * fonksiyonlarını barındırır. calculateShelf3D gibi hacimsel hesaplamalar
 * bu dosyadan projenin diğer modüllerine dağıtılır.
 */

/**
 * Rafın içine (3 boyutlu olarak) kaç koli/ürün sığacağını hesaplar.
 * Ürünün en/boy/derinliği ile rafın boşluğunu karşılaştırır.
 * 
 * @param {Object} params - Hesaplama parametreleri
 * @param {number} params.sW - Raf genişliği (cm)
 * @param {number} params.sH - Raf yüksekliği (cm)
 * @param {number} params.sD - Raf derinliği (cm)
 * @param {number} params.maxVolume - Rafın maksimum hacmi (cm³)
 * @param {number} params.pW - Paket/Ürün genişliği (cm)
 * @param {number} params.pH - Paket/Ürün yüksekliği (cm)
 * @param {number} params.pD - Paket/Ürün derinliği (cm)
 * @param {number} params.productVolume - Paket/Ürün hacmi (cm³)
 * @param {boolean|string|number} params.isStackable - Üst üste dizilebilir mi?
 * @param {number} params.maxStackLimit - Maksimum üst üste dizilme limiti
 * @param {number} params.pCap - Kolideki ürün adedi (kapasitesi)
 * @param {number} params.currentPackages - Raftaki mevcut paket sayısı
 * @param {number} params.currentFilledVol - Raftaki mevcut dolu hacim
 * 
 * @returns {Object} Hesaplama sonuçları (maxPackagesEmpty, remainingPackages, maxItems, physicallyFits, vb.)
 */
function calculateShelf3D(params) {
    // 1. GÜVENLİK VE TİP KONTROLÜ (Type Coercion & NaN Koruması)
    // Tüm girdileri güvenli sayı formatına çeviriyoruz. Undefined/Null gelirse NaN patlaması önlenir.
    const sW = Math.max(0, parseFloat(params.sW) || 0);
    const sH = Math.max(0, parseFloat(params.sH) || 0);
    const sD = Math.max(0, parseFloat(params.sD) || 0);
    const maxVolume = Math.max(0, parseFloat(params.maxVolume) || 0);
    
    const pW = Math.max(0, parseFloat(params.pW) || 0);
    const pH = Math.max(0, parseFloat(params.pH) || 0);
    const pD = Math.max(0, parseFloat(params.pD) || 0);
    const productVolume = Math.max(0, parseFloat(params.productVolume) || 0);
    
    // 🚨 GÜVENLİK DÜZELTMESİ: "false" stringi Boolean("false") ile true'ya dönüyordu, tam string ve number kontrolü eklendi.
    const isStackable = (params.isStackable === true || params.isStackable === 'true' || params.isStackable === 1 || params.isStackable === '1');
    const maxStackLimit = Math.max(0, parseInt(params.maxStackLimit, 10) || 0);
    
    let pCapParsed = parseFloat(params.pCap) || 1;
    if (pCapParsed <= 0) pCapParsed = 1;
    
    const currentPackages = Math.max(0, parseInt(params.currentPackages, 10) || 0);
    const currentFilledVol = Math.max(0, parseFloat(params.currentFilledVol) || 0);

    let maxPackagesEmpty = 0; // Rafa sıfırdan konulursa alabileceği maksimum kap/koli sayısı
    let physicallyFits = true; // Ürün fiziksel olarak rafa (kapıdan) sığıyor mu?

    // Ürünün hacmi yoksa en*boy*derinlik çarparak bul
    let usedVolPerPackage = (pW * pH * pD > 0) ? (pW * pH * pD) : productVolume;

    // 2. FİZİKSEL (3 BOYUTLU) SIĞMA KONTROLÜ
    if (sW > 0 && sH > 0 && sD > 0 && pW > 0 && pH > 0 && pD > 0) {
        // Tolerans payı (Rafın her yanından 5-10 cm boşluk bırakarak sıkışmayı önlüyoruz)
        const usableW = Math.max(0, sW - 10);
        const usableH = Math.max(0, sH - 5);
        const usableD = Math.max(0, sD - 5);

        const wCount = Math.floor(usableW / pW);
        const dCount = Math.floor(usableD / pD);
        const baseCount = wCount * dCount;

        let hCount = 0;
        if (isStackable) {
            hCount = Math.floor(usableH / pH);
            // 🚨 MANTIK HATASI ÇÖZÜMÜ: Üst üste dizilebilir deyip limit 0 gelirse 0 sığar diyordu. Limit 0 ise sınırsız (sadece rafa kadar) dizilebilir sayıyoruz.
            if (maxStackLimit > 0 && hCount > maxStackLimit) {
                hCount = maxStackLimit;
            }
        } else {
            hCount = (usableH >= pH) ? 1 : 0;
        }

        maxPackagesEmpty = baseCount * hCount;
        physicallyFits = maxPackagesEmpty > 0;
    } 
    // 3. HACİMSEL (VOLUME) BAZLI SIĞMA KONTROLÜ (Fiziksel 3D yoksa)
    else if (usedVolPerPackage > 0 && maxVolume > 0) {
        maxPackagesEmpty = Math.floor(maxVolume / usedVolPerPackage);
        physicallyFits = maxPackagesEmpty > 0;
    } 
    // 4. SINIRSIZ KAPASİTE (Parametreler tanımsızsa veya rafın kapasitesi yoksa sonsuz sığar varsay)
    else if (maxVolume === 0 || usedVolPerPackage === 0) {
        maxPackagesEmpty = Infinity;
        physicallyFits = true;
    }

    // 5. MEVCUT DOLULUĞU HESABA KATARAK KALAN (REMAINING) BOŞLUĞU HESAPLAMA
    let remainingPackages = Infinity;
    if (maxPackagesEmpty !== Infinity) {
        if (currentFilledVol > 0 && maxVolume > 0 && usedVolPerPackage > 0) {
            // Kalan hacmi bul
            const emptyVol = Math.max(0, maxVolume - currentFilledVol);
            // Kalan hacme kaç paket sığar?
            const fitByVol = Math.floor(emptyVol / usedVolPerPackage);
            
            // 🚨 MANTIK HATASI ÇÖZÜMÜ: Hacimsel boşluk olsa bile fiziksel sınır (maxPackagesEmpty) eksi currentPackages kadar sığabilir.
            const physicalSpaceLeft = Math.max(0, maxPackagesEmpty - currentPackages);
            remainingPackages = Math.min(fitByVol, physicalSpaceLeft);
        } else {
            remainingPackages = Math.max(0, maxPackagesEmpty - currentPackages);
        }
    }

    // Toplam sığabilecek adet (Paket sayısı * Koli İçi Adet)
    let maxItems = Infinity;
    if (remainingPackages !== Infinity) {
        maxItems = remainingPackages * pCapParsed;
    }

    // Yüzdelik Doluluk Oranı
    let fillPercentage = 0;
    if (maxVolume > 0 && currentFilledVol > 0) {
        fillPercentage = parseFloat(((currentFilledVol / maxVolume) * 100).toFixed(1));
        if (fillPercentage > 100) fillPercentage = 100;
    }

    // Verimlilik (Efficiency) Hesaplama
    let efficiency = 0;
    if (maxVolume > 0 && maxPackagesEmpty !== Infinity && usedVolPerPackage > 0) {
        const potentialVol = maxPackagesEmpty * usedVolPerPackage;
        efficiency = (potentialVol / maxVolume) * 100;
        if (efficiency > 100) efficiency = 100;
    }

    return {
        maxPackagesEmpty,
        remainingPackages,
        maxItems,
        physicallyFits,
        efficiency: parseFloat(efficiency.toFixed(1)),
        emptyVolume: (maxVolume > 0 && currentFilledVol > 0) ? Math.max(0, maxVolume - currentFilledVol) : maxVolume,
        fillPercentage: fillPercentage,
        isStackable,
        maxStackLimit
    };
}

module.exports = {
    calculateShelf3D
};

