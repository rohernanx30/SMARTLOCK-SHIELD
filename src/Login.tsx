

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import "./styles.css";

export default function Login() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function iniciarSesion() {
    setCargando(true);
    setError("");

    try {
      const proveedor = new GoogleAuthProvider();

      await signInWithPopup(auth, proveedor);

      // Ir a la pantalla de verificación después de iniciar sesión.
      navigate("/setup-2fa");
    } catch (err) {
      console.error("Error de inicio de sesión:", err);

      setError(
        "No se pudo iniciar sesión. Verifica tu conexión y la configuración de Firebase."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-grid" aria-hidden="true" />

      <section className="login-content">
        <div className="connection-badge">
          <span className="connection-dot" />
          <span>SMARTLOCK SHIELD</span>
          <span className="connection-status">SEGURIDAD IoT</span>
        </div>

        <div className="login-logo" aria-hidden="true">
          <span>⌑</span>
        </div>

        <div className="login-heading">
          <span className="login-tag">◈ CONTROL CRIPTOGRÁFICO</span>
          <h1>Seguridad inteligente, acceso controlado</h1>
          <p>
            Plataforma centralizada para administrar perfiles de acceso
            y supervisar tu cerradura inteligente.
          </p>
        </div>

        <section className="login-card">
          <div className="card-top-line" />

          <div className="auth-label">
            <span>CANAL DE AUTENTICACIÓN</span>
            <span className="auth-version">FIREBASE AUTH</span>
          </div>

          <button
            className="google-button"
            type="button"
            onClick={iniciarSesion}
            disabled={cargando}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.78-.07-1.53-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.4 3.62v2.96h3.89c2.27-2.1 3.55-5.2 3.55-8.61Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.08 7.95-2.92l-3.9-2.96c-1.08.72-2.45 1.15-4.05 1.15-3.12 0-5.77-2.1-6.72-4.93H1.36v3.05A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.34a7.2 7.2 0 0 1 0-4.68V6.61H1.36a12 12 0 0 0 0 10.78l3.92-3.05Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.47 11.47 0 0 0 12 0 12 12 0 0 0 1.36 6.61l3.92 3.05C6.23 6.83 8.88 4.75 12 4.75Z"
              />
            </svg>

            <span>
              {cargando
                ? "Verificando acceso..."
                : "Iniciar sesión con Google"}
            </span>

            {!cargando && (
              <span className="google-arrow">›</span>
            )}
          </button>

          {cargando && (
            <p className="login-message" role="status">
              Conectando con Firebase...
            </p>
          )}

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <div className="security-details">
            <span>◇ Conexión segura</span>
            <span>•</span>
            <span>Firebase Auth</span>
          </div>
        </section>

        <div className="login-info">
          <div>
            <span className="info-icon">⌘</span>
            <div>
              <small>PLATAFORMA</small>
              <strong>SmartLock Shield</strong>
            </div>
          </div>

          <div>
            <span className="info-icon">ϟ</span>
            <div>
              <small>ESTADO DE ACCESO</small>
              <strong>Protección activa</strong>
            </div>
          </div>
        </div>

        <footer className="login-footer">
          <strong>Universidad Evangélica de El Salvador</strong>
          <span>Proyecto SmartLock Shield · 2026</span>
        </footer>
      </section>
    </main>
  );
}
