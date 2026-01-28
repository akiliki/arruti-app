# Documentación Funcional - Pastelería Arruti

## Casos de Uso

### CU-01: Visualización del Dashboard de Producción
**Estado:** Definido
**Criticidad:** CRÍTICA (Requiere tests E2E)

**Descripción:**
Como gestor de la pastelería, quiero ver un resumen en tiempo real del estado de la producción diaria para tomar decisiones rápidas.

**Flujo Principal:**
1. El usuario accede a la aplicación.
2. El sistema carga los datos desde Google Sheets.
3. Se muestran indicadores:
    * Total de lotes pendientes.
    * Lotes en horno.
    * Lotes finalizados hoy.
4. Se muestra un gráfico de distribución de productos.

**Criterios de Aceptación:**
* Los datos deben actualizarse al recargar la página.
* Si no hay conexión o falla la API, debe mostrarse un mensaje de error claro.
* **Optimismo:** Los indicadores deben reaccionar inmediatamente a los cambios de estado locales.

### CU-07: Gestión de Recetas de Producción
**Estado:** Definido
**Criticidad:** MEDIA

**Descripción:**
Como pastelero, quiero registrar las recetas de cada producto y tamaño para asegurar la consistencia en la producción.

**Flujo Principal:**
1. El usuario accede al detalle de un Producto.
2. El usuario selecciona "Añadir Receta" o selecciona una ración para ver su receta.
3. El sistema permite introducir: Raciones (tamaño), Ingredientes, Pasos, y Tiempo de elaboración.
4. Los datos se guardan vinculados al ID del producto.

**Criterios de Aceptación:**
* Una receta debe estar vinculada a un producto y un tamaño/ración específico.
* Los campos de ingredientes y pasos deben permitir texto extenso.
* El tiempo de elaboración debe ser visible en el resumen del producto.

### CU-02: Gestión de Catálogo de Productos
**Estado:** Definido
**Criticidad:** ALTA

**Descripción:**
Como administrador, quiero gestionar los productos de la pastelería (familias, nombres y tamaños/raciones) para mantener el catálogo actualizado.

**Flujo Principal (Añadir):**
1. El usuario accede a la sección de Productos.
2. El usuario pulsa "Añadir Producto".
3. Completa los datos: Familia (ej: Bollería), Producto (ej: Croissant), Raciones o Tamaños (lista separada por comas).
4. El sistema genera un UUID para el producto y lo guarda.

**Flujo Principal (Modificar):**
1. El usuario accede a la sección de Productos.
2. El usuario pulsa "Editar" en el producto deseado.
3. El sistema carga los datos actuales en el formulario.
4. El usuario modifica los campos necesarios.
5. Al guardar, el sistema actualiza el registro en Google Sheets manteniendo el mismo ID.

**Flujo Principal (Listar):**
1. El usuario accede a la sección de Productos.
2. El sistema muestra la lista de productos agrupados o filtrables por Familia.

**Criterios de Aceptación:**
* Cada producto debe tener al menos una familia y un nombre.
* Los tamaños/raciones son opcionales pero recomendados para productos divisibles.

### CU-03: Creación de Pedidos
**Estado:** En Desarrollo
**Criticidad:** CRÍTICA

**Descripción:**
Como gestor, quiero crear pedidos seleccionando productos del catálogo de forma rápida y visual (interfaz adaptada a tablet/táctil) para asegurar la consistencia y agilidad en tienda.

**Flujo Principal:**
1. El usuario pulsa "Crear Nuevo Pedido".
2. El sistema muestra una cuadrícula de familias de productos para filtrado rápido.
3. El usuario selecciona una familia y luego un producto mediante botones táctiles grandes.
4. Si el producto tiene raciones/tallas definidas, se muestran como "chips" seleccionables.
5. El sistema rellena automáticamente la fecha de entrega sugerida (mañana).
6. Al confirmar, el pedido aparece inmediatamente en la lista (UI Optimista) mientras se sincroniza en segundo plano.

**Criterios de Aceptación:**
* La interfaz debe ser utilizable sin teclado/ratón (target táctil > 44px).
* Feedback visual inmediato tras la creación.
* Persistencia en Google Sheets.
### CU-06: Gestión de Familias de Productos
**Estado:** Definido
**Criticidad:** BAJA

**Descripción:**
Como administrador, quiero poder reutilizar familias de productos existentes al crear nuevos artículos para mantener la consistencia del catálogo, permitiendo también la creación de nuevas familias de forma dinámica.

**Flujo Principal:**
1. El usuario accede al formulario de Producto (Nuevo o Editar).
2. Al situarse en el campo "Familia", el sistema sugiere las familias ya existentes.
3. El usuario puede seleccionar una de la lista o escribir una nueva.
4. Al guardar el producto, la nueva familia queda registrada y disponible para futuros productos.

**Criterios de Aceptación:**
- El sistema debe ofrecer autocompletado basado en los datos actuales.
- No se requiere una pantalla de gestión de familias por separado (se gestionan dinámicamente).
### CU-04: Modificación de Pedidos
**Estado:** Definido
**Criticidad:** ALTA

**Descripción:**
Como gestor, quiero poder modificar los datos de un pedido existente (producto, cantidad, fecha de entrega, cliente) para corregir errores o adaptarme a cambios del cliente.

**Flujo Principal:**
1. El usuario accede a la lista de pedidos.
2. Pulsa el botón de "Editar" en el pedido correspondiente.
3. El sistema carga los datos actuales en el formulario de pedido.
4. El usuario realiza los cambios y pulsa "Actualizar".
5. El sistema aplica una actualización optimista en la lista y sincroniza con Google Sheets.

**Criterios de Aceptación:**
* Se debe mantener el ID_Pedido original.
* Los cambios deben reflejarse inmediatamente en el dashboard y lista de pedidos.

### CU-05: Gestión de Seguridad
**Estado:** Definido
**Criticidad:** MEDIA

**Descripción:**
Como administrador, quiero gestionar los usuarios que tienen acceso a la aplicación y sus respectivos perfiles para asegurar que cada persona solo acceda a la información necesaria para su trabajo.

**Flujo Principal (Control de Acceso):**
1. El usuario accede a la URL de la aplicación.
2. Si no ha iniciado sesión, el sistema le redirigirá automáticamente a la pantalla de Login.
3. El usuario introduce sus credenciales (email y contraseña).
4. Tras un inicio de sesión exitoso, el usuario es redirigido a la pantalla de pedidos.

**Flujo Principal (Usuarios y Perfiles):**
1. El usuario administrador accede a la sección de Seguridad.
2. En la pestaña "Usuarios", puede ver el listado de personas con acceso, su email y estado de activación.
3. En la pestaña "Perfiles", puede ver los roles disponibles y sus descripciones (ej: Administrador, Obrador, Tienda).

**Criterios de Aceptación:**
- Ningún usuario puede acceder a las rutas internas sin estar debidamente autenticado.
- La barra de navegación debe mostrar el nombre del usuario conectado y permitir el cierre de sesión.
- Los datos de usuario se persisten localmente durante la sesión.
