// frontend/src/App.tsx
import { useState } from 'react'; // <--- 1. Re-import useState
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import './App.css';

function App() {
  const [count, setCount] = useState(0); // <--- 2. Initialize the counter state
  const { t } = useTranslation();

  return (
    <div className="App">
      
      {/* --- Main Content Section (Top/Center) --- */}
      <div className="content-container">
        <LanguageSwitcher /> {/* Switcher stays near the top content */}
        
        <h1>{t('temp')}</h1>
        
        <div className="card">
          <img src="/lezo.jpg" alt="Blas Logo" style={{ width: '400px' }} />
        </div>
      </div>

      {/* --- Footer Section (Counter Button) --- */}
      <footer className="footer-bottom">
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            {t('count')} {count}
          </button>
        </div>
      </footer>

    </div>
  );
}

export default App;