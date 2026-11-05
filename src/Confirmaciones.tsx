import { useEffect, useState } from "react";
import {
  onValue,
  ref,
  update,
  type DataSnapshot,
} from "firebase/database";
import { auth, db, DEVICE_ID } from "./firebase";
import Sidebar from "./components/Sidebar";
import { esPropietario } from "./permisos";

type Solicitud = {
  id: string;
  perfilId?: string;
  profileId?: string;
  nombre?: string;
  profileName?: string;
  securityLevel?: string;
  nivel?: string;
  status?: string;
  estado?: string;
  timestamp?: number | string;
  createdAt?: number | string;
  device?: string;
  node?: string;
  uid?: string;
  [key: string]: unknown;
};

const rutaPendientes = `smartlockshield/${DEVICE_ID}/pendingAuth`;

function obtenerTexto(valor: unknown, alternativa: string): string {
  if (typeof valor === "string" && valor.trim()) {
    return valor;
  }

  if (typeof valor === "number") {
    return String(valor);
  }

  return alternativa;
}

function obtenerFecha(solicitud: Solicitud): string {
  const valor = solicitud.timestamp ?? solicitud.createdAt;

  if (typeof valor !== "number" && typeof valor !== "string") {
    return "Fecha no disponible";
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "Fecha no disponible";
  }

  const fecha = new Date(numero < 1e12 ? numero * 1000 : numero);

  if (Number.isNaN(fecha.getTime())) {
    return "Fecha no disponible";
  }

  return fecha.toLocaleString("es-SV");
}

function esPendiente(solicitud: Solicitud): boolean {
  const estado = String(
    solicitud.status ?? solicitud.estado ?? "pending"
  ).toLowerCase();

  return [
    "pending",
    "pendiente",
    "waiting",
    "en espera",
  ].includes(estado);
}

export default function Confirmaciones() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const solicitudesRef = ref(db, rutaPendientes);

    const cancelar = onValue(
      solicitudesRef,
      (snapshot: DataSnapshot) => {
        const datos = snapshot.val();

        if (!datos || typeof datos !== "object") {
          setSolicitudes([]);
          setCargando(false);
          setError("");
          return;
        }

        const lista: Solicitud[] = Object.entries(datos).map(
          ([id, valor]) => {
            const contenido =
              valor && typeof valor === "object"
                ? (valor as Record<string, unknown>)
                : {};

            return {
              ...contenido,
              id,
            } as Solicitud;
          }
        );

        setSolicitudes(
          lista
            .filter(esPendiente)
            .sort((a, b) => {
              const fechaA = Number(a.timestamp ?? a.createdAt ?? 0);
              const fechaB = Number(b.timestamp ?? b.createdAt ?? 0);
              return fechaB - fechaA;
            })
        );

        setCargando(false);
        setError("");
      },
      (errorFirebase) => {
        console.error("Error leyendo solicitudes:", errorFirebase);
        setError(
          "No se pudieron cargar las solicitudes. Revisa la conexión y los permisos de Firebase."
        );
        setCargando(false);
      }
    );

    return () => cancelar();
  }, []);

  async function resolverSolicitud(
    solicitud: Solicitud,
    decision: "approved" | "rejected"
  ) {
    if (procesando) return;

    if (!esPropietario()) {
      setError("No tienes autorización para realizar esta acción.");
      return;
    }

    setProcesando(solicitud.id);
    setMensaje("");
    setError("");

    try {
      const usuario = auth.currentUser;

      if (!usuario) {
        setError("Tu sesión no está activa. Inicia sesión nuevamente.");
        return;
      }

      await update(ref(db, `${rutaPendientes}/${solicitud.id}`), {
        status: decision,
        resolvedAt: Date.now(),
        resolvedBy: usuario.uid,
      });

      setMensaje(
        decision === "approved"
          ? "La solicitud se marcó como aprobada."
          : "La solicitud se marcó como rechazada."
      );
    } catch (errorFirebase) {
      console.error("Error resolviendo solicitud:", errorFirebase);
      setError(
        "No se pudo actualizar la solicitud. Verifica los permisos de Firebase."
      );
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className="confirmaciones-page dashboard-page">
      <Sidebar active="confirmaciones" />

      <main className="confirmaciones-main dashboard-main">
        <div className="confirmaciones-eyebrow">
          <span>COCKPIT DE AUTORIZACIÓN</span>

          <span className="confirmaciones-queue-count">
            {solicitudes.length} EN COLA (RTDB)
          </span>
        </div>

        <h1>Confirmaciones pendientes</h1>

        <p className="confirmaciones-subtitle">
          Solicitudes de acceso remoto en espera de autorización.
        </p>

        <div className="confirmaciones-telemetry">
          <span>
            <span className="confirmaciones-online-dot" />
            Escucha de solicitudes en tiempo real
          </span>

          <span>Ventana crítica: 60 s</span>
        </div>

        {mensaje && (
          <div className="confirmaciones-message success" role="status">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="confirmaciones-message error" role="alert">
            {error}
          </div>
        )}

        {!esPropietario() && (
          <div className="confirmaciones-message">
            Modo de consulta: solamente el propietario autorizado puede
            aprobar o rechazar solicitudes.
          </div>
        )}

        <section className="confirmaciones-section">
          <div className="confirmaciones-section-heading">
            <div>
              <span className="confirmaciones-section-kicker">
                AUTORIZACIÓN DE ACCESO
              </span>

              <h2>Cola de solicitudes</h2>
            </div>

            <span className="confirmaciones-count">
              {solicitudes.length}
            </span>
          </div>

          {cargando ? (
            <div className="confirmaciones-empty">
              <div className="confirmaciones-loader" />
              <h3>Cargando solicitudes...</h3>
              <p>Conectando con Firebase Realtime Database.</p>
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="confirmaciones-empty">
              <div className="confirmaciones-empty-icon">✓</div>

              <h3>Sin solicitudes pendientes</h3>

              <p>
                Cuando llegue una solicitud de acceso, aparecerá aquí.
              </p>
            </div>
          ) : (
            <div className="confirmaciones-list">
              {solicitudes.map((solicitud) => {
                const nivel = obtenerTexto(
                  solicitud.securityLevel ?? solicitud.nivel,
                  "Sin nivel"
                ).toUpperCase();

                const esC4 = nivel === "C4";

                return (
                  <article
                    className={`confirmacion-card ${
                      esC4 ? "confirmacion-card-critical" : ""
                    }`}
                    key={solicitud.id}
                  >
                    <div className="confirmacion-card-top">
                      <div className="confirmacion-level">
                        <span className="confirmacion-level-icon">
                          {esC4 ? "⚠" : "◈"}
                        </span>

                        <div>
                          <span className="confirmacion-small-label">
                            NIVEL DE SEGURIDAD
                          </span>

                          <strong>{nivel}</strong>
                        </div>
                      </div>

                      <span
                        className={`confirmacion-status ${
                          esC4 ? "critical" : ""
                        }`}
                      >
                        {esC4
                          ? "CONFIRMACIÓN REQUERIDA"
                          : "PENDIENTE"}
                      </span>
                    </div>

                    <div className="confirmacion-person">
                      <h3>
                        {obtenerTexto(
                          solicitud.profileName ?? solicitud.nombre,
                          "Perfil sin nombre"
                        )}
                      </h3>

                      <p>Solicitud #{solicitud.id}</p>
                    </div>

                    <div className="confirmacion-details">
                      <div>
                        <span>PERFIL</span>

                        <strong>
                          {obtenerTexto(
                            solicitud.profileId ?? solicitud.perfilId,
                            "No especificado"
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>NODO / DISPOSITIVO</span>

                        <strong>
                          {obtenerTexto(
                            solicitud.node ?? solicitud.device,
                            DEVICE_ID
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>UID DE TARJETA</span>

                        <strong>
                          {obtenerTexto(solicitud.uid, "No disponible")}
                        </strong>
                      </div>

                      <div>
                        <span>FECHA DE SOLICITUD</span>

                        <strong>{obtenerFecha(solicitud)}</strong>
                      </div>
                    </div>

                    <div className="confirmacion-security-note">
                      <span>◈</span>
                      Verifica los datos de la solicitud antes de decidir.
                    </div>

                    {esC4 && (
                      <p className="confirmacion-c5-warning">
                        Nivel C4: esta solicitud requiere autorización web
                        antes de permitir el acceso.
                      </p>
                    )}

                    {esPropietario() && (
                      <div className="confirmacion-actions">
                        <button
                          type="button"
                          className="confirmacion-reject"
                          disabled={procesando !== null}
                          onClick={() =>
                            resolverSolicitud(solicitud, "rejected")
                          }
                        >
                          {procesando === solicitud.id
                            ? "Procesando..."
                            : "RECHAZAR"}
                        </button>

                        <button
                          type="button"
                          className="confirmacion-approve"
                          disabled={procesando !== null}
                          onClick={() =>
                            resolverSolicitud(solicitud, "approved")
                          }
                        >
                          {procesando === solicitud.id
                            ? "Procesando..."
                            : "APROBAR ACCESO"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="confirmaciones-operational">
          <div className="confirmaciones-operational-icon">⌁</div>

          <div>
            <span>ESTADO DE CONEXIÓN</span>
            <h3>FIREBASE</h3>

            <p>
              La pantalla escucha los cambios de las solicitudes pendientes.
            </p>
          </div>

          <span className="confirmaciones-operational-status">
            EN ESCUCHA
          </span>
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
      </main>
    </div>
  );
}