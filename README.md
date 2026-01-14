# Gestión de Producción - Pastelería Arruti

Sistema integral para la planificación, seguimiento y control de la producción artesanal de la pastelería.

## 📋 Descripción del Proyecto
Este sistema permite digitalizar el flujo de trabajo de producción utilizando **Google Sheets** como motor de base de datos.

El desarrollo se realiza de forma **incremental y modular**, siguiendo un estricto protocolo de aprobación guiado por el archivo [agent.md](agent.md).

---

## 🛠️ Stack Técnico y Arquitectura

### Tecnologías
*   **Frontend:** Angular & TypeScript.
*   **Base de Datos:** Google Spreadsheets.
*   **Gestión de IA:** Protocolo [agent.md](agent.md).

### Arquitectura de Capas
El proyecto se organiza en capas independientes para facilitar cambios y mantenimiento:
*   **UI (Componentes):** Solo representación y captura de eventos.
*   **Servicios:** Lógica de negocio y orquestación.
*   **Modelos/Entidades:** Definición estricta de datos.
*   **Adaptadores/Repositorios:** Comunicación con Google Sheets.

---

## ⚙️ Configuración e Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/usuario/arruti-app.git
    cd arruti-app
    ```

2.  **Configurar el Backend (Google Apps Script):**
    *   Crea un Google Sheet y añade las hojas `Pedidos` y `Produccion_Diaria`.
    *   Ve a **Extensiones > Apps Script**.
    *   Copia el contenido de [backend/code.gs](backend/code.gs) en el editor de Google scripts.
    *   Haz clic en **Implementar > Nueva implementación**.
    *   Tipo: **Aplicación web**.
    *   Acceso: **Cualquier persona**.
    *   Copia la URL generada (`https://script.google.com/.../exec`).

3.  **Configurar Variables en Angular:**
    *   Abre [src/environments/environment.ts](src/environments/environment.ts).
    *   Pega la URL del paso anterior en la propiedad `apiUrl`.

4.  **Instalar dependencias y ejecutar:**
    ```bash
    npm install
    npm start
    ```

5.  **Verificar el backend:**
    Puedes comprobar si tu Google Script está bien desplegado y accesible con:
    ```bash
    npm run test:backend
    ```

---

## 🚀 Despliegue (GitHub Pages)

Para publicar la aplicación en GitHub Pages:

1.  Compila la versión de producción:
    ```bash
    npm run build -- --base-href "https://<tu-usuario>.github.io/arruti-app/"
    ```
2.  Sube a la rama `gh-pages`:
    ```bash
    npx angular-cli-ghpages --dir=dist/arruti-app/browser
    ```

---

## 🤖 Despliegue Automático del Backend (Opcional)

He incluido una GitHub Action para que el código en `backend/` se suba automáticamente a Google Apps Script cuando hagas `push` a la rama `main`.

### Configuración inicial:

1.  **Habilitar la API de Google Apps Script:**
    Ve a [script.google.com/home/settings](https://script.google.com/home/settings) y activa el interruptor de "Google Apps Script API".
2.  **Obtener credenciales:**
    *   Instala clasp localmente: `npm install -g @google/clasp`
    *   Inicia sesión: `clasp login`
    *   Busca el archivo `.clasprc.json` en tu carpeta de usuario (ej: `C:\Users\tu-usuario\.clasprc.json`).
    *   Copia **todo** su contenido.
3.  **Configurar GitHub Secrets:**
    *   En tu repositorio de GitHub, ve a **Settings > Secrets and variables > Actions**.
    *   Crea un nuevo secreto llamado `CLASPRC_JSON`.
    *   Pega el contenido del archivo `.clasprc.json`.
4.  **Configurar el ID del Script:**
    *   Sustituye el valor de `scriptId` en [backend/.clasp.json](backend/.clasp.json) por el ID de tu script (lo encuentras en la Configuración del proyecto en Google Apps Script).

---

## 📄 Estructura del Proyecto

*   `src/`: Aplicación frontend en Angular.
*   `backend/`: Código fuente de las macros para Google Apps Script.
*   `docs/`: Documentación técnica y funcional del sistema.

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.
