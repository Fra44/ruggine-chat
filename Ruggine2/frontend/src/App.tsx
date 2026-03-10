import { Routes, Route, Navigate, } from "react-router-dom";
import { useAppContext } from "./context/AppContext";
import { Toaster } from "react-hot-toast";
import RegisterPage from "./pages/RegisterPage";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import './App.css'

/**
 * App component — the main application component.
 *
 * Responsibilities:
 * - Sets up routing for the application using React Router.
 * - Configures toast notifications with react-hot-toast.
 * - Handles authentication-based redirects for protected routes.
 * - Renders the appropriate page based on user authentication status.
 */
function App() {

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
        <Route path="/" element={<Navigate to={appContext.user ? "/homepage" : "/login"} replace />} />
        <Route path="/homepage" element={appContext.user ? <HomePage /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={appContext.user ? <Navigate to="/homepage" replace /> : <LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App