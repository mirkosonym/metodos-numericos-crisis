/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Types for Sistemas de Ecuaciones
export interface LinearSystemMatrix {
  a: number[][]; // Coeficientes (3x3)
  b: number[];   // Demandas
}

export interface EquationIteration {
  iteration: number;
  x: number[];
  errors: number[];
  maxError: number;
}

// Types for Raíces de Ecuaciones
export interface RootIteration {
  iteration: number;
  x0?: number;
  x1?: number;
  xr: number; // Root estimate
  fxr: number;
  error: number;
}

// Types for Interpolación
export interface DataPoint {
  x: number;
  y: number;
}

// Types for Integración Numérica
export interface SpendingPoint {
  x: number; // Day of the month
  y: number; // Spending value
}

// Types for Ecuaciones Diferenciales
export interface DiffEqResult {
  t: number;      // Day
  neutral: number; // Neutrales (N)
  protestor: number; // Manifestantes (M)
  mediator: number;  // Mediadores (D)
}
