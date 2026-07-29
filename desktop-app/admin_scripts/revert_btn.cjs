const fs = require('fs');

function fixLoginButton() {
    const filename = 'C:/Users/dedih/Desktop/stokerpsistemi/desktop-app/src/App.jsx';
    let content = fs.readFileSync(filename, 'utf8');

    const searchStr = `<button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>`;
    
    const replaceStr = `<button type="submit" style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }} disabled={loading} onMouseOver={(e) => e.target.style.background = '#1e293b'} onMouseOut={(e) => e.target.style.background = '#0f172a'}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>`;

    if (content.includes(searchStr)) {
        content = content.replace(searchStr, replaceStr);
        fs.writeFileSync(filename, content);
        console.log('Login button reverted');
    } else {
        console.log('Button not found');
    }
}

fixLoginButton();
