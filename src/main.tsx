import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'

import App from './App.tsx'
import './index.css'

// Import Firebase initialization
import './firebase/firebase-config.template'

// Import and initialize PWA Manager
import { pwaManager } from './lib/pwaManager'

// Initialize PWA Manager
pwaManager.init().catch(console.error)

// Remove loading screen once React app loads
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.body.classList.add('app-loaded')
  }, 100)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster 
        position="top-center" 
        dir="rtl"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Cairo, Tajawal, system-ui, sans-serif',
            direction: 'rtl',
            textAlign: 'right'
          }
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)