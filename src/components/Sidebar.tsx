import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { esPropietario } from "../permisos";

type SidebarProps = {
  active: "dashboard" | "perfiles" | "confirmaciones";
};

export default function Sidebar({ active }: SidebarProps) {
  const navigate = useNavigate();
  const usuario = auth.currentUser;

  const propietario = esPropietario();

  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [errorSesion, setErrorSesion] = useState("");

  async function cerrarSesion() {
    if (cerrandoSesion) return;

    setCerrandoSesion(true);
    setErrorSesion("");

    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setErrorSesion(
        "No se pudo cerrar la sesión. Inténtalo nuevamente."
      );
    } finally {
      setCerrandoSesion(false);
    }
  }

  function cancelarCierre() {
    if (cerrandoSesion) return;
    setMostrarConfirmacion(false);
    setErrorSesion("");
  }

  return (
    <>
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">◈</div>

          <div>
            <strong>SmartLock Shield</strong>
            <span>IoT SECURITY</span>
          </div>
        </div>

        <div className="dashboard-user">
          {usuario?.photoURL && (
            <img
              src={usuario.photoURL}
              alt="Foto de perfil de Google"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = "none";

                const respaldo =
                  e.currentTarget.nextElementSibling as HTMLElement | null;

                if (respaldo) respaldo.style.display = "grid";
              }}
            />
          )}

          <div
            className="dashboard-avatar"
            style={{ display: usuario?.photoURL ? "none" : "grid" }}
          >
            {(usuario?.displayName || usuario?.email || "U")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="dashboard-user-info">
            <strong>{usuario?.displayName || "Usuario"}</strong>
            <span>{usuario?.email || "Sesión activa"}</span>
          </div>
        </div>

        <nav className="dashboard-nav">
          <button
            type="button"
            className={active === "dashboard" ? "active" : ""}
            onClick={() => navigate("/dashboard")}
          >
            <span>▦</span> Dashboard
          </button>

          <button
            type="button"
            className={active === "perfiles" ? "active" : ""}
            onClick={() => navigate("/perfiles")}
          >
            <span>♙</span> Perfiles
          </button>

          {propietario && (
            <button
              type="button"
              className={active === "confirmaciones" ? "active" : ""}
              onClick={() => navigate("/confirmaciones")}
            >
              <span>◷</span> Confirmaciones
            </button>
          )}
        </nav>

        <button
          type="button"
          className="dashboard-logout"
          onClick={() => {
            setErrorSesion("");
            setMostrarConfirmacion(true);
          }}
        >
          <span>↪</span> Cerrar sesión
        </button>
      </aside>

      {mostrarConfirmacion && (
        <div className="delete-modal-overlay">
          <section
            className="delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            aria-describedby="logout-modal-description"
          >
            <div className="delete-modal-icon">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
              </svg>
            </div>

            <span className="delete-modal-eyebrow">
              CONFIRMACIÓN DE SEGURIDAD
            </span>

            <h2 id="logout-modal-title">¿Cerrar sesión?</h2>

            <p id="logout-modal-description">
              ¿Estás seguro de que deseas cerrar tu sesión en
              <strong> SmartLock Shield</strong>? Tendrás que iniciar
              sesión nuevamente para acceder al sistema.
            </p>

            {errorSesion && (
              <p className="dashboard-error" role="alert">
                {errorSesion}
              </p>
            )}

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-modal-cancel"
                onClick={cancelarCierre}
                disabled={cerrandoSesion}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="delete-modal-confirm"
                onClick={cerrarSesion}
                disabled={cerrandoSesion}
              >
                {cerrandoSesion ? "Cerrando sesión..." : "Sí, cerrar sesión"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}