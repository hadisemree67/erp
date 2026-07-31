/*
 * ÖZET:
 * Bu script, admin_scripts klasöründeki tüm script dosyalarının başına 
 * türüne göre otomatik açıklama satırı ekleyen bir araçtır.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'admin_scripts');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') || f.endsWith('.cjs'));

files.forEach(file => {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    let typeDesc = 'Veritabanı bakım ve yönetim aracı.';
    
    if (file.startsWith('alter_') || file.startsWith('alter')) {
        typeDesc = 'Veritabanı Yama Aracı (Migration).\nMevcut tabloları bozmadan yeni özellik/sütun eklemek için tek seferlik çalıştırılır.';
    } else if (file.startsWith('migrate_')) {
        typeDesc = 'Veri Göçü Aracı (Data Migration).\nEski verileri yeni sistemin yapısına uygun hale getirmek ve taşımak için kullanılır.';
    } else if (file.startsWith('fix_') || file.startsWith('fix-')) {
        typeDesc = 'Tamir Aracı (Fix Script).\nVeritabanındaki yanlış veya bozuk hesaplamaları (örn: hacim/stok hataları) topluca onarır.';
    } else if (file.startsWith('seed') || file.startsWith('setup_') || file.startsWith('create') || file.startsWith('init')) {
        typeDesc = 'İlk Kurulum Aracı (Seed/Setup).\nSistem ilk kurulduğunda varsayılan ayarları ve temel verileri veritabanına gömer.';
    } else if (file.startsWith('test_') || file.startsWith('check_') || file.startsWith('list') || file.startsWith('inspect')) {
        typeDesc = 'Test ve Kontrol Aracı (Lab/Test).\nGeliştirici tarafından arka planda verilerin doğru gelip gelmediğini manuel test etmek için kullanılır.';
    }

    const newHeader = "/*\n * " + file + "\n * " + typeDesc.split('\n').join('\n * ') + "\n * Bu dosya aktif uygulamanın değil, arka plandaki alet çantasının (admin_scripts) bir parçasıdır.\n */\n\n";
    
    // Başlangıçtaki mevcut açıklama bloğunu değiştir veya başa ekle
    const headerRegex = /^\/\*[\s\S]*?\*\/\s*/;
    if (headerRegex.test(content)) {
        content = content.replace(headerRegex, newHeader);
    } else {
        content = newHeader + content;
    }
    
    fs.writeFileSync(fullPath, content);
});

console.log(files.length + ' adet admin script dosyası yeni açıklamalarıyla güncellendi!');
process.exit(0);
