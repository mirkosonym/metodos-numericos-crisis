/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Play, 
  RotateCcw, 
  HelpCircle, 
  TrendingUp, 
  Info, 
  AlertCircle,
  Binary, 
  Flame, 
  Users, 
  Coins, 
  Zap, 
  GitCommit, 
  Compass, 
  BarChart4, 
  Calculator,
  SquareEqual,
  BookOpen
} from "lucide-react";
import { RootIteration } from "../types";

type ModelId = "budget" | "fuel" | "social";

export default function RootsModule() {
  // Active Model selection:
  // "budget" -> Punto de colapso presupuestario familiar
  // "fuel" -> Tasa de reposición crítica de combustible
  // "social" -> Umbral de opinión social y masificación
  const [activeModel, setActiveModel] = useState<ModelId>("budget");

  // ==========================================
  // MODEL 1 DEFINITION: BUDGET DEPRECIATION
  // f(t) = A * exp(B * t) + C * t^2 - I
  // ==========================================
  const [paramA, setParamA] = useState<number>(20.0);   // Cost coefficient
  const [paramB, setParamB] = useState<number>(0.08);   // Exponential growth factor
  const [paramC, setParamC] = useState<number>(1.2);    // Quadratic logistics factor
  const [paramI, setParamI] = useState<number>(450.0);  // Family Income/Reservas limit

  // ==========================================
  // MODEL 2 DEFINITION: CRITICAL FUEL REPLENISHMENT
  // f(r) = Q * (1 + Theta * exp(-Gamma * r)) - r
  // ==========================================
  const [fuelQ, setFuelQ] = useState<number>(14.0);       // Constant daily demand (cisterns)
  const [fuelTheta, setFuelTheta] = useState<number>(2.2); // Panic multiplier
  const [fuelGamma, setFuelGamma] = useState<number>(0.12); // Replenishment attenuation parameter

  // ==========================================
  // MODEL 3 DEFINITION: SOCIAL OPINION TIPPING POINT
  // f(p) = Alpha * p^3 - Beta * p^2 + Gamma * p - Delta
  // ==========================================
  const [socialAlpha, setSocialAlpha] = useState<number>(1.0); // Cubic friction factor
  const [socialBeta, setSocialBeta] = useState<number>(8.05);  // Propagation / Infection rate
  const [socialGamma, setSocialGamma] = useState<number>(15.0); // Institutional damping factor
  const [socialDelta, setSocialDelta] = useState<number>(6.2);   // External frustration pressure

  // ==========================================
  // SOLVER GENERAL CONTROLS
  // ==========================================
  const [tolerance, setTolerance] = useState<number>(0.0001);
  const [maxIter, setMaxIter] = useState<number>(25);

  // Solvers Seeds (Dependent on model select, automatically swapped with defaults to keep them in region of convergence)
  const [bisA, setBisA] = useState<number>(0.0);
  const [bisB, setBisB] = useState<number>(30.0);
  const [newtX0, setNewtX0] = useState<number>(10.0);
  const [secX0, setSecX0] = useState<number>(5.0);
  const [secX1, setSecX1] = useState<number>(15.0);

  // Set standard seeds on tab change to guarantee safe convergence for corresponding equations
  useEffect(() => {
    if (activeModel === "budget") {
      setBisA(0.0);
      setBisB(30.0);
      setNewtX0(10.0);
      setSecX0(5.0);
      setSecX1(15.0);
    } else if (activeModel === "fuel") {
      setBisA(0.0);
      setBisB(40.0);
      setNewtX0(15.0);
      setSecX0(10.0);
      setSecX1(25.0);
    } else if (activeModel === "social") {
      setBisA(0.0);
      setBisB(5.0);
      setNewtX0(1.0);
      setSecX0(0.5);
      setSecX1(1.5);
    }
  }, [activeModel]);

  // ==========================================
  // MODEL MATH EVALUATORS (f and df)
  // ==========================================
  const evaluateF = (x: number): number => {
    switch (activeModel) {
      case "budget":
        // f(t) = A*e^(B*t) + C*t^2 - I
        return paramA * Math.exp(paramB * x) + paramC * x * x - paramI;
      case "fuel":
        // f(r) = Q * (1 + Theta * e^(-Gamma * r)) - r
        return fuelQ * (1.0 + fuelTheta * Math.exp(-fuelGamma * x)) - x;
      case "social":
        // f(phi) = Alpha * phi^3 - Beta * phi^2 + Gamma * phi - Delta
        return socialAlpha * Math.pow(x, 3) - socialBeta * Math.pow(x, 2) + socialGamma * x - socialDelta;
      default:
        return 0;
    }
  };

  const evaluateDf = (x: number): number => {
    switch (activeModel) {
      case "budget":
        // f'(t) = A * B * e^(B*t) + 2 * C * t
        return paramA * paramB * Math.exp(paramB * x) + 2 * paramC * x;
      case "fuel":
        // f'(r) = -Q * Theta * Gamma * e^(-Gamma * r) - 1
        return -fuelQ * fuelTheta * fuelGamma * Math.exp(-fuelGamma * x) - 1.0;
      case "social":
        // f'(phi) = 3 * Alpha * phi^2 - 2 * Beta * phi + Gamma
        return 3 * socialAlpha * Math.pow(x, 2) - 2 * socialBeta * x + socialGamma;
      default:
        return 1;
    }
  };

  // Solver iteration list outcomes
  const [bisectionIters, setBisectionIters] = useState<RootIteration[]>([]);
  const [newtonIters, setNewtonIters] = useState<RootIteration[]>([]);
  const [secantIters, setSecantIters] = useState<RootIteration[]>([]);

  // Derived Roots
  const [bisRoot, setBisRoot] = useState<number | null>(null);
  const [newtRoot, setNewtRoot] = useState<number | null>(null);
  const [secRoot, setSecRoot] = useState<number | null>(null);

  // Reset helper
  const handleResetParameters = () => {
    if (activeModel === "budget") {
      setParamA(20.0);
      setParamB(0.08);
      setParamC(1.2);
      setParamI(450.0);
      setBisA(0.0);
      setBisB(30.0);
      setNewtX0(10.0);
      setSecX0(5.0);
      setSecX1(15.0);
    } else if (activeModel === "fuel") {
      setFuelQ(14.0);
      setFuelTheta(2.2);
      setFuelGamma(0.12);
      setBisA(0.0);
      setBisB(40.0);
      setNewtX0(15.0);
      setSecX0(10.0);
      setSecX1(25.0);
    } else if (activeModel === "social") {
      setSocialAlpha(1.0);
      setSocialBeta(8.05);
      setSocialGamma(15.0);
      setSocialDelta(6.2);
      setBisA(0.0);
      setBisB(5.0);
      setNewtX0(1.0);
      setSecX0(0.5);
      setSecX1(1.5);
    }
  };

  // ==========================================
  // CORE CALCULATION LOOP
  // ==========================================
  const runRootsCalculations = () => {
    // 1. BISECTION METHOD
    const bisList: RootIteration[] = [];
    let bLeft = bisA;
    let bRight = bisB;
    let bRootVal: number | null = null;

    if (evaluateF(bLeft) * evaluateF(bRight) <= 0) {
      let xr = bLeft;
      let oldXr = xr;
      for (let i = 1; i <= maxIter; i++) {
        xr = (bLeft + bRight) / 2;
        const err = i === 1 ? 100 : Math.abs((xr - oldXr) / xr) * 100;
        const fxr = evaluateF(xr);

        bisList.push({
          iteration: i,
          x0: bLeft,
          x1: bRight,
          xr,
          fxr,
          error: err
        });

        if ((i > 1 && err < tolerance) || Math.abs(fxr) < 1e-12) {
          bRootVal = xr;
          break;
        }

        if (evaluateF(bLeft) * fxr < 0) {
          bRight = xr;
        } else {
          bLeft = xr;
        }
        oldXr = xr;
        bRootVal = xr; // fallback
      }
    }
    setBisectionIters(bisList);
    setBisRoot(bRootVal);

    // 2. NEWTON-RAPHSON METHOD
    const newtList: RootIteration[] = [];
    let nCurr = newtX0;
    let nRootVal: number | null = nCurr;

    for (let i = 1; i <= maxIter; i++) {
      const fn = evaluateF(nCurr);
      const dfn = evaluateDf(nCurr);

      if (Math.abs(dfn) < 1e-12) {
        break; // derivative too small (colapso de pendiente)
      }

      const nNext = nCurr - fn / dfn;
      const err = i === 1 ? Math.abs(nNext - nCurr) / (Math.abs(nNext) || 1) * 100 : Math.abs((nNext - nCurr) / nNext) * 100;

      newtList.push({
        iteration: i,
        x0: nCurr,
        xr: nNext,
        fxr: evaluateF(nNext),
        error: err
      });

      if ((i > 1 && err < tolerance) || Math.abs(evaluateF(nNext)) < 1e-12) {
        nRootVal = nNext;
        break;
      }
      nCurr = nNext;
      nRootVal = nNext;
    }
    setNewtonIters(newtList);
    setNewtRoot(nRootVal);

    // 3. SECANT METHOD
    const secList: RootIteration[] = [];
    let sPrev = secX0;
    let sCurr = secX1;
    let sRootVal: number | null = sCurr;

    for (let i = 1; i <= maxIter; i++) {
      const fPrev = evaluateF(sPrev);
      const fCurr = evaluateF(sCurr);

      if (Math.abs(fCurr - fPrev) < 1e-12) {
        break; // break to avoid flat slope division by zero
      }

      const sNext = sCurr - (fCurr * (sCurr - sPrev)) / (fCurr - fPrev);
      const err = i === 1 ? Math.abs(sNext - sCurr) / (Math.abs(sNext) || 1) * 100 : Math.abs((sNext - sCurr) / sNext) * 100;

      secList.push({
        iteration: i,
        x0: sPrev,
        x1: sCurr,
        xr: sNext,
        fxr: evaluateF(sNext),
        error: err
      });

      if ((i > 1 && err < tolerance) || Math.abs(evaluateF(sNext)) < 1e-12) {
        sRootVal = sNext;
        break;
      }

      sPrev = sCurr;
      sCurr = sNext;
      sRootVal = sNext;
    }
    setSecantIters(secList);
    setSecRoot(sRootVal);
  };

  useEffect(() => {
    runRootsCalculations();
  }, [
    activeModel,
    paramA, paramB, paramC, paramI,
    fuelQ, fuelTheta, fuelGamma,
    socialAlpha, socialBeta, socialGamma, socialDelta,
    tolerance, maxIter,
    bisA, bisB, newtX0, secX0, secX1
  ]);

  // ==========================================
  // EMPIRICAL CONVERGENCE ORDER ESTIMATOR
  // e_k = |x_k - x*|, fits log(e_next) ~ p * log(e_curr)
  // ==========================================
  const computeEmpiricalP = (iters: RootIteration[], finalRoot: number | null): number | null => {
    if (!finalRoot || iters.length < 4) return null;
    const errors = iters.map(it => Math.abs(it.xr - finalRoot));
    
    const ratios: number[] = [];
    for (let i = 1; i < errors.length - 1; i++) {
      const ePrev = errors[i - 1];
      const eCurr = errors[i];
      const eNext = errors[i + 1];

      // only analyze when values are cleanly going down and not near machine double limit limit
      if (ePrev > 1e-11 && eCurr > 1e-12 && eNext > 1e-13 && ePrev > eCurr && eCurr > eNext) {
        const r1 = eNext / eCurr;
        const r2 = eCurr / ePrev;
        if (r1 > 0 && r2 > 0 && r2 !== 1) {
          const valP = Math.log(r1) / Math.log(r2);
          if (valP > 0.4 && valP < 3.2) {
            ratios.push(valP);
          }
        }
      }
    }
    if (ratios.length === 0) return null;
    return ratios[ratios.length - 1]; // return the latest clean estimated coefficient index
  };

  const pBisection = computeEmpiricalP(bisectionIters, bisRoot);
  const pNewton = computeEmpiricalP(newtonIters, newtRoot);
  const pSecant = computeEmpiricalP(secantIters, secRoot);

  // Active general root for visual coordinate charts
  const activePlotRoot = newtRoot !== null ? newtRoot : (bisRoot !== null ? bisRoot : (secRoot !== null ? secRoot : 15));

  // Determine dynamic plot range depending on the active model context
  let chartXMin = 0;
  let chartXMax = 30;
  let unitLabel = "";

  if (activeModel === "budget") {
    chartXMin = 0;
    chartXMax = 30;
    unitLabel = "días";
  } else if (activeModel === "fuel") {
    chartXMin = 0;
    chartXMax = 40;
    unitLabel = "cisternas";
  } else if (activeModel === "social") {
    chartXMin = 0.0;
    chartXMax = 5.0;
    unitLabel = "índice";
  }

  // Generate gorgeous responsive SVG chart parameters
  const chartPoints: { x: number; y: number }[] = [];
  const svgTotalPoints = 60;
  const plotStep = (chartXMax - chartXMin) / svgTotalPoints;

  for (let i = 0; i <= svgTotalPoints; i++) {
    const px = chartXMin + i * plotStep;
    chartPoints.push({ x: px, y: evaluateF(px) });
  }

  const yValues = chartPoints.map(p => p.y);
  const rawYMin = Math.min(...yValues, -50);
  const rawYMax = Math.max(...yValues, 50);
  
  // symmetric padding to avoid clipping
  const yMin = rawYMin - Math.abs(rawYMin) * 0.15;
  const yMax = rawYMax + Math.abs(rawYMax) * 0.15;

  // SVG dimensions
  const svgW = 600;
  const svgH = 260;
  const margin = { top: 25, right: 35, bottom: 40, left: 60 };

  const getSvgX = (valX: number) => {
    return margin.left + ((valX - chartXMin) / (chartXMax - chartXMin)) * (svgW - margin.left - margin.right);
  };

  const getSvgY = (valY: number) => {
    return margin.top + (1 - (valY - yMin) / (yMax - yMin)) * (svgH - margin.top - margin.bottom);
  };

  // Generate SVG curve path
  let curvePathD = "";
  if (chartPoints.length > 0) {
    curvePathD = `M ${getSvgX(chartPoints[0].x)} ${getSvgY(chartPoints[0].y)} ` + 
      chartPoints.slice(1).map(p => `L ${getSvgX(p.x)} ${getSvgY(p.y)}`).join(" ");
  }

  // horizontal baseline height
  const zeroYLine = getSvgY(0);

  // ==========================================
  // CRITICAL ANALYSIS SENSITIVITY METHOD (Newton-Raphson Seed Trial)
  // ==========================================
  const getSeedSensitivityTrials = () => {
    const stepSize = activeModel === "social" ? 0.8 : 8;
    const trials = [newtX0 - stepSize, newtX0, newtX0 + stepSize];
    return trials.map(seed => {
      let tempX = seed;
      let converged = false;
      let steps = 0;
      for (let k = 0; k < maxIter; k++) {
        const fn = evaluateF(tempX);
        const dfn = evaluateDf(tempX);
        if (Math.abs(dfn) < 1e-12) {
          break;
        }
        const nextX = tempX - fn / dfn;
        const err = Math.abs((nextX - tempX) / (nextX || 1)) * 100;
        if (err < tolerance || Math.abs(evaluateF(nextX)) < 1e-12) {
          converged = true;
          tempX = nextX;
          steps = k + 1;
          break;
        }
        tempX = nextX;
        steps = k + 1;
      }
      return {
        seed,
        converged,
        steps,
        root: converged ? tempX : null
      };
    });
  };

  const seedTrials = getSeedSensitivityTrials();

  return (
    <div className="space-y-6 fade-in animate-fadeIn" id="esc-e-roots-main-container">
      
      {/* MODEL TITLE AND TAB SELECTORS */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4" id="roots-tabs-and-intro">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="p-1 px-2.5 rounded-full text-[10px] font-black uppercase text-blue-400 bg-blue-500/15 border border-blue-500/30 font-mono tracking-widest leading-none">
              REVOLUCIÓN NO LINEAL • RAÍCES DE ECUACIONES
            </span>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
              <Binary className="w-6 h-6 text-blue-500 shrink-0" />
              Escenario E • Umbrales Críticos de Abastecimiento
            </h1>
            <p className="text-xs text-slate-400 max-w-4xl leading-relaxed">
              Resuelva computacionalmente tres modelos críticos de vulnerabilidad de recursos mediante solvers iterativos de alta precisión: <strong>Bisección</strong>, <strong>Newton-Raphson</strong> y <strong>Secante</strong>. Modifique coeficientes físicos en tiempo real y evalúe la velocidad, sensibilidad y orden de convergencia experimentalmente.
            </p>
          </div>
          <button
            onClick={handleResetParameters}
            className="self-start lg:self-center flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-300 bg-slate-950 hover:bg-slate-900 rounded-xl transition border border-slate-850 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-450" /> Reestablecer Parámetros
          </button>
        </div>

        {/* THREE CHANNELS MODELS IN SHORTCUTS TAB */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2" id="roots-category-tab-row">
          
          {/* TAB 1: BUDGET DEFICIT */}
          <button
            onClick={() => setActiveModel("budget")}
            className={`p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
              activeModel === "budget"
                ? "bg-gradient-to-br from-blue-950/40 via-blue-900/10 to-transparent border-blue-500/60"
                : "bg-slate-950/60 border-slate-850/80 hover:border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 block shrink-0">
                <Coins className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xs font-black text-white leading-tight uppercase">Quiebre Familiar</h3>
                <span className="text-[9px] text-blue-400 block font-mono font-bold">Costo Acumulado vs Ingreso</span>
              </div>
            </div>
            <p className="text-[10.5px] text-slate-450 leading-relaxed line-clamp-2">
              Encuentra el día exacto de desabastecimiento regional en el que los gastos acumulados superan las reservas de contingencia.
            </p>
          </button>

          {/* TAB 2: FUEL REPLENISHMENT */}
          <button
            onClick={() => setActiveModel("fuel")}
            className={`p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
              activeModel === "fuel"
                ? "bg-gradient-to-br from-emerald-950/40 via-emerald-900/10 to-transparent border-emerald-500/60"
                : "bg-slate-950/60 border-slate-850/80 hover:border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-405 block shrink-0">
                <Flame className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xs font-black text-white leading-tight uppercase">Suministro Crítico</h3>
                <span className="text-[9px] text-emerald-400 block font-mono font-bold">Demanda de Pánico y Combustible</span>
              </div>
            </div>
            <p className="text-[10.5px] text-slate-450 leading-relaxed line-clamp-2">
              Determina la frecuencia crítica de llegada de cisternas que aplaca las compras desesperadas y estabiliza el stock municipal.
            </p>
          </button>

          {/* TAB 3: SOCIAL OPINION INSTABILITY */}
          <button
            onClick={() => setActiveModel("social")}
            className={`p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
              activeModel === "social"
                ? "bg-gradient-to-br from-purple-950/40 via-purple-900/10 to-transparent border-purple-500/60"
                : "bg-slate-950/60 border-slate-850/80 hover:border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 block shrink-0">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xs font-black text-white leading-tight uppercase">Umbral de Opinión</h3>
                <span className="text-[9px] text-purple-400 block font-mono font-bold">Bifurcación y Masificación Social</span>
              </div>
            </div>
            <p className="text-[10.5px] text-slate-450 leading-relaxed line-clamp-2">
              Modelamiento de la masa crítica ciudadana. Identifica la transición donde la disconformidad se contagia y rompe el orden cívico.
            </p>
          </button>
        </div>
      </div>

      {/* PARAMETERS AND GRAPHICS INTERACTION SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="roots-workspace-panels">
        
        {/* LEFT COLUMN: PARAMETER SLIDERS AND SOLVER SEEDS */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          
          {/* SLIDERS CONTROLS AND DISPLAY OF ACTIVE EQUATION */}
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
            
            {/* MATHEMATICAL EQUATION FORMULA DISPLAY */}
            <div className="border-b border-slate-850 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Formulación de la Ecuación del Modelo
              </span>
              <div className="bg-slate-950/90 text-sm font-mono border border-slate-850 p-3 rounded-2xl text-center select-none text-blue-400 mt-2">
                {activeModel === "budget" && (
                  <span>
                    f(t) = <strong className="text-white font-mono">{paramA.toFixed(1)}</strong>e<sup><strong className="text-white font-mono">{paramB.toFixed(3)}</strong>t</sup> + <strong className="text-white font-mono">{paramC.toFixed(2)}</strong>t² - <strong className="text-white font-mono">{paramI.toFixed(0)}</strong> = 0
                  </span>
                )}
                {activeModel === "fuel" && (
                  <span>
                    f(r) = <strong className="text-white font-mono">{fuelQ.toFixed(1)}</strong>(1 + <strong className="text-white font-mono">{fuelTheta.toFixed(2)}</strong>e<sup>-<strong className="text-white font-mono">{fuelGamma.toFixed(3)}</strong>r</sup>) - r = 0
                  </span>
                )}
                {activeModel === "social" && (
                  <span>
                    f(φ) = <strong className="text-white font-mono">{socialAlpha.toFixed(2)}</strong>φ³ - <strong className="text-white font-mono">{socialBeta.toFixed(2)}</strong>φ² + <strong className="text-white font-mono">{socialGamma.toFixed(1)}</strong>φ - <strong className="text-white font-mono">{socialDelta.toFixed(2)}</strong> = 0
                  </span>
                )}
              </div>
            </div>

            {/* DYNAMIC PARAMETER SLIDERS */}
            <div className="space-y-4 text-xs" id="group-sliders-inputs">
              
              {/* SLIDERS CASE 1: BUDGET BREAK */}
              {activeModel === "budget" && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Sustento Básico Diario Inicial (A):</span>
                      <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-850">{paramA.toFixed(1)} Bs</span>
                    </div>
                    <input
                      type="range"
                      min="5.0"
                      max="100.0"
                      step="2.5"
                      value={paramA}
                      onChange={(e) => setParamA(parseFloat(e.target.value) || 20.0)}
                      className="w-full accent-blue-500 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Tasa Exponencial de Escasez (B):</span>
                      <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-850">{(paramB * 100).toFixed(1)}% / día</span>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="0.25"
                      step="0.01"
                      value={paramB}
                      onChange={(e) => setParamB(parseFloat(e.target.value) || 0.08)}
                      className="w-full accent-blue-500 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Factor Cuadrático de Transporte (C):</span>
                      <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-850">{paramC.toFixed(2)} Bs/día²</span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="3.00"
                      step="0.10"
                      value={paramC}
                      onChange={(e) => setParamC(parseFloat(e.target.value) || 1.2)}
                      className="w-full accent-blue-500 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Presupuesto Asignado o Reserva Inicial (I):</span>
                      <span className="font-mono font-bold text-rose-455 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">{paramI.toFixed(0)} Bs</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="1200"
                      step="50"
                      value={paramI}
                      onChange={(e) => setParamI(parseFloat(e.target.value) || 450.0)}
                      className="w-full accent-rose-500 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                    />
                  </div>
                </>
              )}

              {/* SLIDERS CASE 2: FUEL REPLENISHMENT */}
              {activeModel === "fuel" && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Consumo Diario Municipal Base (Q):</span>
                      <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-850">{fuelQ.toFixed(1)} cisternas/día</span>
                    </div>
                    <input
                      type="range"
                      min="5.0"
                      max="30.0"
                      step="1.0"
                      value={fuelQ}
                      onChange={(e) => setFuelQ(parseFloat(e.target.value) || 14.0)}
                      className="w-full accent-emerald-500 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Multiplicador de Alerta o Compra de Pánico (θ):</span>
                      <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-850">{fuelTheta.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.1"
                      value={fuelTheta}
                      onChange={(e) => setFuelTheta(parseFloat(e.target.value) || 2.2)}
                      className="w-full accent-emerald-500 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Tasa de Amortiguación de Escasez (γ):</span>
                      <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-850">{fuelGamma.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="0.40"
                      step="0.01"
                      value={fuelGamma}
                      onChange={(e) => setFuelGamma(parseFloat(e.target.value) || 0.12)}
                      className="w-full accent-emerald-500 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                    />
                  </div>
                </>
              )}

              {/* SLIDERS CASE 3: SOCIAL OPINION INSTABILITY */}
              {activeModel === "social" && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Coeficiente Cúbico de Fricción Colectiva (α):</span>
                      <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-850">{socialAlpha.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={socialAlpha}
                      onChange={(e) => setSocialAlpha(parseFloat(e.target.value) || 1.0)}
                      className="w-full accent-purple-500 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Tasa de Contagio de Opinión Extrema (β):</span>
                      <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-850">{socialBeta.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="2.0"
                      max="15.0"
                      step="0.10"
                      value={socialBeta}
                      onChange={(e) => setSocialBeta(parseFloat(e.target.value) || 8.05)}
                      className="w-full accent-purple-500 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Amortiguación Cívica e Institucional (γ):</span>
                      <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-850">{socialGamma.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="5.0"
                      max="25.0"
                      step="0.5"
                      value={socialGamma}
                      onChange={(e) => setSocialGamma(parseFloat(e.target.value) || 15.0)}
                      className="w-full accent-purple-500 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Presión de Escasez y Parálisis Bloqueo (δ):</span>
                      <span className="font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">{socialDelta.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="15.0"
                      step="0.1"
                      value={socialDelta}
                      onChange={(e) => setSocialDelta(parseFloat(e.target.value) || 6.2)}
                      className="w-full accent-purple-500 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                    />
                  </div>
                </>
              )}

            </div>
          </div>

          {/* CRITICAL ALGORITHMIC SEEDS CONFIGURATION PANEL */}
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4" id="roots-seeds-inputs-container">
            <div className="border-b border-slate-850 pb-2 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Límites y Estimaciones Iniciales (Semillas)
              </span>
              <span className="text-[9px] text-blue-450 font-mono">Tolerancia: {tolerance}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              
              {/* Bisection inputs */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-850 flex flex-col justify-between">
                <div>
                  <span className="text-[9.5px] font-bold text-amber-500 block">Bisección [a, b]</span>
                  <span className="text-[8.5px] text-slate-550 block">Rango cerrado de signo</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 w-full text-center">
                    <span className="text-[8px] text-slate-550 block">Mín (a)</span>
                    <input
                      type="number"
                      step="1"
                      value={bisA}
                      onChange={(e) => setBisA(parseFloat(e.target.value) || 0)}
                      className="w-full text-center font-mono font-black text-amber-500 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 w-full text-center">
                    <span className="text-[8px] text-slate-550 block">Máx (b)</span>
                    <input
                      type="number"
                      step="1"
                      value={bisB}
                      onChange={(e) => setBisB(parseFloat(e.target.value) || 0)}
                      className="w-full text-center font-mono font-black text-amber-500 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Newton Guess inputs */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-850 flex flex-col justify-between">
                <div>
                  <span className="text-[9.5px] font-bold text-blue-400 block">Newton guess [x₀]</span>
                  <span className="text-[8.5px] text-slate-550 block">Punto tangente inicial</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 mt-2 text-center">
                  <span className="text-[8px] text-slate-550 block">Semilla x₀</span>
                  <input
                    type="number"
                    step="0.5"
                    value={newtX0}
                    onChange={(e) => setNewtX0(parseFloat(e.target.value) || 0)}
                    className="w-full text-center font-mono font-black text-blue-400 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* Secant guess inputs */}
              <div className="col-span-2 p-3 bg-slate-950 rounded-2xl border border-slate-850 flex flex-col justify-between">
                <div className="flex justify-between items-center border-b border-slate-900 pb-1.5 mb-1.5">
                  <div>
                    <span className="text-[9.5px] font-bold text-purple-400 block">Secante [x₀, x₁]</span>
                    <span className="text-[8.5px] text-slate-550 block">Dos aproximaciones iniciales sucesivas sin derivada</span>
                  </div>
                  <span className="text-[8.5px] font-mono font-bold text-slate-500">Orden ~1.618</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-center">
                    <span className="text-[8px] text-slate-550 block">Punto x₀</span>
                    <input
                      type="number"
                      step="0.5"
                      value={secX0}
                      onChange={(e) => setSecX0(parseFloat(e.target.value) || 0)}
                      className="w-full text-center font-mono font-black text-purple-400 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-center">
                    <span className="text-[8px] text-slate-550 block">Punto x₁</span>
                    <input
                      type="number"
                      step="0.5"
                      value={secX1}
                      onChange={(e) => setSecX1(parseFloat(e.target.value) || 0)}
                      className="w-full text-center font-mono font-black text-purple-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* PRECISION AND CONTROL TOLERANCE AND MAXIMUM STEPS */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="text-slate-500 block mb-0.5 uppercase tracking-wide text-[8.5px]">Tolerancia Epsilon</label>
                <select
                  value={tolerance}
                  onChange={(e) => setTolerance(parseFloat(e.target.value) || 0.0001)}
                  className="w-full p-2 bg-slate-950 border border-slate-850 text-slate-200 rounded-xl font-mono text-center focus:outline-none"
                >
                  <option value={0.01}>1e-2 (Baja)</option>
                  <option value={0.001}>1e-3 (Estándar)</option>
                  <option value={0.0001}>1e-4 (Alta)</option>
                  <option value={0.000001}>1e-6 (Científica)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 block mb-0.5 uppercase tracking-wide text-[8.5px]">Límite de Iteraciones</label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={maxIter}
                  onChange={(e) => setMaxIter(parseInt(e.target.value) || 20)}
                  className="w-full p-2 bg-slate-950 border border-slate-850 text-slate-200 rounded-xl font-mono text-center focus:outline-none"
                />
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: CORRESPONDING CHART WITH CONVERGED ROOTS SHOWN */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          
          {/* THE SVG INTERACTIVE FRAME PLOT */}
          <div className="bg-[#0b0f19] border border-slate-800 p-5 rounded-3xl flex-grow flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-3 flex-wrap gap-2">
              <div className="flex gap-4 items-center">
                <span className="text-[10px] font-bold uppercase text-slate-450 flex items-center gap-1 font-mono">
                  <Compass className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  Localizador Gráfico de Raíces f({activeModel === "budget" ? "t" : activeModel === "fuel" ? "r" : "φ"}) = 0
                </span>
              </div>
              <div className="flex gap-1.5 text-[8.5px] font-mono font-bold uppercase">
                <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2.5 py-0.5 rounded border border-amber-500/20">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-0.5" /> Bisección
                </span>
                <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded border border-blue-500/20">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-0.5" /> Newton
                </span>
                <span className="flex items-center gap-1 bg-purple-500/10 text-purple-450 px-2.5 py-0.5 rounded border border-purple-500/20">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 mr-0.5" /> Secante
                </span>
              </div>
            </div>

            {/* CONTAINER PLOT AREA WINDOW */}
            <div className="bg-[#02050f] rounded-2xl border border-slate-900 overflow-hidden relative" id="roots-svg-plot-box">
              
              {/* Alert prompt when Bisection condition f(a)*f(b) > 0 fails, warning the analyst */}
              {bisectionIters.length === 0 && (
                <div className="absolute inset-0 bg-[#02050f]/95 flex flex-col items-center justify-center p-6 text-center z-10 transition-all duration-200">
                  <AlertCircle className="w-8 h-8 text-amber-500 mb-2 animate-bounce" />
                  <span className="text-amber-500 font-bold text-xs uppercase tracking-wide">Criterio de Intervalo Bisección nulo</span>
                  <p className="text-[10px] text-slate-400 max-w-sm mt-1 leading-normal">
                    Las ordenadas de los extremos f(a) y f(b) deben tener signos opuestos para garantizar una raíz en el intervalo cerrado de Bisección [Teorema de Bolzano]. ¡Reestablezca los rangos o parámetros!
                  </p>
                </div>
              )}

              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto block select-none">
                
                {/* Horizontal guidance grid lines */}
                {[-0.5, 0, 0.5].map((factor, gridIdx) => {
                  const valY = factor * (yMax - yMin) * 0.55;
                  const sy = getSvgY(valY);
                  return (
                    <g key={gridIdx}>
                      <line
                        x1={margin.left}
                        y1={sy}
                        x2={svgW - margin.right}
                        y2={sy}
                        stroke={factor === 0 ? "#1e293b" : "#111827"}
                        strokeWidth={factor === 0 ? "1.5" : "1"}
                        strokeDasharray={factor === 0 ? "none" : "3 3"}
                      />
                      <text
                        x={margin.left - 8}
                        y={sy + 3}
                        textAnchor="end"
                        className="text-[8.5px] font-mono fill-slate-550"
                      >
                        {valY.toFixed(factor === 0 ? 0 : 1)}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical bounding guidelines for active slider search boundaries */}
                <line
                  x1={getSvgX(bisA)}
                  y1={margin.top}
                  x2={getSvgX(bisA)}
                  y2={svgH - margin.bottom}
                  stroke="#d97706"
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                  opacity="0.5"
                />
                <line
                  x1={getSvgX(bisB)}
                  y1={margin.top}
                  x2={getSvgX(bisB)}
                  y2={svgH - margin.bottom}
                  stroke="#d97706"
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                  opacity="0.5"
                />

                {/* THE UNIFIED CONTINUOUS CURVE FUNCTION VECTOR */}
                {curvePathD && (
                  <path
                    d={curvePathD}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.85"
                  />
                )}

                {/* VISUAL MARKERS AND LABELS FOR CONVERGED ROOTS */}
                {/* BISEC ROOT DOT */}
                {bisRoot !== null && bisRoot >= chartXMin && bisRoot <= chartXMax && (
                  <g>
                    <circle cx={getSvgX(bisRoot)} cy={getSvgY(0)} r="7" className="fill-amber-500/20 stroke-amber-500 stroke-1" />
                    <circle cx={getSvgX(bisRoot)} cy={getSvgY(0)} r="3.5" className="fill-amber-500" />
                  </g>
                )}

                {/* NEWT ROOT DOT */}
                {newtRoot !== null && newtRoot >= chartXMin && newtRoot <= chartXMax && (
                  <g>
                    <circle cx={getSvgX(newtRoot)} cy={getSvgY(0)} r="11" className="fill-blue-500/15 stroke-blue-500 stroke-1 animate-pulse" />
                    <circle cx={getSvgX(newtRoot)} cy={getSvgY(0)} r="4" className="fill-blue-500" />
                  </g>
                )}

                {/* SECANT ROOT DOT */}
                {secRoot !== null && secRoot >= chartXMin && secRoot <= chartXMax && (
                  <g>
                    <circle cx={getSvgX(secRoot)} cy={getSvgY(0)} r="9" className="fill-purple-500/20 stroke-purple-500 stroke-1" />
                    <circle cx={getSvgX(secRoot)} cy={getSvgY(0)} r="3.5" className="fill-purple-500" />
                  </g>
                )}

                {/* GRAPH FRAME LABELS */}
                <text x={svgW / 2} y={svgH - 6} textAnchor="middle" className="text-[9px] fill-slate-500 font-bold uppercase tracking-wider font-mono">
                  Valores de Búsqueda ({unitLabel === "cisternas" ? "Número r" : activeModel === "budget" ? "Tiempo t" : "Fracción φ"})
                </text>
                <text x="14" y={(svgH - margin.bottom) / 2 + 10} textAnchor="middle" transform={`rotate(-90 14 ${(svgH - margin.bottom) / 2 + 10})`} className="text-[9px] fill-slate-500 font-bold uppercase tracking-wider font-mono">
                  Ordenada f({activeModel === "budget" ? "t" : activeModel === "fuel" ? "r" : "φ"})
                </text>

                {/* Axis Tick pointers */}
                <text x={getSvgX(chartXMin)} y={svgH - 24} textAnchor="start" className="text-[9.5px] fill-slate-550 font-mono font-bold">{chartXMin.toFixed(0)} {unitLabel}</text>
                <text x={getSvgX((chartXMax + chartXMin) / 2)} y={svgH - 24} textAnchor="middle" className="text-[8.5px] fill-slate-600 font-mono">{( (chartXMax + chartXMin) / 2 ).toFixed(1)}</text>
                <text x={getSvgX(chartXMax)} y={svgH - 24} textAnchor="end" className="text-[9.5px] fill-slate-550 font-mono font-bold">{chartXMax.toFixed(0)} {unitLabel}</text>

                {/* Root value coordinate readout label text */}
                {activePlotRoot !== null && activePlotRoot >= chartXMin && activePlotRoot <= chartXMax && (
                  <g>
                    <rect
                      x={getSvgX(activePlotRoot) > svgW - 130 ? getSvgX(activePlotRoot) - 110 : getSvgX(activePlotRoot) + 10}
                      y={zeroYLine - 50}
                      width="100"
                      height="38"
                      rx="6"
                      fill="#02050f"
                      stroke="#3b82f6"
                      strokeWidth="1.2"
                      fillOpacity="0.95"
                    />
                    <text
                      x={getSvgX(activePlotRoot) > svgW - 130 ? getSvgX(activePlotRoot) - 110 + 8 : getSvgX(activePlotRoot) + 18}
                      y={zeroYLine - 36}
                      className="text-[9px] fill-slate-300 font-bold font-sans"
                    >
                      Raíz Estimada:
                    </text>
                    <text
                      x={getSvgX(activePlotRoot) > svgW - 130 ? getSvgX(activePlotRoot) - 110 + 8 : getSvgX(activePlotRoot) + 18}
                      y={zeroYLine - 22}
                      className="text-[10px] fill-blue-400 font-mono font-black"
                    >
                      {activePlotRoot.toFixed(5)} {unitLabel.slice(0,4)}
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* SPEEDOMETERS COMPARING SPEEDS */}
            <div className="grid grid-cols-3 gap-3 mt-4" id="roots-triple-speedometers">
              
              {/* BISECTION RES */}
              <div className="bg-[#050811] rounded-2xl p-3 border border-amber-500/25 relative flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-500 font-mono block">Bisección</span>
                  <span className="text-sm font-extrabold font-mono mt-0.5 block text-white truncate">
                    {bisRoot !== null ? `${bisRoot.toFixed(5)} ${unitLabel.slice(0,3)}` : "No converge"}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-900/40 text-[8px] text-slate-550 font-mono">
                  <span>{bisectionIters.length} pasos</span>
                  <span>O(h¹)</span>
                </div>
              </div>

              {/* NEWTON RES */}
              <div className="bg-[#050811] rounded-2xl p-3 border border-blue-500/25 relative flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 font-mono block">Newton-Raphson</span>
                  <span className="text-sm font-extrabold font-mono mt-0.5 block text-blue-400 truncate">
                    {newtRoot !== null ? `${newtRoot.toFixed(5)} ${unitLabel.slice(0,3)}` : "No converge"}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-900/40 text-[8px] text-blue-450 font-mono">
                  <span>{newtonIters.length} pasos</span>
                  <span>O(h²)</span>
                </div>
              </div>

              {/* SECANT RES */}
              <div className="bg-[#050811] rounded-2xl p-3 border border-purple-500/25 relative flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 font-mono block">Secante</span>
                  <span className="text-sm font-extrabold font-mono mt-0.5 block text-purple-400 truncate">
                    {secRoot !== null ? `${secRoot.toFixed(5)} ${unitLabel.slice(0,3)}` : "No converge"}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-900/40 text-[8px] text-purple-450 font-mono">
                  <span>{secantIters.length} pasos</span>
                  <span>O(h¹·⁶¹⁸)</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* DETAILED RESULTS ITERATION TABLES AND FAQ ANSWERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="roots-comparative-reports-section">
        
        {/* PARALLEL INTERACTIVE COMPARATIVE CONVERGENCE INDEX TABULATION */}
        <div className="lg:col-span-7 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
            <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
            <h3 className="font-bold text-xs text-slate-350 uppercase tracking-widest">
              Análisis Comparativo del Rigor Teórico vs Empírico
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs" id="convergence-metrics-comparison">
            
            {/* CARD 1: BISECTION */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-1.5">
              <span className="text-[9px] font-mono text-amber-500 font-bold block">BISECCIÓN [A, B]</span>
              <p className="text-[11px] font-serif leading-relaxed text-slate-300">
                Aproximación por encasillamiento de intervalos. Fuerte estabilidad del Teorema de Bolzano.
              </p>
              <div className="pt-2 border-t border-slate-900 text-[10.5px] leading-tight space-y-1 text-slate-450 font-mono">
                <div>• Conv. Teórica: <strong>1.0 (Lineal)</strong></div>
                <div>• Conv. Empírica: <strong className="text-amber-500">{pBisection ? pBisection.toFixed(3) : "No calculable"}</strong></div>
                <div>• Sensibilidad inicial: <strong>Nula (Seguro)</strong></div>
              </div>
            </div>

            {/* CARD 2: NEWTON-RAPHSON */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-1.5">
              <span className="text-[9px] font-mono text-blue-400 font-bold block">NEWTON-RAPHSON</span>
              <p className="text-[11px] font-serif leading-relaxed text-slate-300">
                Aproximación por pendiente local de primer orden. Demanda el uso explícito de f'(x).
              </p>
              <div className="pt-2 border-t border-slate-900 text-[10.5px] leading-tight space-y-1 text-slate-450 font-mono">
                <div>• Conv. Teórica: <strong>2.0 (Cuadrático)</strong></div>
                <div>• Conv. Empírica: <strong className="text-blue-400">{pNewton ? pNewton.toFixed(3) : "No calculable"}</strong></div>
                <div>• Sensibilidad inicial: <strong className="text-red-400">Muy Alta</strong></div>
              </div>
            </div>

            {/* CARD 3: SECANTE */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-1.5">
              <span className="text-[9px] font-mono text-purple-400 font-bold block">SECANTE [x₀, x₁]</span>
              <p className="text-[11px] font-serif leading-relaxed text-slate-300">
                Aproximación sin derivadas mediante diferenciación finita de cuerdas de secante.
              </p>
              <div className="pt-2 border-t border-slate-900 text-[10.5px] leading-tight space-y-1 text-slate-450 font-mono">
                <div>• Conv. Teórica: <strong>1.618 (Súperlineal)</strong></div>
                <div>• Conv. Empírica: <strong className="text-purple-400">{pSecant ? pSecant.toFixed(3) : "No calculable"}</strong></div>
                <div>• Sensibilidad inicial: <strong>Media</strong></div>
              </div>
            </div>

          </div>

          {/* SCIENTIFIC EXCELLENCE INTERPRETATIVE TEXTS */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3" id="roots-faq-interpretation">
            <div>
              <h4 className="font-bold text-xs uppercase text-slate-400">
                {activeModel === "budget" && "Análisis del Colapso Financiero (Punto de Quiebre)"}
                {activeModel === "fuel" && "Tasa de Suministro versus Demanda Volátil"}
                {activeModel === "social" && "Dinámica de Opinión Colectiva (Umbral de Bifurcación)"}
              </h4>
              
              {activeModel === "budget" && (
                <p className="text-xs text-slate-450 leading-relaxed mt-1">
                  Bajo la actual estructura inflacionaria ($A={paramA}$, $B={paramB}$), la curva del egreso familiar neto es fuertemente exponencial. Resolviendo $f(t)=0$, hallamos que en el <strong>día {activePlotRoot.toFixed(3)}</strong> las reservas de Bs {paramI} colapsan a cero. Newton-Raphson y la Secante evidencian una convergencia veloz hacia la misma raíz debido a que la función carece de extremos locales o inflexiones en este intervalo del mes.
                </p>
              )}

              {activeModel === "fuel" && (
                <p className="text-xs text-slate-450 leading-relaxed mt-1">
                  El sistema de colas de combustible acumula ineficiencia colectiva por pánico ($Q={fuelQ}$, $\theta={fuelTheta}$). La tasa de llegada crítica calibrada es de <strong>{activePlotRoot.toFixed(3)} cisternas diarias</strong>. A menos de este flujo de arribo, el tanque municipal cae a niveles de reserva seca y desabastecimiento. A más de esta cifra, las uniones de reparto se disuelven y se recupera la calma.
                </p>
              )}

              {activeModel === "social" && (
                <p className="text-xs text-slate-450 leading-relaxed mt-1">
                  La opinión social es modelada según una bifurcación de cúbula colectiva. El umbral crítico exacto con los parámetros ingresados se sitúa en un índice de agitación de <strong>{activePlotRoot.toFixed(3)}</strong>. Por debajo de esta movilización, las interacciones sociales tienden espontáneamente a la calma y la desmovilización. Traspasado este valor, la autopropagación grupal desata una reacción en cadena hacia la masificación incontrolable.
                </p>
              )}
            </div>

            <div className="text-[11px] border-t border-slate-900 pt-2 text-slate-500 leading-normal">
              *Nota matemática sobre el <strong>Orden de Convergencia Estimado ($p$)</strong>: La estimación se realiza analizando los factores de error fraccionales en el tramo asintótico terminal del solver. En caso de convergencia extremadamente brusca (2-3 pasos), es posible que no se cuente con suficientes registros limpios de error para el cálculo numérico de logs, reportándose como "No calculable".
            </div>
          </div>

          {/* SENSITIVITY TO INITIAL GUESS BOARD */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">
                Sensibilidad de Newton-Raphson a la Semilla Inicial (Condición Limítrofe)
              </span>
              <span className="text-[9px] text-blue-450 font-mono">Semilla base: x₀ = {newtX0}</span>
            </div>
            <p className="text-[11.5px] text-slate-450 leading-normal">
              Evaluación experimental para predecir colapsos y oscilaciones divergentes de Newton variando la semilla inicial en un delta:
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {seedTrials.map((trial, idx) => (
                <div key={idx} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Guess Inicial</span>
                  <span className="text-xs font-mono font-bold text-slate-300 block">{trial.seed.toFixed(2)}</span>
                  <div className="mt-1.5 pt-1.5 border-t border-slate-950 flex flex-col items-center">
                    {trial.converged && trial.root !== null ? (
                      <>
                        <span className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">CONVERGIÓ</span>
                        <span className="text-xs font-black font-mono text-white mt-1">{trial.root.toFixed(3)}</span>
                        <span className="text-[8.5px] text-slate-500 font-mono font-bold mt-0.5">en {trial.steps} iter.</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[9px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded">FALLÓ</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-1">Divergencia</span>
                        <span className="text-[8px] text-slate-550 block font-mono">Gradiente plano</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* COMPARATIVE ITERATIVE TABLE */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[670px]" id="roots-comparative-table-container">
          <div className="p-4 bg-slate-900/50 border-b border-slate-850 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tabla de Iteraciones de Ingeniería</h3>
            <p className="text-[10px] text-slate-550 font-mono leading-none mt-1">
              Seguimiento de orden del error residual absoluto para los tres algoritmos
            </p>
          </div>

          <div className="overflow-auto flex-grow font-mono text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#020617] sticky top-0 text-slate-500 border-b border-slate-850">
                <tr>
                  <th className="p-3 text-center w-10">k</th>
                  <th className="p-2 text-amber-500 font-bold">Bisec. xr</th>
                  <th className="p-2 text-blue-400 font-bold">Newton xr</th>
                  <th className="p-2 text-purple-400 font-bold">Secante xr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/50">
                {Array.from({ length: Math.max(bisectionIters.length, newtonIters.length, secantIters.length) }).map((_, idx) => {
                  const b = bisectionIters[idx];
                  const n = newtonIters[idx];
                  const s = secantIters[idx];

                  return (
                    <tr key={idx} className="hover:bg-slate-900/30 transition text-[10.5px]">
                      <td className="p-3 text-center text-slate-500 bg-slate-900/10">{idx + 1}</td>
                      
                      {/* bisection cell */}
                      <td className="p-2">
                        {b ? (
                          <div>
                            <span className="text-amber-500 font-bold block">{b.xr.toFixed(4)}</span>
                            <span className="text-[8.5px] text-slate-500 font-mono">Err: {b.error.toFixed(2)}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-700">-</span>
                        )}
                      </td>

                      {/* newton cell */}
                      <td className="p-2">
                        {n ? (
                          <div>
                            <span className="text-blue-400 font-bold block">{n.xr.toFixed(4)}</span>
                            <span className="text-[8.5px] text-slate-500 font-mono">Err: {n.error.toFixed(2)}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-700">-</span>
                        )}
                      </td>

                      {/* secant cell */}
                      <td className="p-2">
                        {s ? (
                          <div>
                            <span className="text-purple-400 font-bold block">{s.xr.toFixed(4)}</span>
                            <span className="text-[8.5px] text-slate-500 font-mono">Err: {s.error.toFixed(2)}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-700">-</span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
