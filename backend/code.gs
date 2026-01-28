/**
 * Google Apps Script - Backend para Pastelería Arruti
 */

// CONFIGURACIÓN: ID de tu Google Sheet
const SPREADSHEET_ID = '1ECzAYLymvMzKq_lG1FVZ_J3Fx4jMv5nD9gQNpCeUCsc'; 

function doGet(e) {
  try {
    let ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (!ss) {
      throw new Error("No se pudo acceder a la hoja de cálculo con el ID proporcionado.");
    }

    const type = (e && e.parameter && e.parameter.type) || 'pedidos';

    if (type === 'productos') {
      return handleGetProductos(ss);
    }

    if (type === 'recetas') {
      return handleGetRecetas(ss);
    }

    if (type === 'empleados') {
      return handleGetEmpleados(ss);
    }
    
    const sheetPedidos = ss.getSheetByName('Pedidos');
    if (!sheetPedidos) {
      return createResponse({
        status: "error",
        message: "Hoja 'Pedidos' no encontrada en el documento. Verifique que la pestaña se llame exactamente 'Pedidos'."
      });
    }

    const range = sheetPedidos.getDataRange();
    const values = range.getValues();
    
    // Si la hoja está vacía o solo tiene cabecera
    if (values.length < 2) {
      return createResponse({
        status: "success",
        data: [],
        stats: { pendientes: 0, horno: 0, producidos: 0, entregados: 0 }
      });
    }

    const rows = values.slice(1);

    // Mapeo de datos
    const data = rows.map(row => ({
      id: row[0],
      producto: row[1],
      cantidad: row[2],
      fecha: row[3],
      estado_actual: row[4],
      fecha_act: row[5],
      nombre_cliente: row[6],
      notas_pastelero: row[7],
      notas_tienda: row[8],
      relleno: row[9],
      talla: row[10],
      vendedor: row[11],
      id_grupo: row[12],
      guardado_tienda: row[13]
    }));

    // Cálculo de estadísticas
    const stats = {
      pendientes: data.filter(p => String(p.estado_actual).trim() === 'Pendiente').length,
      horno: data.filter(p => String(p.estado_actual).trim() === 'En Proceso').length,
      producidos: data.filter(p => ['Producido', 'Finalizado', 'Terminado'].includes(String(p.estado_actual).trim())).length,
      entregados: data.filter(p => String(p.estado_actual).trim() === 'Entregado').length
    };

    return createResponse({
      status: "success",
      data: data,
      stats: stats
    });

  } catch (e) {
    return createResponse({
      status: "error",
      message: "Error en el script: " + e.message
    });
  }
}

function createResponse(content) {
  return ContentService.createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Maneja las peticiones POST para añadir nuevos pedidos o productos
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No se recibieron datos en la petición POST.");
    }

    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    if (!ss) {
      throw new Error("No se pudo acceder a la hoja de cálculo.");
    }

    if (payload.action === 'addProduct') {
      const sheetProductos = ss.getSheetByName('Productos');
      if (!sheetProductos) {
        throw new Error("La hoja 'Productos' no existe. Por favor, créala en tu Google Sheet.");
      }
      return handleAddProducto(sheetProductos, payload);
    }

    if (payload.action === 'updateProduct') {
      const sheetProductos = ss.getSheetByName('Productos');
      if (!sheetProductos) {
        throw new Error("La hoja 'Productos' no existe.");
      }
      return handleUpdateProducto(sheetProductos, payload);
    }

    if (payload.action === 'addReceta') {
      const sheetRecetas = ss.getSheetByName('Recetas');
      if (!sheetRecetas) {
        throw new Error("La hoja 'Recetas' no existe. Por favor, créala.");
      }
      return handleAddReceta(sheetRecetas, payload);
    }

    if (payload.action === 'updateReceta') {
      const sheetRecetas = ss.getSheetByName('Recetas');
      if (!sheetRecetas) {
        throw new Error("La hoja 'Recetas' no existe.");
      }
      return handleUpdateReceta(sheetRecetas, payload);
    }

    const sheetPedidos = ss.getSheetByName('Pedidos');
    if (!sheetPedidos) {
      throw new Error("La hoja 'Pedidos' no existe.");
    }

    if (payload.action === 'updateStatus') {
      return handleUpdateStatus(sheetPedidos, payload);
    }

    if (payload.action === 'updateOrder') {
      return handleUpdateOrder(sheetPedidos, payload);
    }

    if (payload.action === 'updateMultipleOrders') {
      return handleUpdateMultipleOrders(sheetPedidos, payload.pedidos);
    }

    if (payload.action === 'addPedidos') {
      return handleAddMultiplePedidos(sheetPedidos, payload.pedidos);
    }

    // Acción por defecto: Añadir pedido
    return handleAddPedido(sheetPedidos, payload);

  } catch (e) {
    return createResponse({
      status: "error",
      message: e.message || "Error desconocido en doPost"
    });
  }
}

/**
 * Añade un nuevo pedido a la hoja
 */
function handleAddPedido(sheet, pedido) {
  const lastRow = sheet.getLastRow();
  const id = pedido.id || "P-" + (lastRow + 1).toString().padStart(4, '0');
  
  // Mapeo seguro de las propiedades del payload (snake_case o camelCase)
  const prod = pedido.producto;
  const cant = pedido.cantidad;
  const fecha = pedido.fechaEntrega;
  const est = pedido.estado || 'Pendiente';
  const cli = pedido.nombre_cliente || pedido.nombreCliente || '';
  const rel = pedido.relleno || '';
  const tal = pedido.talla || '';
  const noteP = pedido.notas_pastelero || pedido.notasPastelero || '';
  const noteT = pedido.notas_tienda || pedido.notasTienda || '';
  const vend = pedido.vendedor || '';
  const idG = pedido.id_grupo || pedido.idGrupo || '';
  const gT = pedido.guardado_tienda || pedido.guardadoEnTienda || 'NO';

  // Preparar fila: ID, Producto, Cantidad, Fecha, Estado, Fecha Actualización, Cliente, Notas Pastelero, Notas Tienda, Relleno, Talla, Vendedor, ID_Grupo, Guardado_Tienda
  const newRow = [
    id,
    prod,
    cant,
    fecha,
    est,
    new Date(), // Timestamp inicial
    cli,
    noteP,
    noteT,
    rel,
    tal,
    vend,
    idG,
    gT
  ];

  sheet.appendRow(newRow);

  return createResponse({
    status: "success",
    message: "Pedido añadido correctamente",
    data: { id: id }
  });
}

/**
 * Añade múltiples pedidos a la hoja de una vez
 */
function handleAddMultiplePedidos(sheet, pedidos) {
  if (!pedidos || !Array.isArray(pedidos) || pedidos.length === 0) {
    throw new Error("No se proporcionaron pedidos para añadir.");
  }

  const lastRow = sheet.getLastRow();
  const now = new Date();
  
  const rowsToAdd = pedidos.map((pedido, index) => {
    const id = pedido.id || "P-" + (lastRow + 1 + index).toString().padStart(4, '0');
    
    return [
      id,
      pedido.producto || '',
      pedido.cantidad || 0,
      pedido.fechaEntrega || now,
      pedido.estado || 'Pendiente',
      now, // Fecha Actualización
      pedido.nombreCliente || pedido.nombre_cliente || '',
      pedido.notasPastelero || pedido.notas_pastelero || '',
      pedido.notasTienda || pedido.notas_tienda || '',
      pedido.relleno || '',
      pedido.talla || '',
      pedido.vendedor || '',
      pedido.id_grupo || pedido.idGrupo || '',
      pedido.guardado_tienda || pedido.guardadoEnTienda || 'NO'
    ];
  });

  // Usar getRange().setValues() es más eficiente para múltiples filas que appendRow en bucle
  sheet.getRange(lastRow + 1, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);

  return createResponse({
    status: "success",
    message: pedidos.length + " pedidos añadidos correctamente",
    count: pedidos.length
  });
}

/**
 * Actualiza el estado de un pedido existente
 */
function handleUpdateStatus(sheet, payload) {
  const data = sheet.getDataRange().getValues();
  const idToUpdate = payload.id;
  const nuevoEstado = payload.estado;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === idToUpdate) {
      const row = i + 1;
      sheet.getRange(row, 5).setValue(nuevoEstado); // Columna E (Estado)
      sheet.getRange(row, 6).setValue(new Date());   // Columna F (Fecha Actualización)
      
      return createResponse({
        status: "success",
        message: "Estado actualizado correctamente"
      });
    }
  }
  
  throw new Error("Pedido no encontrado para actualizar.");
}

/**
 * Actualiza un pedido completo
 */
function handleUpdateOrder(sheet, payload) {
  const data = sheet.getDataRange().getValues();
  const idToUpdate = payload.id;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === idToUpdate) {
      const row = i + 1;
      sheet.getRange(row, 2).setValue(payload.producto);
      sheet.getRange(row, 3).setValue(payload.cantidad);
      sheet.getRange(row, 4).setValue(payload.fechaEntrega);
      sheet.getRange(row, 5).setValue(payload.estado);
      sheet.getRange(row, 6).setValue(new Date()); // Fecha Actualización
      sheet.getRange(row, 7).setValue(payload.nombre_cliente);
      sheet.getRange(row, 8).setValue(payload.notas_pastelero);
      sheet.getRange(row, 9).setValue(payload.notas_tienda);
      sheet.getRange(row, 10).setValue(payload.relleno);
      sheet.getRange(row, 11).setValue(payload.talla);
      sheet.getRange(row, 12).setValue(payload.vendedor);
      sheet.getRange(row, 13).setValue(payload.id_grupo || payload.idGrupo || '');
      sheet.getRange(row, 14).setValue(payload.guardado_tienda || payload.guardadoEnTienda || 'NO');
      
      return createResponse({
        status: "success",
        message: "Pedido actualizado correctamente"
      });
    }
  }
  
  throw new Error("Pedido no encontrado para actualizar.");
}

/**
 * Obtiene la lista de productos
 */
function handleGetProductos(ss) {
  const sheet = ss.getSheetByName('Productos');
  if (!sheet) {
    return createResponse({ status: "error", message: "Hoja 'Productos' no encontrada." });
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return createResponse({ status: "success", data: [] });
  }

  const rows = values.slice(1);
  const data = rows.map(row => ({
    id_producto: row[0],
    familia: row[1],
    nombre: row[2],
    raciones_tallas: row[3],
    rellenos: row[4]
  }));

  return createResponse({
    status: "success",
    data: data
  });
}

/**
 * Añade un nuevo producto
 */
function handleAddProducto(sheet, payload) {
  const newRow = [
    payload.id_producto,
    payload.familia,
    payload.nombre,
    payload.raciones_tallas,
    payload.rellenos
  ];

  sheet.appendRow(newRow);

  return createResponse({
    status: "success",
    message: "Producto añadido correctamente",
    id: payload.id_producto
  });
}

/**
 * Actualiza un producto existente
 */
function handleUpdateProducto(sheet, payload) {
  const data = sheet.getDataRange().getValues();
  const idToUpdate = payload.id_producto;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === idToUpdate) {
      const row = i + 1;
      sheet.getRange(row, 2).setValue(payload.familia);
      sheet.getRange(row, 3).setValue(payload.nombre);
      sheet.getRange(row, 4).setValue(payload.raciones_tallas);
      sheet.getRange(row, 5).setValue(payload.rellenos);
      
      return createResponse({
        status: "success",
        message: "Producto actualizado correctamente"
      });
    }
  }
  
  throw new Error("Producto no encontrado para actualizar.");
}

/**
 * Obtiene la lista de empleados
 */
function handleGetEmpleados(ss) {
  const sheet = ss.getSheetByName('Empleados');
  if (!sheet) {
    return createResponse({ status: "error", message: "Hoja 'Empleados' no encontrada." });
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return createResponse({ status: "success", data: [] });
  }

  const rows = values.slice(1);
  const data = rows.map(row => ({
    id: row[0],
    nombre: row[1],
    activo: row[2] === true || row[2] === 'TRUE' || row[2] === 'SI'
  }));

  return createResponse({
    status: "success",
    data: data
  });
}

function handleUpdateMultipleOrders(sheet, pedidos) {
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  
  pedidos.forEach(payload => {
     let row = -1;
     for (let i = 1; i < data.length; i++) {
       if (data[i][0] == payload.id) {
         row = i + 1;
         break;
       }
     }
     
     if (row !== -1) {
        sheet.getRange(row, 2).setValue(payload.producto);
        sheet.getRange(row, 3).setValue(payload.cantidad);
        sheet.getRange(row, 4).setValue(payload.fechaEntrega);
        sheet.getRange(row, 5).setValue(payload.estado);
        sheet.getRange(row, 6).setValue(now);
        sheet.getRange(row, 7).setValue(payload.nombre_cliente || payload.nombreCliente || '');
        sheet.getRange(row, 8).setValue(payload.notas_pastelero || payload.notasPastelero || '');
        sheet.getRange(row, 9).setValue(payload.notas_tienda || payload.notasTienda || '');
        sheet.getRange(row, 10).setValue(payload.relleno);
        sheet.getRange(row, 11).setValue(payload.talla);
        sheet.getRange(row, 12).setValue(payload.vendedor);
        sheet.getRange(row, 13).setValue(payload.id_grupo || payload.idGrupo || '');
        sheet.getRange(row, 14).setValue(payload.guardado_tienda || payload.guardadoEnTienda || 'NO');
     } else {
        // SI no existe (es una línea nueva añadida durante la edición), la añadimos
        const newRow = [
          payload.id,
          payload.producto,
          payload.cantidad,
          payload.fechaEntrega,
          payload.estado || 'Pendiente',
          now,
          payload.nombre_cliente || payload.nombreCliente || '',
          payload.notas_pastelero || payload.notasPastelero || '',
          payload.notas_tienda || payload.notasTienda || '',
          payload.relleno || '',
          payload.talla || '',
          payload.vendedor || '',
          payload.id_grupo || payload.idGrupo || '',
          payload.guardado_tienda || payload.guardadoEnTienda || 'NO'
        ];
        sheet.appendRow(newRow);
     }
  });

  return createResponse({ status: 'success', message: 'Pedidos procesados (actualizados/añadidos)' });
}

/**
 * Obtiene la lista de recetas
 */
function handleGetRecetas(ss) {
  const sheet = ss.getSheetByName('Recetas');
  if (!sheet) {
    return createResponse({ status: "error", message: "Hoja 'Recetas' no encontrada." });
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return createResponse({ status: "success", data: [] });
  }

  const rows = values.slice(1);
  const data = rows.map(row => ({
    id: row[0],
    id_producto: row[1],
    nombre_producto: row[2],
    raciones: row[3],
    ingredientes: row[4],
    pasos: row[5],
    tiempo_total: row[6]
  }));

  return createResponse({
    status: "success",
    data: data
  });
}

/**
 * Añade una nueva receta
 */
function handleAddReceta(sheet, payload) {
  const newRow = [
    payload.id,
    payload.id_producto,
    payload.nombre_producto,
    payload.raciones,
    payload.ingredientes,
    payload.pasos,
    payload.tiempo_total
  ];

  sheet.appendRow(newRow);

  return createResponse({
    status: "success",
    message: "Receta añadida correctamente",
    id: payload.id
  });
}

/**
 * Actualiza una receta existente
 */
function handleUpdateReceta(sheet, payload) {
  const data = sheet.getDataRange().getValues();
  const idToUpdate = payload.id;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === idToUpdate) {
      const row = i + 1;
      sheet.getRange(row, 2).setValue(payload.id_producto);
      sheet.getRange(row, 3).setValue(payload.nombre_producto);
      sheet.getRange(row, 4).setValue(payload.raciones);
      sheet.getRange(row, 5).setValue(payload.ingredientes);
      sheet.getRange(row, 6).setValue(payload.pasos);
      sheet.getRange(row, 7).setValue(payload.tiempo_total);
      
      return createResponse({
        status: "success",
        message: "Receta actualizada correctamente"
      });
    }
  }
  
  throw new Error("Receta no encontrada para actualizar.");
}

/**
 * Función para probar y autorizar permisos
 */
function testDeployment() {
  const result = doGet();
  Logger.log(result.getContent());
}