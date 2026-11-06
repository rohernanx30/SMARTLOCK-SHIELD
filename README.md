# SmartLock Shield

Plataforma web de monitoreo y administración de acceso para una
cerradura inteligente basada en tecnologías IoT.

## Descripción

SmartLock Shield permite gestionar perfiles de acceso, consultar el
estado de las solicitudes de autorización y administrar la configuración
de tarjetas NFC desde una interfaz web.

El sistema utiliza autenticación con Google y verificación en dos pasos
(2FA) mediante códigos temporales TOTP.

## Tecnologías utilizadas

-   **React** y **TypeScript** para la interfaz web.
-   **Vite** como herramienta de desarrollo.
-   **Firebase Authentication** para el inicio de sesión con Google.
-   **Firebase Realtime Database** para almacenar y consultar
    información.
-   **OTPAuth** para generar y validar códigos TOTP de 2FA.
-   **qrcode.react** para mostrar el código QR de configuración de 2FA.
-   **React Router** para la navegación entre pantallas.

## Funcionalidades principales

### Inicio de sesión y verificación 2FA

-   Inicio de sesión mediante una cuenta de Google.
-   Configuración de un segundo factor de autenticación.
-   Registro de la cuenta en una aplicación compatible con TOTP, como
    Google Authenticator.
-   Posibilidad de configurar el autenticador escaneando el código QR o
    introduciendo manualmente la clave de configuración.
-   Verificación mediante un código temporal de seis dígitos.

### Dashboard

Presenta la pantalla principal de la plataforma y permite acceder a las
secciones disponibles según el tipo de usuario.

### Perfiles de acceso

El sistema permite registrar hasta cinco perfiles. Cada perfil puede
tener uno de los siguientes niveles:

  Nivel   Descripción
  ------- ---------------------------------
  C1      Acceso mediante tarjeta NFC.
  C4      Tarjeta NFC y confirmación web.

Los perfiles también muestran información relacionada con el estado de
la tarjeta y el método NFC registrado.

### Configuración NFC

La sección de configuración NFC permite acceder a la pantalla destinada
a configurar la tarjeta asociada a un perfil. Esta función está
disponible desde la interfaz para el propietario autorizado.

### Confirmaciones

La pantalla de confirmaciones recibe y muestra las solicitudes
pendientes almacenadas en Firebase Realtime Database.

El propietario autorizado puede aprobar o rechazar una solicitud. La
decisión se registra en Firebase mediante el estado correspondiente
(`approved` o `rejected`), junto con la fecha y el identificador del
usuario que la resolvió.

## Roles de usuario en la interfaz

La interfaz distingue entre el propietario autorizado y los demás
usuarios autenticados.

  Función                           Propietario   Otros usuarios
  -------------------------------- ------------- ----------------
  Acceder al Dashboard                  Sí              Sí
  Consultar perfiles                    Sí              Sí
  Crear perfiles                        Sí              No
  Cambiar el nivel C1/C4                Sí              No
  Eliminar perfiles                     Sí              No
  Configurar tarjetas NFC               Sí              No
  Consultar Confirmaciones              Sí              No
  Aprobar o rechazar solicitudes        Sí              No

La identificación del propietario en la interfaz se realiza mediante su
UID de Firebase Authentication, definido en el archivo `permisos.ts`.

**Nota de seguridad:** las restricciones descritas en esta tabla se
aplican en la interfaz web y en la navegación del cliente. No sustituyen
las reglas de seguridad del servidor. Las reglas actuales de Firebase
permiten determinadas escrituras a usuarios autenticados; por tanto,
estas comprobaciones del cliente no deben considerarse una protección
completa frente a escrituras realizadas fuera de la aplicación.

## Estructura general del proyecto

Los nombres pueden variar según la organización final del repositorio.
Entre los archivos principales se encuentran:

``` text
src/
├── components/
│   └── Sidebar.tsx
├── App.tsx
├── Login.tsx
├── Setup2FA.tsx
├── RutaProtegida.tsx
├── Dashboard.tsx
├── Perfiles.tsx
├── ConfiguracionNFC.tsx
├── Confirmaciones.tsx
├── firebase.ts
└── permisos.ts
```

-   `App.tsx`: define las rutas de navegación.
-   `Login.tsx`: gestiona el inicio de sesión.
-   `Setup2FA.tsx`: configura y verifica el segundo factor.
-   `RutaProtegida.tsx`: protege las rutas que requieren una sesión
    autenticada.
-   `Dashboard.tsx`: muestra la pantalla principal.
-   `Perfiles.tsx`: consulta y administra los perfiles de acceso según
    el usuario.
-   `ConfiguracionNFC.tsx`: contiene la pantalla de configuración NFC.
-   `Confirmaciones.tsx`: muestra y permite resolver solicitudes
    pendientes al propietario.
-   `firebase.ts`: contiene la configuración y las referencias de
    Firebase utilizadas por la aplicación.
-   `permisos.ts`: identifica al propietario autorizado desde la sesión
    de Firebase Authentication.
-   `components/Sidebar.tsx`: muestra la navegación disponible para cada
    usuario.

## Requisitos previos

-   Node.js y npm instalados.
-   Acceso al proyecto de Firebase utilizado por la aplicación.
-   Variables o configuración de Firebase correspondientes al proyecto.
-   Una cuenta de Google para iniciar sesión.
-   Una aplicación autenticadora compatible con TOTP para completar la
    configuración 2FA.

## Instalación y ejecución

1.  Clonar o descargar el repositorio.

2.  Abrir una terminal en la carpeta del proyecto.

3.  Instalar las dependencias:

    ``` bash
    npm install
    ```

4.  Revisar que la configuración de Firebase corresponda al proyecto
    utilizado.

5.  Iniciar el servidor de desarrollo:

    ``` bash
    npm run dev
    ```

6.  Abrir en el navegador la dirección local que indique Vite en la
    terminal.

Para generar una compilación de producción:

``` bash
npm run build
```

Para ejecutar la vista previa de la compilación:

``` bash
npm run preview
```

## Flujo general de uso

1.  El usuario inicia sesión con Google.
2.  Si corresponde, configura y verifica el segundo factor de
    autenticación.
3.  Accede al Dashboard.
4.  Consulta los perfiles disponibles según sus permisos.
5.  El propietario puede crear, modificar o eliminar perfiles y
    configurar tarjetas NFC.
6.  Cuando se genera una solicitud de acceso que requiere confirmación
    web, esta aparece en la pantalla Confirmaciones.
7.  El propietario revisa la información y aprueba o rechaza la
    solicitud.

## Pruebas y estado del proyecto

Las pruebas realizadas en el entorno de desarrollo incluyen:

-   Inicio de sesión con Google.
-   Configuración y verificación 2FA.
-   Carga del Dashboard.
-   Consulta de perfiles existentes.
-   Navegación a la pantalla de configuración NFC.
-   Carga de la pantalla Confirmaciones.
-   Visualización de los niveles C1 y C4.
-   Restricción de opciones de la interfaz según el usuario.

## Equipo de desarrollo
- Jhoan Daniel Martinez
- Rocio Guadalupe Martinez
- Patricia Elizabeth Molina
- Gerardo Antonio Sibrian

Proyecto académico: **SmartLock Shield**.

Universidad Evangélica de El Salvador.

Año: 2026 | Ciberseguridad.