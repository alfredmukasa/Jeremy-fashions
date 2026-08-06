import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { preloadCatalog } from './hooks/useCatalog'

// Kick off the products/categories fetch immediately, in parallel with the route's
// lazy-loaded JS chunk downloading — instead of waiting for HomePage/ShopPage to
// mount before their own useEffect fires the request.
preloadCatalog()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
