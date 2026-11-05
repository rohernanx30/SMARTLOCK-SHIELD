
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {get,onValue,ref,set,update,} from "firebase/database";
import { db, DEVICE_ID } from "./firebase";
import Sidebar from "./components/Sidebar";

interface Perfil {
  nombre?: string;
  securityLevel?: string;
  nfcMethod?: "uid" | "plaintext" | "aes";
  nfcData?: string;
  cardUid?: string;
  estado?: "sin_tarjeta" | "pendiente_escritura" | "activo";
}

interface ResultadoNFC {
  success?: boolean;
  cardUid?: string;
  mensaje?: string;
  epoch?: number;
}

type EstadoSolicitud = "inicial" | "esperando" | "exito" | "error";

export default function ConfiguracionNFC() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [estadoSolicitud, setEstadoSolicitud] =
    useState<EstadoSolicitud>("inicial");
  const [mensaje, setMensaje] = useState("");
  const [uidRegistrado, setUidRegistrado] = useState("");
  const [error, setError] = useState("");

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelarResultadoRef = useRef<(() => void) | null>(null);
  const solicitudActivaRef = useRef(false);
  const solicitudIdRef = useRef("");

  const rutaBase = `smartlockshield/${DEVICE_ID}`;
  const rutaPerfiles = `${rutaBase}/profiles`;

  useEffect(() => {
    if (!id) {
      setError("No se recibió el identificador del perfil.");
      setCargando(false);
      return;
    }

    const perfilRef = ref(db, `${rutaPerfiles}/${id}`);

    const cancelar = onValue(
      perfilRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setPerfil(null);
          setError("El perfil solicitado no existe.");
        } else {
          setPerfil(snapshot.val() as Perfil);
          setError("");
        }

        setCargando(false);
      },
      (errorFirebase) => {
        console.error("Error leyendo el perfil:", errorFirebase);
        setError("No se pudo consultar el perfil en Firebase.");
        setCargando(false);
      }
    );

    return () => {
      cancelar();
      solicitudActivaRef.current = false;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      cancelarResultadoRef.current?.();
    };
  }, [id, rutaPerfiles]);

  function limpiarSolicitud() {
    solicitudActivaRef.current = false;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    cancelarResultadoRef.current?.();
    cancelarResultadoRef.current = null;
  }

  async function registrarTarjeta() {
    if (!id || !perfil || registrando) return;

    limpiarSolicitud();

    setError("");
    setMensaje("");
    setUidRegistrado("");
    setRegistrando(true);
    setEstadoSolicitud("esperando");

    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    solicitudIdRef.current = requestId;
    solicitudActivaRef.current = true;

    const resultadoRef = ref(
      db,
      `${rutaBase}/nfcWriteResult/${requestId}`
    );

    let finalizado = false;

    const finalizar = () => {
      if (finalizado) return;
      finalizado = true;
      limpiarSolicitud();
      setRegistrando(false);
    };

    try {
      // Escuchar antes de enviar para no perder una respuesta rápida.
      const cancelar = onValue(
        resultadoRef,
        async (snapshot) => {
          if (
            !solicitudActivaRef.current ||
            solicitudIdRef.current !== requestId ||
            finalizado ||
            !snapshot.exists()
          ) {
            return;
          }

          const resultado = snapshot.val() as ResultadoNFC;

          if (resultado.success !== true) {
            finalizar();
            setEstadoSolicitud("error");
            setMensaje(
              resultado.mensaje || "El ESP32 no pudo registrar la tarjeta."
            );
            return;
          }

          const cardUid = String(resultado.cardUid || "").trim();

          if (!cardUid) {
            finalizar();
            setEstadoSolicitud("error");
            setMensaje(
              "El ESP32 confirmó la lectura, pero no devolvió un UID válido."
            );
            return;
          }

          try {
            // Evitar asociar la misma tarjeta a dos perfiles.
            const perfilesSnapshot = await get(ref(db, rutaPerfiles));

            if (
              !solicitudActivaRef.current ||
              solicitudIdRef.current !== requestId ||
              finalizado
            ) {
              return;
            }

            const perfiles = perfilesSnapshot.val() as
              | Record<string, Perfil>
              | null;

            const uidDuplicado = Object.entries(perfiles || {}).some(
              ([perfilId, otroPerfil]) =>
                perfilId !== id &&
                String(otroPerfil.cardUid || "").toUpperCase() ===
                  cardUid.toUpperCase()
            );

            if (uidDuplicado) {
              finalizar();
              setEstadoSolicitud("error");
              setMensaje(
                "Esta tarjeta ya está asociada a otro perfil."
              );
              return;
            }

            await update(ref(db, `${rutaPerfiles}/${id}`), {
              nfcMethod: "uid",
              nfcData: "",
              cardUid,
              estado: "activo",
            });

            if (
              !solicitudActivaRef.current ||
              solicitudIdRef.current !== requestId
            ) {
              return;
            }

            finalizar();
            setUidRegistrado(cardUid);
            setEstadoSolicitud("exito");
            setMensaje("Tarjeta NFC registrada correctamente.");
          } catch (errorFirebase) {
            console.error(
              "Error guardando el UID del perfil:",
              errorFirebase
            );

            finalizar();
            setEstadoSolicitud("error");
            setMensaje(
              "La tarjeta se leyó, pero no se pudo guardar el perfil en Firebase."
            );
          }
        },
        (errorFirebase) => {
          console.error("Error escuchando resultado NFC:", errorFirebase);

          finalizar();
          setEstadoSolicitud("error");
          setMensaje("No se pudo leer el resultado NFC desde Firebase.");
        }
      );

      cancelarResultadoRef.current = cancelar;

      // Solicitud compatible con el esquema del proyecto.
      await set(ref(db, `${rutaBase}/nfcWriteRequest`), {
        perfilId: id,
        method: "uid",
        payload: "",
        requestId,
        timestamp: Date.now(),
      });

      if (
        !solicitudActivaRef.current ||
        solicitudIdRef.current !== requestId
      ) {
        return;
      }

      timeoutRef.current = setTimeout(() => {
        if (
          !solicitudActivaRef.current ||
          solicitudIdRef.current !== requestId
        ) {
          return;
        }

        finalizar();
        setEstadoSolicitud("error");
        setMensaje(
          "No se recibió respuesta en 20 segundos. Acerca la tarjeta al lector e inténtalo nuevamente."
        );
      }, 20000);
    } catch (errorFirebase) {
      console.error("Error enviando solicitud NFC:", errorFirebase);

      finalizar();
      setEstadoSolicitud("error");
      setMensaje(
        "No se pudo enviar la solicitud a Firebase. Revisa la conexión y los permisos."
      );
    }
  }

  function volverAperfiles() {
    limpiarSolicitud();
    setRegistrando(false);
    navigate("/perfiles");
  }

  if (cargando) {
    return (
      <main className="dashboard-loading">
        <div className="dashboard-spinner" />
        <p>Cargando configuración NFC...</p>
      </main>
    );
  }

  return (
    <div className="dashboard-page">
      <Sidebar active="perfiles" />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">SMARTLOCK SHIELD</p>
            <h1>Configuración NFC</h1>
            <p className="dashboard-subtitle">
              Registro de tarjetas mediante identificador UID.
            </p>
          </div>

          <button
            type="button"
            className="nfc-button-secondary"
            onClick={volverAperfiles}
          >
            Volver a perfiles
          </button>
        </header>

        {error && (
          <div className="nfc-message nfc-message-error" role="alert">
            {error}
          </div>
        )}

        {!perfil ? (
          <section className="nfc-panel">
            <h2>Perfil no disponible</h2>
            <p>Verifica que el perfil exista y que tengas acceso a Firebase.</p>
          </section>
        ) : (
          <section className="nfc-panel">
            <div className="nfc-panel-heading">
              <div>
                <p className="dashboard-eyebrow">PERFIL SELECCIONADO</p>
                <h2>{perfil.nombre || id}</h2>
              </div>
              <span
                className={`nfc-status ${
                  perfil.estado === "activo" ? "nfc-status-active" : ""
                }`}
              >
                {perfil.estado === "activo"
                  ? "Tarjeta activa"
                  : perfil.estado === "pendiente_escritura"
                    ? "Registro pendiente"
                    : "Sin tarjeta"}
              </span>
            </div>

            <div className="nfc-divider" />

            <div className="nfc-info-grid">
              <div className="nfc-info-item">
                <span>Método</span>
                <strong>UID</strong>
              </div>

              <div className="nfc-info-item">
                <span>Identificador registrado</span>
                <strong className="nfc-uid">
                  {perfil.cardUid || "Todavía no registrado"}
                </strong>
              </div>
            </div>

            <div className="nfc-instructions">
              <div className="nfc-icon">⌁</div>
              <h3>
                {registrando
                  ? "Acerca la tarjeta al lector"
                  : "Registrar tarjeta NFC"}
              </h3>
              <p>
                {registrando
                  ? "Mantén la tarjeta cerca del lector y espera la confirmación del dispositivo."
                  : "Pulsa el botón para iniciar el registro de la tarjeta de este perfil."}
              </p>
            </div>

            {estadoSolicitud === "esperando" && (
              <div
                className="nfc-message nfc-message-pending"
                role="status"
                aria-live="polite"
              >
                <span className="nfc-loading-dot" />
                Esperando respuesta del ESP32...
              </div>
            )}

            {mensaje && (
              <div
                className={`nfc-message ${
                  estadoSolicitud === "exito"
                    ? "nfc-message-success"
                    : estadoSolicitud === "error"
                      ? "nfc-message-error"
                      : ""
                }`}
                role={estadoSolicitud === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                {mensaje}

                {estadoSolicitud === "exito" && uidRegistrado && (
                  <p className="nfc-result-uid">
                    UID registrado: <strong>{uidRegistrado}</strong>
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              className="nfc-button-primary"
              onClick={registrarTarjeta}
              disabled={registrando}
            >
              {registrando
                ? "Esperando tarjeta..."
                : perfil.estado === "activo"
                  ? "Registrar otra tarjeta"
                  : "Registrar tarjeta NFC"}
            </button>

            <p className="nfc-footnote">
              Este proceso registra el UID y lo vincula al perfil. No escribe
              información en la tarjeta física.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
