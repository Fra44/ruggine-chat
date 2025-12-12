import { Routes, Route, } from "react-router-dom";
import { Toaster } from "react-hot-toast";


import './App.css'
import RegisterPage from "./pages/RegisterPage";
import type { User } from "./models/models";
import LoginPage from "./pages/LoginPage";
import { useState } from "react";
import HomePage from "./pages/HomePage";

function App() {

  const [user, setUser] = useState<User | null>(null);

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
        <Route path="/" />
        <Route path="/homepage" element={ <HomePage user = {user}/>}/>
        <Route path="/login" element={<LoginPage user={user} setUser={setUser} />} />
        <Route path="/register" element={<RegisterPage user={user} setUser={setUser} />} />
      </Routes>
    </>
  )
}

export default App
