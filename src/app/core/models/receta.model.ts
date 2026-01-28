export interface IngredienteReceta {
  nombre: string;
  cantidad: string;
  unidad: string;
}

export interface Receta {
  id: string;
  idProducto: string;
  nombreProducto: string;
  raciones: string;
  ingredientes: IngredienteReceta[];
  pasos: string;
  tiempoTotal: string;
}
