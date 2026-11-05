import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Setup2FA from "./Setup2FA";
import RutaProtegida from "./RutaProtegida";
import Dashboard from "./Dashboard";
import Perfiles from "./Perfiles";
import ConfiguracionNFC from "./ConfiguracionNFC";
import Confirmaciones from "./Confirmaciones";
import { esPropietario } from "./permisos";

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
              esPropietario() ? (
                <ConfiguracionNFC />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          <Route
            path="/confirmaciones"
            element={
              esPropietario() ? (
                <Confirmaciones />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}