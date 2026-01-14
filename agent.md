# Guía para el Agente IA - Pastelería Arruti

Esta guía establece las reglas de colaboración y arquitectura para el desarrollo del sistema.

## 📜 Principios de Trabajo

1.  **Desarrollo Incremental:** El desarrollo debe ser paso a paso. No se deben añadir funcionalidades que no hayan sido solicitadas explícitamente.
2.  **Protocolo de Aprobación:**
    *   **Primero Planificar:** Antes de realizar cualquier cambio significativo o implementar una nueva funcionalidad, la IA debe presentar un plan de acción detallado.
    *   **Esperar OK:** No se debe ejecutar ninguna implementación sin el permiso expreso del usuario tras revisar el plan.
3.  **Separación de Capas:** El código debe estar estrictamente organizado en capas para facilitar el mantenimiento y cambios futuros (UI, Servicios, Modelos, Adaptadores).
4.  **Claridad antes de Acción:** Si las instrucciones o requerimientos son vagos o incompletos, la IA **debe pedir más información** antes de proponer un plan.

## 🛠️ Stack Tecnológico
*   **Frontend:** Angular (Última versión estable).
*   **Lenguaje:** TypeScript.
*   **Estilo:** CSS/SCSS (según se defina).
*   **Estado:** Signals o Services (según complejidad).

## ✅ Estrategia de Pruebas

*   **Tests Unitarios:** Obligatorios para toda la lógica de dominio y reglas de negocio.
*   **Tests de Integración:** Para validar la comunicación con la infraestructura (ej: Google Sheets API, adaptadores).
*   **Tests E2E:** Reservados para los casos de uso críticos.
    *   La criticidad se definirá en la descripción del caso de uso para ser considerada en el plan de implementación.

## 📚 Documentación Requerida

Cada funcionalidad debe ir acompañada de:
1.  **Documentación Funcional:** Descripción de los casos de uso desde el punto de vista del usuario.
2.  **Documentación Técnica:** Diagramas de tablas/hojas (Google Sheets), relaciones, flujos de datos e integraciones.

## 🏗️ Arquitectura Sugerida (Capas Angular)

Para asegurar la mantenibilidad, seguiremos esta estructura:

*   **`models/`**: Definición de interfaces y tipos de datos.
*   **`services/`**: Lógica de comunicación con APIs (Google Sheets) y gestión de datos.
*   **`features/`**: Componentes de página o módulos funcionales.
*   **`shared/`**: Componentes, pipes o directivas reutilizables.
*   **`adapters/`**: Transformación de datos crudos (Sheets) a modelos de dominio.

## 📋 Flujo de Tarea Típico

1.  **Recepción:** Leer requerimiento del usuario.
2.  **Análisis:** Identificar archivos afectados y lógica necesaria.
3.  **Propuesta:** Escribir en el chat qué se va a hacer (ej: "Crearé el servicio X y el modelo Y").
4.  **Aprobación:** Esperar el "adelante" del usuario.
5.  **Ejecución:** Aplicar los cambios.
6.  **Verificación:** Confirmar que los cambios funcionan y cumplen con los estándares.
