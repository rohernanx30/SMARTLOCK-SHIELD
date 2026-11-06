
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "./firebase";
import { esPropietario } from "./permisos";

import Login from "./Login";
import Setup2FA from "./Setup2FA";
import RutaProtegida from "./RutaProtegida";
import Dashboard from "./Dashboard";
import Perfiles from "./Perfiles";
import ConfiguracionNFC from "./ConfiguracionNFC";
import Confirmaciones from "./Confirmaciones";

function RutaPropietario({ children }: { children: React.ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (usuario) => {
      setAutorizado(usuario !== null && esPropietario());
      setCargando(false);
    });

    return () => cancelar();
  }, []);

  if (cargando) {
    return (
      <main className="login-page">
        <section className="login-content">
          <p>Comprobando permisos de propietario...</p>
        </section>
      </main>
    );
  }

  if (!autorizado) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup-2fa" element={<Setup2FA />} />

        <Route element={<RutaProtegida />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/perfiles" element={<Perfiles />} />

          <Route
            path="/perfiles/:id/nfc"
            element={
              <RutaPropietario>
                <ConfiguracionNFC />
              </RutaPropietario>
            }
          />

          <Route
            path="/confirmaciones"
            element={
              <RutaPropietario>
                <Confirmaciones />
              </RutaPropietario>
            }
          />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
