import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConvexProviderGate } from './components/ConvexProviderGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConvexProviderGate>
      <App />
    </ConvexProviderGate>
  </StrictMode>,
)
