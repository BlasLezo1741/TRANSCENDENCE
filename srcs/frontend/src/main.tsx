import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './i18n';
import { ModalProvider } from './context/ModalContext.tsx';

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 2. ENVOLVER LA APP */}
    <ModalProvider>
      <App />
    </ModalProvider>
  </StrictMode>,
)