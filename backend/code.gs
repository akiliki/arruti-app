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
      notas_tienda: row[8]
    }));

    // Cálculo de estadísticas
    const stats = {
      pendientes: data.filter(p => String(p.estado_actual).trim() === 'Pendiente').length,
      horno: data.filter(p => String(p.estado_actual).trim() === 'En Proceso').length,
      producidos: data.filter(p => ['Producido', 'Finalizado'].includes(String(p.estado_actual).trim())).length,
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

    const sheetPedidos = ss.getSheetByName('Pedidos');
    if (!sheetPedidos) {
      throw new Error("La hoja 'Pedidos' no existe.");
    }

    if (payload.action === 'updateStatus') {
      return handleUpdateStatus(sheetPedidos, payload);
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
  const noteP = pedido.notas_pastelero || pedido.notasPastelero || '';
  const noteT = pedido.notas_tienda || pedido.notasTienda || '';

  // Preparar fila: ID, Producto, Cantidad, Fecha, Estado, Fecha Actualización, Cliente, Notas Pastelero, Notas Tienda
  const newRow = [
    id,
    prod,
    cant,
    fecha,
    est,
    new Date(), // Timestamp inicial
    cli,
    noteP,
    noteT
  ];

  sheet.appendRow(newRow);

  return createResponse({
    status: "success",
    message: "Pedido añadido correctamente",
    data: { id: id }
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
    raciones_tallas: row[3]
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
    payload.raciones_tallas
  ];

  sheet.appendRow(newRow);

  return createResponse({
    status: "success",
    message: "Producto añadido correctamente",
    id: payload.id_producto
  });
}
/**
 * Función para probar y autorizar permisos
 */
function testDeployment() {
  const result = doGet();
  Logger.log(result.getContent());
}