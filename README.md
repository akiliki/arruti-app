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
    ```
2.  **Configurar Google Sheets:**
    *   Crear una copia de la [Plantilla de Spreadsheet](URL_DE_EJEMPLO).
    *   Generar credenciales en Google Cloud Console.
3.  **Variables de Entorno:**
    *   Crear un archivo `.env` basado en `.env.example`.
    *   Configurar `SPREADSHEET_ID` y `CLIENT_EMAIL`.
4.  **Instalar dependencias:**
    ```bash
    npm install
    ```
5.  **Ejecutar en desarrollo:**
    ```bash
    npm run dev
    ```

---

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.
