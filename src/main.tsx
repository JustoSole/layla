import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { BusinessProvider } from './contexts/BusinessContext';
import { FilterProvider } from './contexts/FilterContext';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BusinessProvider>
          <FilterProvider>
            <App />
          </FilterProvider>
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
