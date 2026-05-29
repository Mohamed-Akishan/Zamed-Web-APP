// src/main.jsx
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { SiteProvider } from './context/SiteContext.jsx'
import { initFavicon } from './services/faviconService'
import './index.css'

// Initialize favicon service on app start
initFavicon();

createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <SiteProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </SiteProvider>
  </HelmetProvider>
);