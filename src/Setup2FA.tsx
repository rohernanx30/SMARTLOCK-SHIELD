import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { get, ref, set } from "firebase/database";
import * as OTPAuth from "otpauth";
import { QRCodeSVG } from "qrcode.react";
import { auth, db } from "./firebase";

export default function Setup2FA() {
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [configurado, setConfigurado] = useState(false);
  const [secreto, setSecreto] = useState("");
  const [uriQR, setUriQR] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const referencia = ref(db, `users/${usuario.uid}`);
        const resultado = await get(referencia);
        const datos = resultado.val();

        if (datos?.twoFactorEnabled && datos?.totpSecret) {
          setConfigurado(true);
          setSecreto(datos.totpSecret);
          setUriQR("");
        } else {
          const nuevoSecreto = new OTPAuth.Secret({ size: 20 });
          const totp = new OTPAuth.TOTP({
            issuer: "SmartLock Shield",
            label: usuario.email || usuario.uid,
            algorithm: "SHA1",
            digits: 6,
            period: 30,
            secret: nuevoSecreto,
          });

          setConfigurado(false);
          setSecreto(nuevoSecreto.base32);
          setUriQR(totp.toString());
        }
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar la configuración de seguridad.");
      } finally {
        setCargando(false);
      }
    });

    return () => cancelar();
  }, [navigate]);

  async function verificarCodigo() {
    setError("");
    setMensaje("");

    const usuario = auth.currentUser;

    if (!usuario || !secreto) {
      setError("No se encontró la sesión o la clave de autenticación.");
      return;
    }

    if (!/^\d{6}$/.test(codigo)) {
      setError("Introduce un código válido de seis dígitos.");
      return;
    }

    try {
      const totp = new OTPAuth.TOTP({
        issuer: "SmartLock Shield",
        label: usuario.email || usuario.uid,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secreto),
      });

      const valido = totp.validate({ token: codigo, window: 1 });

      if (valido === null) {
        setError("Código incorrecto o vencido. Inténtalo de nuevo.");
        return;
      }

      if (!configurado) {
        await set(ref(db, `users/${usuario.uid}/totpSecret`), secreto);
        await set(ref(db, `users/${usuario.uid}/twoFactorEnabled`), true);
      }

      setMensaje("Código verificado correctamente.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      setError("No se pudo completar la verificación. Inténtalo de nuevo.");
    }
  }

  if (cargando) {
    return (
      <main className="login-page">
        <section className="login-content">
          <p>Preparando la verificación de seguridad...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <div className="login-grid" aria-hidden="true" />

      <section className="login-content">
        <div className="connection-badge">
          <span className="connection-dot" />
          <span>SMARTLOCK SHIELD</span>
          <span className="connection-status">SEGURIDAD 2FA</span>
        </div>

        <div className="login-heading">
          <span className="login-tag">◈ PROTECCIÓN DE CUENTA</span>
          <h1>
            {configurado
              ? "Verifica tu identidad"
              : "Protege tu cuenta"}
          </h1>
          <p>
            {configurado
              ? "Introduce el código de seis dígitos de tu aplicación autenticadora para continuar."
              : "Vincula una aplicación autenticadora para añadir una capa adicional de seguridad."}
          </p>
        </div>

        <section className="login-card">
          <div className="card-top-line" />

          {!configurado && uriQR && (
            <div className="twofa-setup">
              <h2>1. Escanea el código QR</h2>
              <p>
                Utiliza una aplicación autenticadora compatible,
                como Google Authenticator o Microsoft Authenticator.
              </p>

              <div className="qr-container">
                <QRCodeSVG value={uriQR} size={200} />
              </div>

              <p className="twofa-warning">
                Configura la aplicación antes de continuar.
                No compartas tu clave de autenticación.
              </p>

              <details>
                <summary>¿No puedes escanear el QR?</summary>
                <p>Clave manual de configuración:</p>
                <code className="secret-key">{secreto}</code>
              </details>
            </div>
          )}

          {configurado && (
            <div className="twofa-setup">
              <h2>Autenticador vinculado</h2>
              <p>
                Abre tu aplicación autenticadora e introduce
                el código actual.
              </p>
            </div>
          )}

          <label className="twofa-label" htmlFor="codigo-2fa">
            CÓDIGO DE VERIFICACIÓN
          </label>

          <input
            id="codigo-2fa"
            className="twofa-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={codigo}
            onChange={(e) =>
              setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
          />

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          {mensaje && (
            <p className="twofa-success" role="status">
              {mensaje}
            </p>
          )}

          <button
            className="google-button"
            type="button"
            onClick={verificarCodigo}
            disabled={codigo.length !== 6}
          >
            Verificar y continuar
          </button>

          <button
            className="twofa-back"
            type="button"
            onClick={async () => {
              const confirmado = window.confirm("¿Seguro que quieres cerrar sesión?");

              if (!confirmado) return;

              await auth.signOut();
              navigate("/login", { replace: true });
            }}
          >
            Cerrar sesión
          </button>
        </section>

        <footer className="login-footer">
          <strong>Universidad Evangélica de El Salvador</strong>
          <span>Proyecto SmartLock Shield · 2026</span>
        </footer>
      </section>
    </main>
  );
}
