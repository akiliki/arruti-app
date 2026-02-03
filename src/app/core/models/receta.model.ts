export interface IngredienteReceta {
  nombre: string;
  cantidad: string;
  unidad: string;
}

export interface ProductoAsociado {
  idProducto: string;
  nombreProducto: string;
  raciones: string; // Cantidad de raciones que salen de este producto con esta receta
}

export interface Receta {
  id: string;
  nombre: string;
  cantidadPesada: number;
  unidadPesada: 'gr' | 'kg' | 'ml' | 'l' | 'ud';
  ingredientes: IngredienteReceta[];
  pasos: string;
  tiempoTotal: string;
  productosAsociados?: ProductoAsociado[];
  
  // Mantener por compatibilidad temporal si es necesario
  idProducto?: string;
  nombreProducto?: string;
  raciones?: string;
}
