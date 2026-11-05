import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { get, ref } from "firebase/database";
import { auth, db } from "./firebase";

export default function RutaProtegida() {
  const [cargando, setCargando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const [verificado, setVerificado] = useState(false);

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, async (usuario) => {
      setCargando(true);

      if (!usuario) {
        setAutenticado(false);
        setVerificado(false);
        setCargando(false);
        return;
      }

      setAutenticado(true);

      try {
        const resultado = await get(
          ref(db, `users/${usuario.uid}`)
        );

        const datos = resultado.val();

        setVerificado(
          datos?.twoFactorEnabled === true &&
          typeof datos?.totpSecret === "string" &&
          datos.totpSecret.length > 0
        );
      } catch (error) {
        console.error("Error comprobando la seguridad:", error);
        setVerificado(false);
      } finally {
        setCargando(false);
      }
    });

    return () => cancelar();
  }, []);

  if (cargando) {
    return (
      <main className="login-page">
        <section className="login-content">
          <p>Comprobando el acceso seguro...</p>
        </section>
      </main>
    );
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  if (!verificado) {
    return <Navigate to="/setup-2fa" replace />;
  }

  return <Outlet />;
}
