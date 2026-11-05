import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onValue, ref, set, update, remove } from "firebase/database";
import { db, DEVICE_ID } from "./firebase";
import Sidebar from "./components/Sidebar";
import { esPropietario } from "./permisos";

type NivelSeguridad = "C1" | "C4";

type Perfil = {
  id: string;
  nombre?: string;
  securityLevel?: string;
  nfcMethod?: "uid" | "plaintext" | "aes";
  nfcData?: string;
  cardUid?: string;
  estado?: "sin_tarjeta" | "pendiente_escritura" | "activo";
};

const rutaPerfiles = `smartlockshield/${DEVICE_ID}/profiles`;

export default function Perfiles() {
  const navigate = useNavigate();
  const propietario = esPropietario();

  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [nombre, setNombre] = useState("");
  const [nivel, setNivel] = useState<NivelSeguridad>("C1");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [perfilPorEliminar, setPerfilPorEliminar] =
    useState<Perfil | null>(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    const cancelar = onValue(
      ref(db, rutaPerfiles),
      (snapshot) => {
        const datos = snapshot.val() ?? {};

        const lista: Perfil[] = Object.entries(datos).map(
          ([id, valor]) => ({
            id,
            ...(valor as Omit<Perfil, "id">),
          })
        );

        setPerfiles(lista);
        setCargando(false);
      },
      (errorLectura) => {
        console.error("Error leyendo perfiles:", errorLectura);
        setError(
          "No se pudieron cargar los perfiles. Revisa la conexión y los permisos de Firebase."
        );
        setCargando(false);
      }
    );

    return () => cancelar();
  }, []);

  async function crearPerfil(
    evento: React.FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (!esPropietario()) {
      setError("No tienes autorización para crear perfiles.");
      return;
    }

    setError("");
    setMensaje("");

    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setError("Escribe el nombre del perfil.");
      return;
    }

    if (perfiles.length >= 5) {
      setError("Ya alcanzaste el máximo de 5 perfiles.");
      return;
    }

    if (
      perfiles.some(
        (perfil) =>
          perfil.nombre?.trim().toLowerCase() ===
          nombreLimpio.toLowerCase()
      )
    ) {
      setError("Ya existe un perfil con ese nombre.");
      return;
    }

    setGuardando(true);

    try {
      const id = `perfil_${Date.now()}`;

      await set(ref(db, `${rutaPerfiles}/${id}`), {
        nombre: nombreLimpio,
        securityLevel: nivel,
        nfcMethod: "uid",
        nfcData: "",
        cardUid: "",
        estado: "sin_tarjeta",
      });

      setNombre("");
      setNivel("C1");
      setMensaje("Perfil creado correctamente.");
    } catch (errorCreacion) {
      console.error("Error creando perfil:", errorCreacion);
      setError(
        "No se pudo crear el perfil. Revisa los permisos de Firebase."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarNivel(
    id: string,
    nuevoNivel: NivelSeguridad
  ) {
    if (!esPropietario()) {
      setError("No tienes autorización para modificar perfiles.");
      return;
    }

    setError("");
    setMensaje("");

    try {
      await update(ref(db, `${rutaPerfiles}/${id}`), {
        securityLevel: nuevoNivel,
      });

      setMensaje("Nivel de seguridad actualizado.");
    } catch (errorActualizacion) {
      console.error("Error actualizando nivel:", errorActualizacion);
      setError("No se pudo actualizar el nivel de seguridad.");
    }
  }

  async function eliminarPerfil() {
    if (!perfilPorEliminar || eliminando) return;

    if (!esPropietario()) {
      setError("No tienes autorización para eliminar perfiles.");
      setPerfilPorEliminar(null);
      return;
    }

    setError("");
    setMensaje("");
    setEliminando(true);

    try {
      const nombreEliminado =
        perfilPorEliminar.nombre || perfilPorEliminar.id;

      await remove(
        ref(db, `${rutaPerfiles}/${perfilPorEliminar.id}`)
      );

      setMensaje(`El perfil "${nombreEliminado}" fue eliminado.`);
      setPerfilPorEliminar(null);
    } catch (errorEliminacion) {
      console.error("Error eliminando perfil:", errorEliminacion);
      setError(
        "No se pudo eliminar el perfil. Revisa los permisos de Firebase."
      );
    } finally {
      setEliminando(false);
    }
  }

  function textoEstado(estado?: string) {
    if (estado === "activo") return "Tarjeta activa";

    if (estado === "pendiente_escritura") {
      return "Pendiente de programación";
    }

    return "Sin tarjeta configurada";
  }

  if (cargando) {
    return (
      <main className="dashboard-loading">
        <div className="dashboard-spinner" />
        <p>Cargando perfiles de acceso...</p>
      </main>
    );
  }

  return (
    <div className="dashboard-page">
      <Sidebar active="perfiles" />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">
              ADMINISTRACIÓN DE ACCESOS
            </span>

            <h1>Perfiles de acceso</h1>

            <p>
              {propietario
                ? "Administra quién puede acceder a la cerradura y su nivel de seguridad."
                : "Consulta los perfiles autorizados y sus niveles de seguridad."}
            </p>
          </div>

          <div className="dashboard-connection is-online">
            <span />
            {perfiles.length} de 5 perfiles
          </div>
        </header>

        {error && (
          <div className="dashboard-error" role="alert">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="profiles-success" role="status">
            {mensaje}
          </div>
        )}

        {propietario && (
          <section className="dashboard-panel profiles-form-panel">
            <div className="dashboard-panel-heading">
              <div>
                <span className="dashboard-eyebrow">NUEVO ACCESO</span>
                <h2>Crear perfil</h2>
              </div>

              <span className="dashboard-count">
                {Math.max(0, 5 - perfiles.length)} espacios disponibles
              </span>
            </div>

            <form className="profiles-form" onSubmit={crearPerfil}>
              <label>
                Nombre del perfil

                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Rocío"
                  maxLength={60}
                  required
                  disabled={guardando || perfiles.length >= 5}
                />
              </label>

              <label>
                Nivel de seguridad

                <select
                  value={nivel}
                  onChange={(e) =>
                    setNivel(e.target.value as NivelSeguridad)
                  }
                  disabled={guardando || perfiles.length >= 5}
                >
                  <option value="C1">Solo tarjeta NFC</option>
                  <option value="C4">
                    Tarjeta y confirmación web
                  </option>
                </select>
              </label>

              <button
                className="profiles-create-button"
                type="submit"
                disabled={guardando || perfiles.length >= 5}
              >
                {guardando ? "Guardando..." : "＋ Crear perfil"}
              </button>

              {perfiles.length >= 5 && (
                <p className="profiles-limit">
                  Alcanzaste el máximo permitido. Para crear otro perfil,
                  primero debe eliminarse uno.
                </p>
              )}
            </form>
          </section>
        )}

        {!propietario && (
          <div className="confirmaciones-message">
            Modo de consulta: puedes visualizar los perfiles, pero no
            modificarlos.
          </div>
        )}

        <section className="profiles-list-section">
          <div className="dashboard-panel-heading profiles-list-heading">
            <div>
              <span className="dashboard-eyebrow">
                USUARIOS AUTORIZADOS
              </span>

              <h2>Perfiles registrados</h2>
            </div>

            <span className="dashboard-count">
              {perfiles.length} perfiles
            </span>
          </div>

          {perfiles.length === 0 ? (
            <div className="profiles-empty">
              <div>♙</div>

              <h3>No hay perfiles registrados</h3>

              <p>
                {propietario
                  ? "Crea el primer perfil utilizando el formulario anterior."
                  : "Todavía no hay perfiles registrados."}
              </p>
            </div>
          ) : (
            <div className="profiles-grid">
              {perfiles.map((perfil) => {
                const nivelActual =
                  perfil.securityLevel || "SIN_NIVEL";

                const nivelNoSoportado =
                  !["C1", "C4"].includes(nivelActual);

                return (
                  <article className="profile-card" key={perfil.id}>
                    <div className="profile-card-top">
                      <div className="profile-avatar">
                        {(perfil.nombre || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="profile-card-actions">
                        <span
                          className={`profile-state ${
                            perfil.estado === "activo"
                              ? "profile-state-active"
                              : perfil.estado === "pendiente_escritura"
                                ? "profile-state-pending"
                                : ""
                          }`}
                        >
                          {textoEstado(perfil.estado)}
                        </span>

                        {propietario && (
                          <button
                            type="button"
                            className="profile-delete-button"
                            title={`Eliminar perfil ${perfil.nombre || ""}`}
                            aria-label={`Eliminar perfil ${perfil.nombre || ""}`}
                            onClick={() =>
                              setPerfilPorEliminar(perfil)
                            }
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="m19 6-1 14H6L5 6" />
                              <path d="M10 11v5M14 11v5" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <h3>{perfil.nombre || "Perfil sin nombre"}</h3>

                    <p className="profile-id">ID: {perfil.id}</p>

                    <label className="profile-level-label">
                      Nivel de seguridad

                      {propietario ? (
                        <select
                          value={nivelActual}
                          onChange={(e) =>
                            cambiarNivel(
                              perfil.id,
                              e.target.value as NivelSeguridad
                            )
                          }
                        >
                          {nivelNoSoportado && (
                            <option value={nivelActual} disabled>
                              {nivelActual === "SIN_NIVEL"
                                ? "Sin nivel asignado"
                                : `${nivelActual} (no soportado)`}
                            </option>
                          )}

                          <option value="C1">Solo tarjeta NFC</option>
                          <option value="C4">
                            Tarjeta y confirmación web
                          </option>
                        </select>
                      ) : (
                        <div className="profile-card-details">
                          <strong>
                            {nivelActual === "C1"
                              ? "C1 - Solo tarjeta NFC"
                              : nivelActual === "C4"
                                ? "C4 - Tarjeta y confirmación web"
                                : nivelActual}
                          </strong>
                        </div>
                      )}
                    </label>

                    {nivelNoSoportado && (
                      <p className="profiles-limit">
                        Este perfil conserva un nivel anterior que el
                        firmware actual no admite. No se ha modificado.
                        {propietario &&
                          " Puedes seleccionar otro nivel para actualizarlo."}
                      </p>
                    )}

                    <div className="profile-card-details">
                      <span>Método NFC</span>

                      <strong>
                        {(perfil.nfcMethod || "uid").toUpperCase()}
                      </strong>
                    </div>

                    {propietario && (
                      <button
                        className="profile-nfc-button"
                        type="button"
                        onClick={() =>
                          navigate(`/perfiles/${perfil.id}/nfc`)
                        }
                      >
                        Configurar tarjeta NFC →
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {propietario && perfilPorEliminar && (
        <div className="delete-modal-overlay">
          <section
            className="delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-description"
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
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="m19 6-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
            </div>

            <span className="delete-modal-eyebrow">
              CONFIRMACIÓN DE SEGURIDAD
            </span>

            <h2 id="delete-modal-title">¿Eliminar perfil?</h2>

            <p id="delete-modal-description">
              ¿Estás seguro de que deseas eliminar el perfil{" "}
              <strong>
                {perfilPorEliminar.nombre || perfilPorEliminar.id}
              </strong>
              ? Esta acción no se puede deshacer.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-modal-cancel"
                onClick={() => setPerfilPorEliminar(null)}
                disabled={eliminando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="delete-modal-confirm"
                onClick={eliminarPerfil}
                disabled={eliminando}
              >
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}