/*
 * ÖZET:
 * Bu script, projedeki tüm dosyalara o eski kalabalık yorum başlıklarını 
 * otomatik eklemek için kullanılmış olan bir araçtır. Artık kullanılmamalıdır.
 */

const fs = require('fs');
const path = require('path');

function addComments(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'brain') continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            addComments(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (!content.trim().startsWith('/*')) {
                const base = path.basename(fullPath);
                const dirName = path.basename(path.dirname(fullPath));
                let note = 'Projenin çalışması için gereken kodları barındırıyor.';
                if (dirName === 'routes') note = 'API uç noktalarımız. Gelen istekleri (GET, POST) karşılayıp cevaplıyoruz.';
                else if (dirName === 'components') note = 'Ekranda gördüğümüz görsel parçalar (butonlar, tablolar vs.) burada.';
                else if (dirName === 'pages') note = 'Sitenin ana sayfaları. Bileşenleri (components) birleştirip buraya koyuyoruz.';
                else if (dirName === 'utils') note = 'Sağda solda işimize yarayan ufak tefek fonksiyonları buraya topladık.';
                else if (dirName === 'models') note = 'Veritabanı işlemleri ve şema tanımları burada.';
                else if (dirName === 'services') note = 'Dış servislerle (örneğin mail atma) iletişim kurduğumuz yer.';
                
                const header = "/*\n * " + base + "\n * " + note + "\n * Biraz karışık görünebilir ama işin özünü burada hallediyoruz.\n */\n\n";
                fs.writeFileSync(fullPath, header + content);
            }
        }
    }
}

addComments('.');
console.log('Tüm dosyalara insancıl başlıklar eklendi!');
process.exit(0);
