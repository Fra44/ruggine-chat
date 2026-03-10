/**
 * Main entry point for the Ruggine React application.
 *
 * Sets up the application with:
 * - React Strict Mode for development warnings
 * - BrowserRouter for client-side routing
 * - AppProvider for global state management
 * - Renders the main App component
 */
import { BrowserRouter } from 'react-router'
import { AppProvider } from './context/AppContext.tsx'
import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App.tsx'
import './index.css'

if (typeof document !== 'undefined') document.title = 'Ruggine';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)