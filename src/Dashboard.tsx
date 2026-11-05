
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { limitToLast, onValue, query, ref } from "firebase/database";
import { signOut } from "firebase/auth";
import { auth, db, DEVICE_ID } from "./firebase";
import "./styles.css";
import Sidebar from "./components/Sidebar";

type Perfil = {
  nombre?: string;
  securityLevel?: string;
  estado?: string;
};

type Registro = {
  id: string;
  epoch?: number;
  method?: string;
  result?: string;
  perfilId?: string;
  credentialId?: string;
};

type EstadoDispositivo = {
  online?: boolean;
  lockState?: string;
  securityMode?: string;
  lastHeartbeatEpoch?: number;
  lastEventEpoch?: number;
};

const TIEMPO_MAXIMO_SIN_DATOS = 5 * 60 * 1000;

function fechaLegible(epoch?: number) {
  if (typeof epoch !== "number" || !Number.isFinite(epoch)) {
    return "Fecha no disponible";
  }

  return new Date(epoch * 1000).toLocaleString("es-SV");
}

function textoResultado(resultado?: string) {
  if (resultado === "granted") return "Autorizado";
  if (resultado === "denied") return "Rechazado";

  return resultado || "Sin resultado";
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState<EstadoDispositivo | null>(null);
  const [perfiles, setPerfiles] = useState<Record<string, Perfil>>({});
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [error, setError] = useState("");
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [ahora, setAhora] = useState(Date.now());

  const rutaBase = `smartlockshield/${DEVICE_ID}`;

  // Actualiza el reloj de la interfaz cada segundo.
  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAhora(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, []);

  // Escucha estado, perfiles y registros de Firebase.
  useEffect(() => {
    let lecturasCompletadas = 0;

    const marcarLectura = () => {
      lecturasCompletadas += 1;

      if (lecturasCompletadas >= 3) {
        setCargando(false);
      }
    };

    const cancelarEstado = onValue(
      ref(db, `${rutaBase}/state`),
      (resultado) => {
        setEstado(resultado.val());
        marcarLectura();
      },
      (errorLectura) => {
        console.error(
          "No se pudo leer el estado del dispositivo.",
          errorLectura
        );

        setError(
          "No se pudo leer el estado del dispositivo. Revisa las reglas de Firebase."
        );

        marcarLectura();
      }
    );

    const cancelarPerfiles = onValue(
      ref(db, `${rutaBase}/profiles`),
      (resultado) => {
        setPerfiles(resultado.val() ?? {});
        marcarLectura();
      },
      (errorLectura) => {
        console.error("No se pudieron leer los perfiles.", errorLectura);

        setError(
          "No se pudieron leer los perfiles. Revisa las reglas de Firebase."
        );

        marcarLectura();
      }
    );

    const consultaRegistros = query(
      ref(db, `${rutaBase}/logs`),
      limitToLast(50)
    );

    const cancelarRegistros = onValue(
      consultaRegistros,
      (resultado) => {
        const datos = resultado.val() ?? {};

        const lista: Registro[] = Object.entries(datos).map(
          ([id, valor]) => ({
            id,
            ...(valor as Omit<Registro, "id">),
          })
        );

        setRegistros(
          lista.sort((a, b) => (b.epoch ?? 0) - (a.epoch ?? 0))
        );

        marcarLectura();
      },
      (errorLectura) => {
        console.error("No se pudieron leer los registros.", errorLectura);

        setError("No se pudieron leer los registros de acceso.");

        marcarLectura();
      }
    );

    return () => {
      cancelarEstado();
      cancelarPerfiles();
      cancelarRegistros();
    };
  }, [rutaBase]);

  const perfilesActivos = useMemo(
    () =>
      Object.values(perfiles).filter(
        (perfil) => perfil.estado === "activo"
      ).length,
    [perfiles]
  );

  const accesosRechazados = useMemo(
    () =>
      registros.filter((registro) => registro.result === "denied").length,
    [registros]
  );

  const registrosFiltrados = useMemo(() => {
    if (filtro === "autorizados") {
      return registros.filter(
        (registro) => registro.result === "granted"
      );
    }

    if (filtro === "rechazados") {
      return registros.filter(
        (registro) => registro.result === "denied"
      );
    }

    return registros;
  }, [registros, filtro]);

  // Considera conectado el dispositivo solo si existe un latido
  // reciente reportado por el ESP32, en formato Unix epoch en segundos.
  const ultimoLatidoMs =
    typeof estado?.lastHeartbeatEpoch === "number" &&
    Number.isFinite(estado.lastHeartbeatEpoch)
      ? estado.lastHeartbeatEpoch * 1000
      : null;

  const conectado =
    estado?.online === true &&
    ultimoLatidoMs !== null &&
    ahora >= ultimoLatidoMs &&
    ahora - ultimoLatidoMs < TIEMPO_MAXIMO_SIN_DATOS;

  const cerraduraBloqueada = estado?.lockState === "locked";

  function cerrarSesion() {
    setMostrarConfirmacion(true);
  }

  async function confirmarCerrarSesion() {
    if (cerrandoSesion) return;

    setCerrandoSesion(true);

    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);

      setError("No se pudo cerrar la sesión. Inténtalo nuevamente.");

      setCerrandoSesion(false);
      setMostrarConfirmacion(false);
    }
  }

  if (cargando) {
    return (
      <main className="dashboard-loading">
        <div className="dashboard-spinner" />
        <p>Conectando con SmartLock Shield...</p>
      </main>
    );
  }

  return (
    <div className="dashboard-page">
      <Sidebar active="dashboard" />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">
              CENTRO DE MONITOREO
            </span>

            <h1>Dashboard</h1>

            <p>
              Estado general y actividad de tu cerradura inteligente.
            </p>
          </div>

          <div className="dashboard-header-actions">
            <div
              className={`dashboard-connection ${
                conectado ? "is-online" : "is-offline"
              }`}
            >
              <span />

              {conectado
                ? "Dispositivo en línea"
                : "Dispositivo fuera de línea"}
            </div>

            <button
              className="dashboard-logout"
              onClick={cerrarSesion}
              type="button"
            >
              <span>↪</span> Cerrar sesión
            </button>
          </div>
        </header>

        {error && (
          <div className="dashboard-error" role="alert">
            {error}
          </div>
        )}

        <section className="dashboard-lock-card">
          <div className="dashboard-lock-top">
            <span className="dashboard-eyebrow">
              ESTADO DEL MECANISMO FÍSICO
            </span>

            <span
              className={`dashboard-status ${
                cerraduraBloqueada ? "locked" : "unlocked"
              }`}
            >
              {estado?.lockState === "locked"
                ? "BLOQUEADA"
                : estado?.lockState === "unlocked"
                  ? "DESBLOQUEADA"
                  : "SIN DATOS"}
            </span>
          </div>

          <div className="dashboard-lock-content">
            <div
              className={`dashboard-lock-symbol ${
                cerraduraBloqueada ? "locked" : "unlocked"
              }`}
            >
              {estado?.lockState === "locked" ? (
                <svg
                  width="42"
                  height="42"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-label="Candado cerrado"
                  role="img"
                >
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  <circle cx="12" cy="15" r="1" />
                  <path d="M12 16v2" />
                </svg>
              ) : estado?.lockState === "unlocked" ? (
                <svg
                  width="42"
                  height="42"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-label="Candado abierto"
                  role="img"
                >
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 7.5-2" />
                  <circle cx="12" cy="15" r="1" />
                  <path d="M12 16v2" />
                </svg>
              ) : (
                <svg
                  width="42"
                  height="42"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-label="Estado de cerradura desconocido"
                  role="img"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              )}
            </div>

            <div>
              <h2>
                {estado?.lockState === "locked"
                  ? "Cerradura bloqueada"
                  : estado?.lockState === "unlocked"
                    ? "Cerradura desbloqueada"
                    : "Estado no disponible"}
              </h2>

              <p>
                {conectado
                  ? "Estado recibido desde Firebase Realtime Database."
                  : "No hay confirmación reciente del dispositivo."}
              </p>
            </div>
          </div>
        </section>

        <section className="dashboard-metrics">
          <article className="dashboard-metric">
            <span className="dashboard-metric-icon cyan">♙</span>

            <p>Perfiles activos</p>

            <strong>
              {perfilesActivos}
              <small> / 5</small>
            </strong>

            <span className="dashboard-metric-note">
              {Math.max(0, 5 - perfilesActivos)} cupos disponibles
            </span>
          </article>

          <article className="dashboard-metric">
            <span className="dashboard-metric-icon red">!</span>

            <p>Accesos rechazados</p>

            <strong>{accesosRechazados}</strong>

            <span className="dashboard-metric-note">
              Intentos de acceso rechazados
            </span>
          </article>

          <article className="dashboard-metric">
            <span className="dashboard-metric-icon green">≋</span>

            <p>Registros recibidos</p>

            <strong>{registros.length}</strong>

            <span className="dashboard-metric-note">
              Máximo 50 recientes
            </span>
          </article>
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span className="dashboard-eyebrow">HISTORIAL</span>
              <h2>Registro de accesos</h2>
            </div>

            <span className="dashboard-count">
              {registrosFiltrados.length} registros
            </span>
          </div>

          <div className="dashboard-filters">
            {[
              ["todos", "Todos"],
              ["autorizados", "Autorizados"],
              ["rechazados", "Rechazados"],
            ].map(([valor, etiqueta]) => (
              <button
                key={valor}
                className={filtro === valor ? "selected" : ""}
                onClick={() => setFiltro(valor)}
                type="button"
              >
                {etiqueta}
              </button>
            ))}
          </div>

          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Perfil</th>
                  <th>Método</th>
                  <th>Resultado</th>
                </tr>
              </thead>

              <tbody>
                {registrosFiltrados.map((registro) => {
                  const perfil = registro.perfilId
                    ? perfiles[registro.perfilId]
                    : undefined;

                  return (
                    <tr key={registro.id}>
                      <td>{fechaLegible(registro.epoch)}</td>

                      <td>
                        {perfil?.nombre ||
                          (registro.perfilId
                            ? "Perfil no encontrado"
                            : "Sin perfil asociado")}
                      </td>

                      <td>{registro.method || "No informado"}</td>

                      <td>
                        <span
                          className={`dashboard-result ${
                            registro.result === "granted"
                              ? "success"
                              : registro.result === "denied"
                                ? "danger"
                                : ""
                          }`}
                        >
                          {textoResultado(registro.result)}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {registrosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={4} className="dashboard-empty">
                      No hay registros para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="dashboard-footer">
          <span>
            Plataforma web de monitoreo y control de acceso para una
            cerradura inteligente.
          </span>

          <span>Universidad Evangélica de El Salvador · 2026</span>

          <span>
            Jhoan D. Martínez M. · Rocío G. Martínez H. · Gerardo A.
            Sibrian R. · Patricia E. Molina E.
          </span>
        </footer>

        {mostrarConfirmacion && (
          <div
            className="delete-modal-overlay"
            onMouseDown={(e) => {
              if (
                e.target === e.currentTarget &&
                !cerrandoSesion
              ) {
                setMostrarConfirmacion(false);
              }
            }}
          >
            <section
              className="delete-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-modal-title"
            >
              <div className="delete-modal-icon">
                <span style={{ fontSize: "25px" }}>↪</span>
              </div>

              <span className="delete-modal-eyebrow">
                SMARTLOCK SHIELD
              </span>

              <h2 id="delete-modal-title">¿Cerrar sesión?</h2>

              <p>
                ¿Estás seguro de que deseas salir de tu cuenta?
                Tendrás que iniciar sesión nuevamente para acceder.
              </p>

              <div className="delete-modal-actions">
                <button
                  className="delete-modal-cancel"
                  type="button"
                  disabled={cerrandoSesion}
                  onClick={() => setMostrarConfirmacion(false)}
                >
                  Cancelar
                </button>

                <button
                  className="delete-modal-confirm"
                  type="button"
                  disabled={cerrandoSesion}
                  onClick={confirmarCerrarSesion}
                >
                  {cerrandoSesion
                    ? "Cerrando sesión..."
                    : "Sí, cerrar sesión"}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
