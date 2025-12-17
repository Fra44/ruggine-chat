import { Routes, Route, Navigate, } from "react-router-dom";
import { Toaster } from "react-hot-toast";


import './App.css'
import RegisterPage from "./pages/RegisterPage";
// import type { User } from "./models/models"; // Non serve più qui
import LoginPage from "./pages/LoginPage";
// import { useState } from "react"; // Non serve più qui
import HomePage from "./pages/HomePage";
import { useAppContext } from "./context/AppContext";
// Importiamo l'hook per l'utente, anche se qui non lo usiamo direttamente
// ma AppProvider si occupa del routing iniziale.
// import { useAppContext } from "./context/AppContext"; 
import NotFoundPage from "./pages/NotFoundPage";

function App() {

  // Rimosso: const [user, setUser] = useState<User | null>(null);

  const appContext = useAppContext();
  return (
    <>
      <Toaster
        position="top-center"
        containerStyle={{
          zIndex: 99999
        }}
        toastOptions={{
          style: { fontSize: '1.2rem', borderRadius: '11px' },
          className: 'e2e-toast',
          success: {
            iconTheme: { primary: '#265ea8', secondary: '#fff' },
            className: 'e2e-toast e2e-toast-success'
          },
          error: {
            iconTheme: { primary: '#c62828', secondary: '#fff' },
            className: 'e2e-toast e2e-toast-error'
          }
        }}
      />
      <Routes>
        {/* Usiamo HomePage senza props, prenderà lo stato dal Context */}
        <Route path="/" element={<Navigate to={appContext.user ? "/homepage" : "/login"} replace />} />
        <Route path="/homepage" element={appContext.user ? <HomePage /> : <Navigate to="/login" replace />} />
        {/* Usiamo LoginPage senza props, prenderà le azioni dal Context */}
        <Route path="/login" element={appContext.user ? <Navigate to="/homepage" replace /> : <LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App