/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Activity, 
  Layers, 
  Sliders, 
  TrendingUp, 
  Coins, 
  Compass, 
  Network
} from "lucide-react";
import { EquationIteration } from "../types";

export default function EquationsModule() {
  // 3x3 Base Coefficient matrix A (Plants to Zones supply capacities/multiplier)
  const [matrixA, setMatrixA] = useState<number[][]>([
    [10, 2, 1],
    [1, 12, 3],
    [2, 1, 10]
  ]);

  // Base Demand vector B (Zona 1: Norte, Zona 2: Centro, Zona 3: Sur)
  const [vectorB, setVectorB] = useState<number[]>([150, 240, 180]);

  // Interactive Blocked Routes (true means route is blocked / coefficient becomes 0)
  const [blockedRoutes, setBlockedRoutes] = useState<boolean[][]>([
    [false, false, false],
    [false, false, false],
    [false, false, false]
  ]);

  // Demand Surge Multiplier slider (from -50% to +50%)
  const [demandSurge, setDemandSurge] = useState<number>(0);

  // Hyperparameters
  const [method, setMethod] = useState<"gauss-seidel" | "jacobi" | "sor" | "lu" | "cg">("gauss-seidel");
  const [maxIterations, setMaxIterations] = useState<number>(20);
  const [tolerance, setTolerance] = useState<number>(0.001);
  const [omega, setOmega] = useState<number>(1.25); // SOR factor
  const [initialGuess, setInitialGuess] = useState<number[]>([0, 0, 0]);

  // Escenario F: Epidemia de Rumores y Pánico de Desabastecimiento
  const [activeScenario, setActiveScenario] = useState<"A" | "F">("A");
  const [rumorLevel, setRumorLevel] = useState<"bajo" | "medio" | "alto" | "panico" | "artificial">("bajo");

  // Calculates 1-norm Condition Number for the active system of linear equations
  const getConditionNumberVal = () => {
    const activeA = matrixA.map((row, rIdx) => 
      row.map((val, cIdx) => (blockedRoutes[rIdx][cIdx] ? 0 : val))
    );

    // Compute cofactor-based elements for 3x3 determinant & adjoint
    const c00 = activeA[1][1] * activeA[2][2] - activeA[1][2] * activeA[2][1];
    const c01 = -(activeA[1][0] * activeA[2][2] - activeA[1][2] * activeA[2][0]);
    const c02 = activeA[1][0] * activeA[2][1] - activeA[1][1] * activeA[2][0];

    const det = activeA[0][0] * c00 + activeA[0][1] * c01 + activeA[0][2] * c02;

    if (Math.abs(det) < 1e-12) {
      return { cond: Infinity, det: det };
    }

    const c10 = -(activeA[0][1] * activeA[2][2] - activeA[0][2] * activeA[2][1]);
    const c11 = activeA[0][0] * activeA[2][2] - activeA[0][2] * activeA[2][0];
    const c12 = -(activeA[0][0] * activeA[2][1] - activeA[0][1] * activeA[2][0]);

    const c20 = activeA[0][1] * activeA[1][2] - activeA[0][2] * activeA[1][1];
    const c21 = -(activeA[0][0] * activeA[1][2] - activeA[0][2] * activeA[1][0]);
    const c22 = activeA[0][0] * activeA[1][1] - activeA[0][1] * activeA[1][0];

    // Transposed adjugate matrix divided by determinant is the inverse
    const inv = [
      [c00 / det, c10 / det, c20 / det],
      [c01 / det, c11 / det, c21 / det],
      [c02 / det, c12 / det, c22 / det]
    ];

    // Column L1 norm of original activeA
    const normA = Math.max(
      Math.abs(activeA[0][0]) + Math.abs(activeA[1][0]) + Math.abs(activeA[2][0]),
      Math.abs(activeA[0][1]) + Math.abs(activeA[1][1]) + Math.abs(activeA[2][1]),
      Math.abs(activeA[0][2]) + Math.abs(activeA[1][2]) + Math.abs(activeA[2][2])
    );

    // Column L1 norm of Inverse activeA^-1
    const normInvA = Math.max(
      Math.abs(inv[0][0]) + Math.abs(inv[1][0]) + Math.abs(inv[2][0]),
      Math.abs(inv[0][1]) + Math.abs(inv[1][1]) + Math.abs(inv[2][1]),
      Math.abs(inv[0][2]) + Math.abs(inv[1][2]) + Math.abs(inv[2][2])
    );

    return { cond: normA * normInvA, det: det };
  };

  const applyScenarioFPreset = (level: "bajo" | "medio" | "alto" | "panico" | "artificial") => {
    setRumorLevel(level);
    if (level === "bajo") {
      setMatrixA([
        [10, 2, 1],
        [1, 12, 3],
        [2, 1, 10]
      ]);
      setDemandSurge(5);
      setBlockedRoutes([
        [false, false, false],
        [false, false, false],
        [false, false, false]
      ]);
    } else if (level === "medio") {
      setMatrixA([
        [10, 2, 1],
        [1, 12, 3],
        [2, 1, 10]
      ]);
      setDemandSurge(15);
      setBlockedRoutes([
        [false, false, false],
        [false, false, false],
        [false, false, false]
      ]);
    } else if (level === "alto") {
      setMatrixA([
        [10, 2, 1],
        [1, 12, 3],
        [2, 1, 10]
      ]);
      setDemandSurge(30);
      setBlockedRoutes([
        [false, false, false],
        [false, true, false], // Block Plant 2 to Zone Centro (Z2)
        [false, false, false]
      ]);
    } else if (level === "panico") {
      // Highly ill-conditioned coefficient matrix! Rows 1 and 3 are close to linearly dependent.
      setMatrixA([
        [10.0, 9.8, 4.0],
        [1.0, 1.1, 12.0],
        [9.9, 10.0, 4.1]
      ]);
      setDemandSurge(50);
      setBlockedRoutes([
        [false, false, false],
        [false, false, false],
        [false, false, false]
      ]);
    } else if (level === "artificial") {
      setMatrixA([
        [10.0, 9.8, 4.0],
        [1.0, 1.1, 12.0],
        [9.9, 10.0, 4.1]
      ]);
      setDemandSurge(40);
      setBlockedRoutes([
        [true, false, false], // Block multiple key routes, representing panic-driven reduction of stock
        [false, false, true],
        [false, false, false]
      ]);
    }
  };

  // Outputs
  const [iterations, setIterations] = useState<EquationIteration[]>([]);
  const [converged, setConverged] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // LU Details for non-iterative analysis
  interface LuDetailsType {
    L: number[][];
    U: number[][];
    y: number[];
    x: number[];
  }
  const [luDetails, setLuDetails] = useState<LuDetailsType | null>(null);

  // Question Analysis Metas
  const [mostAffectedZone, setMostAffectedZone] = useState<string>("Zona 2 (Centro)");
  const [zonalSensitivity, setZonalSensitivity] = useState<number[]>([0, 0, 0]);
  const [stabilityFactor, setStabilityFactor] = useState<number>(1.0);
  const [isWellConditioned, setIsWellConditioned] = useState<boolean>(true);

  // Helper names
  const zoneNames = ["Zona Norte (Z1)", "Zona Centro (Z2)", "Zona Sur (Z3)"];
  const plantNames = ["Planta de Acopio 1", "Planta de Acopio 2", "Planta de Acopio 3"];

  // Core solver function
  const solveSystem = (
    A: number[][],
    b: number[],
    methodToUse: "gauss-seidel" | "jacobi" | "sor" | "lu" | "cg",
    limit: number,
    tol: number,
    x0: number[]
  ) => {
    // 1. Check for basic division safety
    for (let i = 0; i < 3; i++) {
      if (Math.abs(A[i][i]) < 1e-9) {
        return {
          iterations: [],
          converged: false,
          errorMsg: `Error: El término de la diagonal principal A[${i+1}][${i+1}] es extremadamente cercano a cero. Los solucionadores numéricos colapsarían por división indeterminada. Reajuste los datos o elimine los bloqueos en la diagonal.`,
          luDetails: null
        };
      }
    }

    // Direct solver: LU Decomposition
    if (methodToUse === "lu") {
      const L = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];
      const U = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ];

      // Row 1 of U
      U[0][0] = A[0][0];
      U[0][1] = A[0][1];
      U[0][2] = A[0][2];

      if (Math.abs(U[0][0]) < 1e-9) {
        return {
          iterations: [],
          converged: false,
          errorMsg: "Error LU: El primer elemento diagonal pivotado es demasiado cercano a cero. Ajuste los coeficientes.",
          luDetails: null
        };
      }

      L[1][0] = A[1][0] / U[0][0];
      L[2][0] = A[2][0] / U[0][0];

      // Row 2 of U
      U[1][1] = A[1][1] - L[1][0] * U[0][1];
      U[1][2] = A[1][2] - L[1][0] * U[0][2];

      if (Math.abs(U[1][1]) < 1e-9) {
        return {
          iterations: [],
          converged: false,
          errorMsg: "Error LU: División indeterminada en el segundo pivote. El sistema no tiene descomposición LU sin permutación.",
          luDetails: null
        };
      }

      L[2][1] = (A[2][1] - L[2][0] * U[0][1]) / U[1][1];

      // Row 3 of U
      U[2][2] = A[2][2] - L[2][0] * U[0][2] - L[2][1] * U[1][2];

      if (Math.abs(U[2][2]) < 1e-9) {
        return {
          iterations: [],
          converged: false,
          errorMsg: "Error LU: El sistema posee una matriz singular o cercana a singular, tercer pivote nulo.",
          luDetails: null
        };
      }

      // Solve Ly = b (Forward substitution)
      const y = [0, 0, 0];
      y[0] = b[0];
      y[1] = b[1] - L[1][0] * y[0];
      y[2] = b[2] - L[2][0] * y[0] - L[2][1] * y[1];

      // Solve Ux = y (Backward substitution)
      const x = [0, 0, 0];
      x[2] = y[2] / U[2][2];
      x[1] = (y[1] - U[1][2] * x[2]) / U[1][1];
      x[0] = (y[0] - U[0][1] * x[1] - U[0][2] * x[2]) / U[0][0];

      // Return solution wrapped in identical iterations data
      return {
        iterations: [{
          iteration: 1,
          x: [...x],
          errors: [0, 0, 0],
          maxError: 0
        }],
        converged: true,
        errorMsg: null,
        luDetails: { L, U, y, x }
      };
    }

    // Direct solver: Conjugate Gradient (Iterative Krylov solver)
    if (methodToUse === "cg") {
      const list: EquationIteration[] = [];
      let currentX = [...x0];
      let isSuccessful = false;
      let localErrorMsg: string | null = null;

      // Residual r = b - Ax
      const r = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        let ax = 0;
        for (let j = 0; j < 3; j++) {
          ax += A[i][j] * currentX[j];
        }
        r[i] = b[i] - ax;
      }

      let p = [...r]; // Initial search direction

      for (let k = 1; k <= limit; k++) {
        // Dot product r^T * r
        const rDotR = r[0]*r[0] + r[1]*r[1] + r[2]*r[2];
        if (Math.sqrt(rDotR) < tol) {
          isSuccessful = true;
          break;
        }

        // Vector Ap
        const Ap = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            Ap[i] += A[i][j] * p[j];
          }
        }

        // Dot product p^T * Ap
        const pDotAp = p[0]*Ap[0] + p[1]*Ap[1] + p[2]*Ap[2];
        if (Math.abs(pDotAp) < 1e-15) {
          if (k === 1) isSuccessful = true;
          else localErrorMsg = "División indeterminada ocurrida en Gradiente Conjugado. La matriz debe ser simétrica y definida positiva.";
          break;
        }

        // Step length alpha = (r^T * r) / (p^T * A * p)
        const alphaVal = rDotR / pDotAp;

        // X_{k+1} = X_k + alpha * p
        const nextX = [
          currentX[0] + alphaVal * p[0],
          currentX[1] + alphaVal * p[1],
          currentX[2] + alphaVal * p[2]
        ];

        // r_{k+1} = r_k - alpha * Ap
        const nextR = [
          r[0] - alphaVal * Ap[0],
          r[1] - alphaVal * Ap[1],
          r[2] - alphaVal * Ap[2]
        ];

        // L2 norm of the new residual
        const nextRDotNextR = nextR[0]*nextR[0] + nextR[1]*nextR[1] + nextR[2]*nextR[2];
        const resNorm = Math.sqrt(nextRDotNextR);

        // Approximate percentage error relative to coordinates
        const errors = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
          const diff = Math.abs(nextX[i] - currentX[i]);
          errors[i] = Math.abs(nextX[i]) > 1e-9 ? (diff / Math.abs(nextX[i])) * 100 : diff;
        }

        const maxErr = Math.max(...errors);
        list.push({
          iteration: k,
          x: [...nextX],
          errors: [...errors],
          maxError: resNorm // Residual norm as primary convergence gauge
        });

        if (resNorm < tol || maxErr < tol) {
          isSuccessful = true;
          currentX = nextX;
          break;
        }

        // beta = (r_{k+1}^T * r_{k+1}) / (r_k^T * r_k)
        const betaVal = nextRDotNextR / rDotR;

        // p_{k+1} = r_{k+1} + beta * p
        p = [
          nextR[0] + betaVal * p[0],
          nextR[1] + betaVal * p[1],
          nextR[2] + betaVal * p[2]
        ];

        r[0] = nextR[0];
        r[1] = nextR[1];
        r[2] = nextR[2];

        currentX = nextX;

        if (k > 40) {
          localErrorMsg = "Falla de convergencia en Gradiente Conjugado. Esto ocurre cuando la matriz no es simétrica definida positiva.";
          break;
        }
      }

      return {
        iterations: list,
        converged: isSuccessful || (list.length > 0 && list[list.length-1].maxError < tol),
        errorMsg: localErrorMsg,
        luDetails: null
      };
    }

    // Iterative Solvers: Jacobi, Gauss-Seidel, SOR
    const list: EquationIteration[] = [];
    let currentX = [...x0];
    let isSuccessful = false;
    let localErrorMsg: string | null = null;

    for (let k = 1; k <= limit; k++) {
      const nextX = [...currentX];
      const errors = [0, 0, 0];

      for (let i = 0; i < 3; i++) {
        let sum = 0;
        
        if (methodToUse === "jacobi") {
          // Jacobi uses purely historical values (currentX)
          for (let j = 0; j < 3; j++) {
            if (i !== j) {
              sum += A[i][j] * currentX[j];
            }
          }
        } else {
          // Gauss-Seidel / SOR use updated variables immediately (nextX)
          for (let j = 0; j < 3; j++) {
            if (i !== j) {
              sum += A[i][j] * nextX[j];
            }
          }
        }

        // Raw Gauss-Seidel/Jacobi next value estimation
        const rawNextVal = (b[i] - sum) / A[i][i];

        if (methodToUse === "sor") {
          // Relaxed coordinate displacement
          nextX[i] = (1 - omega) * currentX[i] + omega * rawNextVal;
        } else {
          nextX[i] = rawNextVal;
        }

        // Relative error approximation (%)
        if (Math.abs(nextX[i]) > 1e-9) {
          errors[i] = Math.abs((nextX[i] - currentX[i]) / nextX[i]) * 100;
        } else {
          errors[i] = Math.abs(nextX[i] - currentX[i]);
        }
      }

      const maxError = Math.max(...errors);
      list.push({
        iteration: k,
        x: [...nextX],
        errors: [...errors],
        maxError
      });

      if (maxError < tol) {
        isSuccessful = true;
        currentX = nextX;
        break;
      }

      if (maxError > 1e9 || nextX.some(val => isNaN(val) || !isFinite(val))) {
        localErrorMsg = "El solucionador iterativo divergió significativamente. Verifique la dominancia diagonal de la matriz o reduzca el factor de relajación ω.";
        break;
      }

      currentX = nextX;
    }

    return {
      iterations: list,
      converged: isSuccessful || (list.length > 0 && list[list.length - 1].maxError < tol),
      errorMsg: localErrorMsg,
      luDetails: null
    };
  };

  // Run solver and run analytical responses based on inputs
  const runSimulation = () => {
    setErrorMsg(null);
    setLuDetails(null);

    // Apply active blocked routes to building the operational Matrix A
    const activeA = matrixA.map((row, rIdx) => 
      row.map((val, cIdx) => (blockedRoutes[rIdx][cIdx] ? 0 : val))
    );

    // Apply Demand surge ratio to Vector B items
    const surgeRatio = 1 + demandSurge / 100;
    const activeB = vectorB.map(b => b * surgeRatio);

    // Solve operational system
    const result = solveSystem(activeA, activeB, method, maxIterations, tolerance, initialGuess);
    setIterations(result.iterations);
    setConverged(result.converged);
    if (result.errorMsg) setErrorMsg(result.errorMsg);
    if (result.luDetails) setLuDetails(result.luDetails);

    // Dynamic analysis for Question 3, 4, 5 (Only if solvable and converged)
    if (result.converged && result.iterations.length > 0) {
      const finalSol = result.iterations[result.iterations.length - 1].x;

      // 1. Zonal sensitivity analysis: Perturb each zone demand slightly and analyze overall distribution flux shifting
      const sensitivityIndices = [0, 0, 0];
      for (let targetZone = 0; targetZone < 3; targetZone++) {
        const perturbedB = [...activeB];
        perturbedB[targetZone] += 15; // Small spike in this zone model
        const testRes = solveSystem(activeA, perturbedB, method, maxIterations * 2, tolerance, initialGuess);
        if (testRes.converged && testRes.iterations.length > 0) {
          const testSol = testRes.iterations[testRes.iterations.length - 1].x;
          // Cumulative shift of allocation across all indices
          const absoluteSumShift = testSol.reduce((sum, val, idx) => sum + Math.abs(val - finalSol[idx]), 0);
          sensitivityIndices[targetZone] = absoluteSumShift;
        }
      }
      setZonalSensitivity(sensitivityIndices);
      
      const maxIdx = sensitivityIndices.indexOf(Math.max(...sensitivityIndices));
      setMostAffectedZone(zoneNames[maxIdx]);

      // 2. Numerical Stability Test: simulate a small arbitrary perturbation (+5%) and calculate solution error shift
      const smallPerturbB = activeB.map(v => v * 1.05);
      const testStability = solveSystem(activeA, smallPerturbB, method, maxIterations * 2, tolerance, initialGuess);
      if (testStability.converged && testStability.iterations.length > 0) {
        const sSol = testStability.iterations[testStability.iterations.length - 1].x;
        // Relative change in inputs vs relative change in outputs ratio
        const normB = Math.sqrt(activeB.reduce((s, v) => s + v*v, 0));
        const normDeltaB = Math.sqrt(activeB.map(v => v * 0.05).reduce((s, v) => s+v*v, 0));

        const normX = Math.sqrt(finalSol.reduce((s, v) => s + v*v, 0)) || 1;
        const normDeltaX = Math.sqrt(sSol.map((s, idx) => s - finalSol[idx]).reduce((s, v) => s+v*v, 0));

        const condFactor = (normDeltaX / normX) / (normDeltaB / normB);
        setStabilityFactor(condFactor);
        setIsWellConditioned(condFactor < 3.5); // Well conditioned under standard thresholds
      } else {
        setStabilityFactor(1.0);
        setIsWellConditioned(false);
      }
    } else {
      setZonalSensitivity([0, 0, 0]);
      setMostAffectedZone("N/A (Reajuste requerido)");
      setStabilityFactor(1.0);
    }
  };

  // Re-run whenever interactive inputs shift
  useEffect(() => {
    runSimulation();
  }, [matrixA, vectorB, blockedRoutes, demandSurge, method, maxIterations, tolerance, omega]);

  // Handlers
  const handleAChange = (row: number, col: number, val: string) => {
    const num = parseFloat(val) || 0;
    const newA = matrixA.map((r, ri) => 
      r.map((c, ci) => (ri === row && ci === col ? num : c))
    );
    setMatrixA(newA);
  };

  const handleBChange = (idx: number, val: string) => {
    const num = parseFloat(val) || 0;
    const newB = [...vectorB];
    newB[idx] = num;
    setVectorB(newB);
  };

  const toggleRouteBlock = (r: number, c: number) => {
    const nextBlock = blockedRoutes.map((row, ri) => 
      row.map((val, ci) => (ri === r && ci === c ? !val : val))
    );
    // Directly toggle route block cell
    const updated = [...blockedRoutes];
    updated[r][c] = !updated[r][c];
    setBlockedRoutes(updated);
  };

  const handleReset = () => {
    setMatrixA([
      [10, 2, 1],
      [1, 12, 3],
      [2, 1, 10]
    ]);
    setVectorB([150, 240, 180]);
    setBlockedRoutes([
      [false, false, false],
      [false, false, false],
      [false, false, false]
    ]);
    setDemandSurge(0);
    setInitialGuess([0,0,0]);
    setMaxIterations(20);
    setTolerance(0.001);
    setOmega(1.25);
    setMethod("gauss-seidel");
  };

  // Safe solution reading
  const activeSolution = iterations.length > 0 ? iterations[iterations.length - 1].x : [0, 0, 0];

  // Diagonal dominance validation
  const checkDiagonalDominance = () => {
    const activeA = matrixA.map((row, rIdx) => 
      row.map((val, cIdx) => (blockedRoutes[rIdx][cIdx] ? 0 : val))
    );
    const rowsStatus = activeA.map((row, i) => {
      const diag = Math.abs(row[i]);
      const sumOthers = row.reduce((sum, val, j) => (i === j ? sum : sum + Math.abs(val)), 0);
      return diag > sumOthers;
    });
    return rowsStatus.every(val => val);
  };

  const isDiagonallyDominant = checkDiagonalDominance();

  return (
    <div className="space-y-6 fade-in animate-fadeIn" id="linear-equations-main-wrapper">
      
      {/* Scenario Tabs for Escenario A vs Escenario F */}
      <div className="flex flex-col sm:flex-row gap-3 p-1.5 bg-slate-950/60 border border-slate-900 rounded-2xl" id="scenario-selector-tabs">
        <button
          onClick={() => {
            setActiveScenario("A");
            handleReset();
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeScenario === "A"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-900/40"
          }`}
          id="btn-scenario-a"
        >
          <Compass className="w-4 h-4" />
          Escenario A: Distribución en Planta (Rutas Estables)
        </button>
        <button
          onClick={() => {
            setActiveScenario("F");
            applyScenarioFPreset("bajo");
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeScenario === "F"
              ? "bg-red-600 text-white shadow-lg shadow-red-500/15"
              : "text-slate-400 hover:text-white hover:bg-slate-900/40"
          }`}
          id="btn-scenario-f"
        >
          <AlertTriangle className="w-4 h-4" />
          Escenario F: Rumores de Desabastecimiento y Pánico
        </button>
      </div>

      {activeScenario === "F" && (
        <div className="bg-gradient-to-br from-red-950/25 to-slate-950/40 border border-red-900/20 p-6 rounded-3xl space-y-4" id="scenario-f-header-panel">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
              <Network className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-red-400 uppercase tracking-widest font-mono">Simulación de Epidemia de Rumores</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Los rumores de desabastecimiento generan compras impulsivas y distorsiones extremas. Compruebe cómo un simple aumento del 5% colapsa el reparto si el sistema está mal condicionado o si las rutas están obstruidas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 pt-1" id="rumor-preset-grid">
            {(["bajo", "medio", "alto", "panico", "artificial"] as const).map((lvl) => {
              const label = {
                bajo: "Rumor Bajo",
                medio: "Rumor Medio",
                alto: "Rumor Alto",
                panico: "Pánico de Compra",
                artificial: "Reducción de Stock"
              }[lvl];
              const desc = {
                bajo: "+5% Demanda, Red Sana",
                medio: "+15% Demanda, Red Sana",
                alto: "+30% Demanda, Planta 2 Obstruida",
                panico: "+50% Demanda, Red Vulnerable",
                artificial: "+40% Demanda, Rutas Caídas"
              }[lvl];
              const isSelected = rumorLevel === lvl;

              return (
                <button
                  key={lvl}
                  onClick={() => applyScenarioFPreset(lvl)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? "bg-red-500/10 border-red-500/40 text-red-350 shadow-md shadow-red-950/20"
                      : "bg-slate-950/40 border-slate-900 text-slate-400 hover:border-slate-800 hover:text-slate-200"
                  }`}
                  id={`btn-preset-${lvl}`}
                >
                  <span className="text-[11px] font-bold tracking-tight block">{label}</span>
                  <span className="text-[9px] text-slate-500 font-mono leading-tight">{desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Simulation Network and Solver Configuration Box */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: INTERACTIVE LOGISTICS NETWORK COMPONENT (7 cols) */}
        <div className="xl:col-span-7 bg-slate-900/40 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between" id="network-visualizer-card">
          <div>
            <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Network className="w-4 h-4 text-blue-500" />
                  Red de Abastecimiento Planta-Mercado
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Monitoree y bloquee rutas de transporte haciendo click en las conexiones. Las líneas discontinuas representan bloqueos totales (coeficiente = 0).
                </p>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-950 border border-slate-850 rounded-lg hover:text-white transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> RESTABLECER RED
              </button>
            </div>

            {/* Interactive Supply Route SVG Canvas */}
            <div className="bg-[#020617] border border-slate-850. rounded-2xl p-4 overflow-hidden relative">
              <div className="absolute top-3 left-3 flex gap-4 text-[9px] font-bold text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-1 bg-blue-500" /> Activo
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-1 border-t-2 border-dashed border-red-500" /> Obstruido / Bloqueado
                </span>
              </div>

              <svg viewBox="0 0 540 260" className="w-full h-auto block select-none">
                {/* SVG Route Paths */}
                {matrixA.map((row, rIdx) => {
                  const x1 = 90;
                  const y1 = 50 + rIdx * 80;
                  return row.map((val, cIdx) => {
                    const x2 = 450;
                    const y2 = 50 + cIdx * 80;
                    const isBlocked = blockedRoutes[rIdx][cIdx];
                    
                    // Bezier control coordinates for sleek curving lines
                    const cx1 = x1 + 150;
                    const cy1 = y1;
                    const cx2 = x2 - 150;
                    const cy2 = y2;
                    const pathString = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

                    return (
                      <g key={`${rIdx}-${cIdx}`} className="group cursor-pointer">
                        {/* Fat invisible guide curve for generous touch target click sizing */}
                        <path
                          d={pathString}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="15"
                          onClick={() => toggleRouteBlock(rIdx, cIdx)}
                          className="hover:stroke-slate-500/10 transition"
                        />
                        {/* Visible path */}
                        <path
                          d={pathString}
                          fill="none"
                          stroke={isBlocked ? "#ef4444" : "#3b82f6"}
                          strokeWidth={isBlocked ? "1.8" : "2"}
                          strokeDasharray={isBlocked ? "5 4" : "none"}
                          strokeOpacity={isBlocked ? "0.6" : "0.35"}
                          onClick={() => toggleRouteBlock(rIdx, cIdx)}
                          className="group-hover:stroke-opacity-80 transition"
                        />
                        {/* Hover information badge (only when path is active) */}
                        <g transform={`translate(${x1 + (x2 - x1)*0.55}, ${y1 + (y2 - y1)*0.5 - 10 + (rIdx - cIdx)*4})`}>
                          <rect
                            x="-22"
                            y="-8"
                            width="44"
                            height="16"
                            rx="4"
                            fill="#090d16"
                            stroke={isBlocked ? "#991b1b" : "#1e3a8a"}
                            strokeWidth="1"
                            className="transition opacity-70 group-hover:opacity-100"
                          />
                          <text
                            textAnchor="middle"
                            y="3"
                            className={`text-[9px] font-mono font-bold ${isBlocked ? "fill-red-400" : "fill-blue-300"}`}
                          >
                            {isBlocked ? "BLOCKED" : `a=${val}`}
                          </text>
                        </g>
                      </g>
                    );
                  });
                })}

                {/* Left side Nodes: Supply Plants */}
                {plantNames.map((name, idx) => {
                  const x = 90;
                  const y = 50 + idx * 80;
                  return (
                    <g key={`plant-${idx}`} className="filter drop-shadow-md">
                      <circle cx={x} cy={y} r="22" fill="#0b1329" stroke="#1d4ed8" strokeWidth="2.5" />
                      <text x={x} y={y - 1} textAnchor="middle" transform="translate(0, 4)" className="text-[11px] font-mono font-black fill-white">
                        P{idx + 1}
                      </text>
                      {/* Name tags */}
                      <text x={x - 28} y={y + 4} textAnchor="end" className="text-[9px] font-mono font-black fill-slate-350 tracking-wider">
                        PLANTA {idx + 1}
                      </text>
                    </g>
                  );
                })}

                {/* Right side Nodes: Demand Zones */}
                {zoneNames.map((name, idx) => {
                  const x = 450;
                  const y = 50 + idx * 80;
                  return (
                    <g key={`zone-${idx}`} className="filter drop-shadow-md">
                      <circle cx={x} cy={y} r="22" fill="#0c111d" stroke="#2563eb" strokeWidth="2.5" />
                      <text x={x} y={y - 1} textAnchor="middle" transform="translate(0, 4)" className="text-[11px] font-mono font-black fill-white">
                        Z{idx + 1}
                      </text>
                      {/* Interactive assigned flows output showing next to each node */}
                      <text x={x + 28} y={y + 4} textAnchor="start" className="text-[10px] font-mono font-black fill-blue-400">
                        {activeSolution[idx] ? `${activeSolution[idx].toFixed(1)} u.` : "Calculando..."}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-500 font-mono font-bold block uppercase tracking-wider">Metodología Activa</span>
              <span className="text-sm font-bold text-slate-200 mt-1 block uppercase font-mono tracking-tight">
                {method === "gauss-seidel" && "Gauss-Seidel [GS]"}
                {method === "jacobi" && "Jacobi Iterative"}
                {method === "sor" && "Relajación SOR"}
                {method === "lu" && "Desocmposición LU"}
                {method === "cg" && "Gradiente Conjugado [CG]"}
              </span>
            </div>
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-500 font-mono font-bold block uppercase tracking-wider">Sensibilidad Condición</span>
              <span className="text-sm font-bold mt-block uppercase font-mono mt-1 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isWellConditioned ? "bg-emerald-400" : "bg-red-400"}`} />
                <span className={isWellConditioned ? "text-emerald-400" : "text-rose-400"}>
                  {isWellConditioned ? "Estable (Sano)" : "Inestable (Sensible)"}
                </span>
              </span>
            </div>
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-500 font-mono font-bold block uppercase tracking-wider">Demanda del Mes (Surge)</span>
              <span className="text-sm font-bold text-blue-400 mt-1 block font-mono">
                {demandSurge >= 0 ? `+${demandSurge}%` : `${demandSurge}%`} Pánico
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REGLAS Y OPCIONES DE RESOLUCION (5 cols) */}
        <div className="xl:col-span-5 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between space-y-6" id="solver-config-card">
          <div className="space-y-4">
            <div className="border-b border-slate-850 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-500" />
                Matemática de Control
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Defina el kernel de resolución y sus márgenes de truncamiento.</p>
            </div>

            {/* Method Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 block font-mono uppercase">Selección de Método</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full text-xs bg-slate-950 border border-slate-850 text-slate-300 rounded-xl p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-semibold outline-none"
              >
                <option value="gauss-seidel">Gauss-Seidel (Iterativo - Convergencia Directa)</option>
                <option value="jacobi">Jacobi (Iterativo - Multiprocesamiento)</option>
                <option value="sor">SOR (Sucesiva Sobre-Relajación con ω)</option>
                <option value="lu">Descomposición LU (Directo - Triangular L y U)</option>
                <option value="cg">Gradiente Conjugado (Krylov - Minimización Residual)</option>
              </select>
            </div>

            {/* SOR Relaxation Factor */}
            {method === "sor" && (
              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-850 animate-fadeIn">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="font-bold text-slate-400 uppercase">Factor de Relajación (ω)</span>
                  <span className="font-bold text-blue-400">{omega.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.95"
                  step="0.05"
                  value={omega}
                  onChange={(e) => setOmega(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                />
                <p className="text-[10px] text-slate-500 leading-normal">
                  *Valores entre 1.0 y 2.0 (Sobre-Relajación) agilizan enormemente la convergencia para matrices simétricas dominantes.
                </p>
              </div>
            )}

            {/* Iterative Configs (only active on non-LU methods) */}
            {method !== "lu" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block font-mono uppercase">Tolerancia (Es)</label>
                  <select
                    value={tolerance}
                    onChange={(e) => setTolerance(parseFloat(e.target.value))}
                    className="w-full text-xs bg-slate-950 border border-slate-850 text-slate-300 rounded-xl p-2.5 focus:border-blue-500 outline-none font-mono"
                  >
                    <option value={0.01}>1% (1e-2)</option>
                    <option value={0.001}>0.1% (1e-3)</option>
                    <option value={0.0001}>0.01% (1e-4)</option>
                    <option value={0.000001}>0.0001% (1e-6)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block font-mono uppercase">Límite Iteraciones</label>
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={maxIterations}
                    onChange={(e) => setMaxIterations(parseInt(e.target.value) || 20)}
                    className="w-full text-xs bg-slate-950 border border-slate-850 text-slate-200 rounded-xl p-2.5 focus:border-blue-500 outline-none font-mono text-right"
                  />
                </div>
              </div>
            )}

            {/* Simulated Demand Surge Multiplier Input */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="font-bold text-slate-400 uppercase">Simulación de Sobredemanda (Pánico)</span>
                <span className="font-bold text-blue-400 font-mono">
                  {demandSurge >= 0 ? `+${demandSurge}%` : `${demandSurge}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={demandSurge}
                onChange={(e) => setDemandSurge(parseInt(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
              />
              <p className="text-[10px] font-medium text-slate-500 leading-normal leading-relaxed">
                Aumenta el vector de demandas mínimas de los mercados simulando el pánico o el desabastecimiento repentino.
              </p>
            </div>
          </div>

          {/* Diagonal Dominance Alert Badge */}
          <div className="pt-2">
            {isDiagonallyDominant ? (
              <div className="flex items-start gap-2 bg-emerald-950/20 text-emerald-400 p-3.5 rounded-2xl text-xs border border-emerald-900/40">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <span className="font-mono text-[9px] block uppercase font-bold tracking-wider text-emerald-300">DIAGONAL DOMINANTE [SEGURA]</span>
                  El módulo de coeficientes confirma convergencia incondicional para métodos GS y Jacobi.
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 bg-amber-950/20 text-amber-500 p-3.5 rounded-2xl text-xs border border-amber-900/40">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <span className="font-mono text-[9px] block uppercase font-bold tracking-wider text-amber-300">DIAGONAL NO DOMINANTE [RIESGO]</span>
                  Tenga calma si el método iterativo oscila. Los solucionadores directos como LU siguen siendo inmunes a esto.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ERROR ANNOUNCEMENTS BOX */}
      {errorMsg && (
        <div className="bg-rose-950/20 text-rose-400 border border-rose-900/50 p-4 rounded-2xl text-xs flex gap-3 animate-pulse" id="error-alert">
          <AlertTriangle className="w-5 h-5 text-rose-450 shrink-0" />
          <div>
            <span className="font-bold block uppercase tracking-wider text-[10px] text-rose-300">Colapso Matemático del Kernel</span>
            {errorMsg}
          </div>
        </div>
      )}

      {/* DYNAMIC SOLVED VECTORS SUMMARY ROW */}
      {!errorMsg && (
        <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-3xl" id="solved-results-panel">
          <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-4 flex-wrap gap-2">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block font-mono">Resumen de Asignación Óptima resultante</span>
              <h4 className="text-sm font-bold text-white mt-1">Estimación de Envío por Destino (Vector X)</h4>
            </div>
            <div className="bg-slate-950 border border-slate-800 text-[10px] text-slate-400 font-mono px-3 py-1 rounded-lg flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${converged ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
              {converged ? `ESTABLE: Convergencia en ${iterations.length} pasos` : "DIVERGENCIA DETECTADA"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {zoneNames.map((name, idx) => {
              const val = activeSolution[idx];
              const baseDemand = vectorB[idx];
              const calculatedPct = baseDemand > 0 ? (val / baseDemand) * 100 : 100;
              return (
                <div key={idx} className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-wider block">{name}</span>
                    <span className="text-3xl font-black font-mono mt-1 text-blue-400 block tracking-tight">
                      {val ? val.toFixed(4) : "0.00"} <span className="text-[10px] font-sans text-slate-450 font-normal">toneladas</span>
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Base sin pánico:</span>
                    <span className="font-mono text-slate-300 font-bold">${baseDemand} unids</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SCIENTIFIC ANSWERS REPORT PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="solution-report-bento">
        {/* Bento Question Cards (7 columns) */}
        <div className="lg:col-span-7 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 flex flex-col space-y-4 justify-between" id="bento-questions-pane">
          <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
            <Info className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">
              {activeScenario === "A" 
                ? "Reporte Técnico del Escenario A (Abastecimiento)" 
                : "Reporte Técnico de Vulnerabilidad: Escenario F (Rumores y Pánico)"}
            </h3>
          </div>

          <div className="space-y-4 text-xs flex-1 my-1">
            {activeScenario === "A" ? (
              <>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1">
                    1. ¿Cuánto debe enviarse a cada zona para balancear el consumo?
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    De acuerdo con el modelo, para satisfacer las demandas actuales corregidas por la sobredemanda de pánico ({demandSurge}%), el flujo óptimo calculado es:
                    <strong className="block text-blue-400 font-mono mt-1 w-full text-center text-xs">
                      {zoneNames[0]}: {activeSolution[0].toFixed(3)} u. | {zoneNames[1]}: {activeSolution[1].toFixed(3)} u. | {zoneNames[2]}: {activeSolution[2].toFixed(3)} u.
                    </strong>
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1">
                    2. ¿Qué pasa si una ruta se bloquea? (Simulando bloqueo en la red)
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    Cuando obstruye un camino en el visualizador, el coeficiente de enlace Planta-Zona correspondiente A(i,j) se reduce a **0**, anulando el despacho directo. 
                    Si se bloquea un término ajeno a la diagonal, el sistema compensa recargando los despachos de plantas alternas. Sin embargo, si se obstruye un enlace diagonal principal (ej. A[1][1], A[2][2] o A[3][3]), o si demasiadas rutas caen, el sistema queda <span className="font-bold text-rose-400">indeterminado / singular</span> (pérdida de rango), provocando que los algoritmos iterativos colapsen matemáticamente.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1">
                    3. ¿Qué zona queda más afectada antes oscilaciones en la demanda?
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    Evaluando la matriz de perturbación incremental, la zona con la huella de variabilidad logística acumulada más severa es la <strong className="text-blue-400">{mostAffectedZone}</strong> (Tasa de dispersión de flujos: <span className="font-mono text-red-400 font-black">{Math.max(...zonalSensitivity).toFixed(2)}</span>). Cambios mínimos en su mercado exigen reestructurar radicalmente los camiones que salen de todas las plantas para equilibrar el abastecimiento.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1">
                    4. ¿El sistema es estable o mal condicionado (altamente sensible)?
                  </h4>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    {isWellConditioned ? (
                      <span>
                        El sistema es <span className="text-emerald-400 font-bold">BIEN CONDICIONADO / ESTABLE</span>. 
                        El multiplicador de error (factor de sensibilidad de escala: <strong className="text-blue-300 font-mono">{stabilityFactor.toFixed(3)}</strong>) se sitúa por debajo de 3.5. Esto garantiza que pequeños errores de despacho físico o de medición logística no se amplificarán descontroladamente en el resultado final, permitiendo operaciones seguras.
                      </span>
                    ) : (
                      <span>
                        El sistema se encuentra <span className="text-red-400 font-bold">MAL CONDICIONADO / INESTABLE</span> (sensibilidad residual alta: <strong className="text-red-400 font-mono">{stabilityFactor.toFixed(3)}</strong>x).
                        Esto significa que cualquier pequeña alteración en los requerimientos de entrega provocará fluctuaciones extremas y erráticas en los envíos de las plantas, complicando la logística.
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1">
                    5. ¿La solución cambia mucho si la demanda aumenta?
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans">
                    Debido a la naturaleza lineal del sistema de ecuaciones ($A x = b$), el escalamiento en la demanda promedio genera un escalonamiento perfectamente proporcional en los flujos asignados si no hay bloqueos. Sin embargo, al superponer bloqueos de rutas, el agotamiento logístico se acentúa exponencialmente para las plantas sanas sobrevivientes.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1">
                    1. ¿Qué pasa si la demanda aumenta solo un 5%?
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    {getConditionNumberVal().cond > 40 ? (
                      <span>
                        Dado que la red posee un número de condición elevado (<strong className="text-red-400">{getConditionNumberVal().cond.toFixed(1)}</strong>), un alza leve del 5% en la demanda (de {vectorB.map(b=>b.toFixed(0)).join(", ")} a {vectorB.map(b=>(b*1.05).toFixed(0)).join(", ")}) genera 
                        una alteración desértica en la solución, amplificando la discrepancia de envío hasta en un <strong className="text-red-400 font-mono">{(stabilityFactor * 5).toFixed(2)}%</strong>. ¡Esto significa caos operativo inmediato!
                      </span>
                    ) : (
                      <span>
                        En la red robusta actual (Cond: <strong className="text-emerald-400">{getConditionNumberVal().cond.toFixed(1)}</strong>), el aumento del 5% se traduce de forma totalmente predecible en un alza sutil y proporcional del <strong className="text-emerald-400 font-mono">{(stabilityFactor * 5).toFixed(2)}%</strong> en los requerimientos de despacho de las plantas. El abastecimiento resiste de forma segura.
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1">
                    2. ¿La solución de reparto cambia poco o demasiado?
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    {getConditionNumberVal().cond > 40 ? (
                      <span>
                        <strong className="text-red-450 text-red-400">CAMBIA DEMASIADO / EXTREMO</strong>. En el panel de resultados, se observa cómo el flujo de algunas plantas se contrae drásticamente o se vuelve hipotéticamente negativo, mientras que otra planta se sobrecarga artificialmente. Esto refleja que los transportistas tendrían que realizar desvíos inviables en el mundo real debido a la redundancia de las plantas.
                      </span>
                    ) : (
                      <span>
                        <strong className="text-emerald-400">CAMBIA POCO / SEGURIDAD ESTABLE</strong>. Los despachos totales de cada planta siguen una trayectoria suave y directamente rastreable al cambio en los mercados, indicando que el departamento de logística puede confiar en la estabilidad del modelo.
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1">
                    3. ¿El sistema es estable o mal condicionado?
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    El número de condición de la red $Cond(A)_1$ es <strong className="text-blue-400 font-mono">{getConditionNumberVal().cond === Infinity ? "Infinity (Singular)" : getConditionNumberVal().cond.toFixed(3)}</strong>. 
                    {getConditionNumberVal().cond > 40 ? (
                      <span className="text-red-400 font-bold block mt-1">
                        ⚠️ MAL CONDICIONADO. Los perfiles de abastecimiento de las plantas son casi idénticos (linealmente interdependientes), haciendo al sistema sumamente vulnerable a rumores y compras nerviosas.
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold block mt-1">
                        ✓ ESTABLE / BIEN CONDICIONADO. Los perfiles de entrega de las plantas son claramente independientes y la diagonal es fuertemente dominante, mitigando el impacto de rumores del mercado.
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1">
                    4. ¿Cómo afecta el rumor al abastecimiento general?
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans">
                    Los rumores de escasez inducen pánico de compra aumentando la demanda ficticiamente. Además, el ruido de información a menudo obstruye rutas (obstáculos en el SVG). Matemáticamente, esto destruye la dominancia diagonal de la matriz, reduciendo los pivotes en la descomposición LU y forzando a que solvers iterativos (Gauss-Seidel, Jacobi, SOR) requieran más iteraciones para converger o diverjan por completo.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1">
                    5. ¿Qué zona o mercado se vuelve más vulnerable ante el pánico?
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    De acuerdo con el análisis de perturbación del mes, la región más vulnerable es la <span className="font-bold text-red-400">{mostAffectedZone}</span>, acumulando un índice de variabilidad extrema de <span className="font-mono text-red-400 font-bold">{Math.max(...zonalSensitivity).toFixed(2)}</span>. Esto indica que cualquier cambio sutil en esta zona requerirá una reestructuración catastrófica de las existencias en todas las plantas de acopio.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* DETAILS STEPS PANEL / CONVERGENCE MONITORS (5 columns) */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[580px]" id="step-by-step-convergence-card">
          
          {/* TAB / CONTROL BAR HEADER */}
          <div className="p-4 bg-slate-900/50 border-b border-slate-850 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 font-mono">Kernel Output Interno</h3>
              <p className="text-[10px] text-slate-500 font-mono">
                {method === "lu" ? "Descomposición triangular directa" : `k = ${iterations.length} iteraciones procesadas`}
              </p>
            </div>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>

          {/* INTERNAL DATA DISPLAY AREA */}
          <div className="overflow-auto flex-grow font-mono text-[10px] scrollbar-thin">
            {method === "lu" && luDetails ? (
              // LU Decomposition specialized interface
              <div className="p-4 space-y-4 text-slate-300">
                <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-widest border-b border-slate-900 pb-1">Matrices de Factorización</span>
                
                {/* L matrix layout */}
                <div className="space-y-1.5">
                  <span className="text-blue-400 font-bold">Matriz Inferior [L]:</span>
                  <div className="bg-slate-900 p-2.5 rounded-lg text-[11px] grid grid-cols-1 gap-1 border border-slate-850">
                    {luDetails.L.map((row, idx) => (
                      <div key={idx} className="flex justify-around">
                        <span>{row[0].toFixed(4)}</span>
                        <span>{row[1].toFixed(4)}</span>
                        <span>{row[2].toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* U matrix layout */}
                <div className="space-y-1.5">
                  <span className="text-blue-400 font-bold">Matriz Superior [U]:</span>
                  <div className="bg-slate-900 p-2.5 rounded-lg text-[11px] grid grid-cols-1 gap-1 border border-slate-850">
                    {luDetails.U.map((row, idx) => (
                      <div key={idx} className="flex justify-around">
                        <span>{row[0].toFixed(4)}</span>
                        <span>{row[1].toFixed(4)}</span>
                        <span>{row[2].toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Solving process substitution tracing step-by-step */}
                <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-widest border-b border-slate-900 pt-3 pb-1">Proceso de Sustitución</span>
                <div className="space-y-2 bg-[#020617] p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <div>
                    <span className="text-slate-400 block font-bold">1. Sustitución Adelante (L y = b):</span>
                    <div className="flex justify-around text-xs text-amber-400 font-bold bg-slate-950 p-1.5 rounded mt-1">
                      <span>y1: {luDetails.y[0].toFixed(2)}</span>
                      <span>y2: {luDetails.y[1].toFixed(2)}</span>
                      <span>y3: {luDetails.y[2].toFixed(2)}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">2. Sustitución Atrás (U x = y):</span>
                    <div className="flex justify-around text-xs text-emerald-400 font-bold bg-slate-950 p-1.5 rounded mt-1">
                      <span>x1: {luDetails.x[0].toFixed(3)}</span>
                      <span>x2: {luDetails.x[1].toFixed(3)}</span>
                      <span>x3: {luDetails.x[2].toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Iterative table list (Gauss-Seidel, Jacobi, SOR, CG)
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#020617] text-slate-500 sticky top-0 border-b border-slate-850">
                  <tr>
                    <th className="p-3 w-10 text-center">k</th>
                    <th className="p-3">X1 (Z1)</th>
                    <th className="p-3">X2 (Z2)</th>
                    <th className="p-3">X3 (Z3)</th>
                    <th className="p-3 text-right">E_max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {iterations.map((row) => (
                    <tr key={row.iteration} className="hover:bg-slate-900/30 transition">
                      <td className="p-3 text-center text-slate-500 bg-slate-900/10">{row.iteration}</td>
                      <td className="p-3 text-slate-300">{row.x[0].toFixed(4)}</td>
                      <td className="p-3 text-slate-300">{row.x[1].toFixed(4)}</td>
                      <td className="p-3 text-slate-300">{row.x[2].toFixed(4)}</td>
                      <td className={`p-3 text-right font-bold ${row.maxError < tolerance ? "text-emerald-400" : "text-amber-500"}`}>
                        {method === "cg" ? `${row.maxError.toFixed(5)} (Res)` : `${row.maxError.toFixed(5)}%`}
                      </td>
                    </tr>
                  ))}
                  {iterations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 font-sans">
                        Falta de datos. Verifique que no existan bloqueos absolutos insolubles.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer decoration */}
          {!errorMsg && iterations.length > 0 && (
            <div className="p-4 bg-slate-900/40 border-t border-slate-850 flex justify-between items-center text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold shrink-0">
              <span>Resolución de Matrices</span>
              <span className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-blue-500" />
                Matemáticamente Correcto
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
