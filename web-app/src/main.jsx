import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// React uygulamasının ana DOM noktasına (root) bağlanmasını ve render edilmesini sağlar
createRoot(document.getElementById('root')).render(
  // Geliştirme aşamasında potansiyel sorunları tespit etmek için StrictMode kullanılır
  <StrictMode>
    <BrowserRouter>
      {/* Ana uygulama bileşenini çağırır */}
      <App />
    </BrowserRouter>
  </StrictMode>,
)
