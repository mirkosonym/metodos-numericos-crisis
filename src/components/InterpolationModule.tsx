/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  AlertCircle, 
  Info, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  TrendingUpDown,
  BookOpen, 
  HelpCircle, 
  Sliders, 
  Sparkles, 
  RotateCcw,
  BadgeAlert,
  ChevronRight,
  Calculator,
  Activity,
  Milestone
} from "lucide-react";
import { DataPoint } from "../types";

// Predefined products with datasets
interface PredefinedProduct {
  id: string;
  name: string;
  icon: string;
  description: string;
  points: DataPoint[];
}

const PREDEFINED_PRODUCTS: PredefinedProduct[] = [
  {
    id: "papa",
    name: "Papa (Sugerido)",
    icon: "🥔",
    description: "Abastecimiento regular con encarecimiento gradual por bloqueo de transporte regional.",
    points: [
      { x: 1, y: 8.0 },
      { x: 5, y: 10.0 },
      { x: 10, y: 13.0 },
      { x: 15, y: 16.0 },
      { x: 20, y: 19.0 },
      { x: 30, y: 22.0 }
    ]
  },
  {
    id: "tomate",
    name: "Tomate (Incremento Crítico)",
    icon: "🍅",
    description: "Altamente perecedero. Desabastecimiento extremo que desató especulación desmedida de precios.",
    points: [
      { x: 1, y: 6.0 },
      { x: 5, y: 9.5 },
      { x: 10, y: 15.0 },
      { x: 15, y: 21.0 },
      { x: 20, y: 26.5 },
      { x: 30, y: 29.0 }
    ]
  },
  {
    id: "arroz",
    name: "Arroz (Canasta Estable)",
    icon: "🌾",
    description: "Grano seco acopiado en silos públicos. Resiste fluctuaciones estacionales de logística.",
    points: [
      { x: 1, y: 7.0 },
      { x: 5, y: 7.4 },
      { x: 10, y: 8.1 },
      { x: 15, y: 8.5 },
      { x: 20, y: 8.9 },
      { x: 30, y: 9.2 }
    ]
  },
  {
    id: "aceite",
    name: "Aceite de Cocina (Volátil)",
    icon: "🧴",
    description: "Mercancía importada regulada por cupos intermitentes de aduanas y especulación especifica.",
    points: [
      { x: 1, y: 12.0 },
      { x: 5, y: 20.0 },
      { x: 10, y: 15.5 },
      { x: 15, y: 24.0 },
      { x: 20, y: 18.0 },
      { x: 30, y: 27.0 }
    ]
  }
];

// Structural layout interface for Natural Cubic Splines
interface SplineSegment {
  x: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

export default function InterpolationModule() {
  const [selectedProductId, setSelectedProductId] = useState<string>("papa");
  const [points, setPoints] = useState<DataPoint[]>([...PREDEFINED_PRODUCTS[0].points]);
  
  // Point to interpolate
  const [queryX, setQueryX] = useState<number>(12);
  
  // Active method selection
  const [method, setMethod] = useState<"lagrange" | "newton" | "spline">("spline");

  // Output variables
  const [interpolatedY, setInterpolatedY] = useState<number>(0);
  const [lagrangeY, setLagrangeY] = useState<number>(0);
  const [newtonY, setNewtonY] = useState<number>(0);
  const [splineY, setSplineY] = useState<number>(0);
  const [newtonCoefficients, setNewtonCoefficients] = useState<number[]>([]);
  const [splineSegments, setSplineSegments] = useState<SplineSegment[]>([]);
  const [polynomialString, setPolynomialString] = useState<string>("");

  // Auto-fill points when predefined product is changed
  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = PREDEFINED_PRODUCTS.find(p => p.id === prodId);
    if (prod) {
      setPoints([...prod.points]);
    }
  };

  // Sort points by day (X coordinate)
  const sortedPoints = [...points].sort((a, b) => a.x - b.x);

  // ==========================================
  // MATHEMATICAL SOLVER : LAGRANGE METHOD
  // ==========================================
  const evaluateLagrange = (xVal: number, pts: DataPoint[]): number => {
    let total = 0;
    const n = pts.length;
    if (n === 0) return 0;
    for (let i = 0; i < n; i++) {
      let term = pts[i].y;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const denom = pts[i].x - pts[j].x;
          if (Math.abs(denom) < 1e-9) continue; // safety clamp
          term = term * (xVal - pts[j].x) / denom;
        }
      }
      total += term;
    }
    return total;
  };

  // ==========================================
  // MATHEMATICAL SOLVER : NEWTON METHOD (DIVIDED DIFFERENCES)
  // ==========================================
  const calculateNewtonDivDifferences = (pts: DataPoint[]) => {
    const n = pts.length;
    if (n === 0) return { coefs: [], evaluator: () => 0 };

    const fMat: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    
    // Fill first column with Y values
    for (let i = 0; i < n; i++) {
      fMat[i][0] = pts[i].y;
    }

    // Compute coefficients column-by-column
    for (let j = 1; j < n; j++) {
      for (let i = 0; i < n - j; i++) {
        const denom = pts[i + j].x - pts[i].x;
        if (Math.abs(denom) < 1e-9) {
          fMat[i][j] = 0;
        } else {
          fMat[i][j] = (fMat[i+1][j-1] - fMat[i][j-1]) / denom;
        }
      }
    }

    const coefs: number[] = [];
    for (let j = 0; j < n; j++) {
      coefs.push(fMat[0][j]);
    }

    const evaluator = (xVal: number) => {
      let result = coefs[0];
      let product = 1;
      for (let i = 1; i < n; i++) {
        product *= (xVal - pts[i-1].x);
        result += coefs[i] * product;
      }
      return result;
    };

    return { coefs, evaluator };
  };

  // ==========================================
  // MATHEMATICAL SOLVER : NATURAL CUBIC SPLINES
  // ==========================================
  const computeNaturalCubicSplines = (pts: DataPoint[]): SplineSegment[] => {
    const n = pts.length;
    if (n < 2) return [];

    // Intervals distances
    const h = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      h[i] = pts[i+1].x - pts[i].x;
      if (h[i] <= 0) h[i] = 0.001; // guard against identical X coordinates
    }

    const a = pts.map(p => p.y);

    // Alpha helper vector for the linear system
    const alpha = new Array(n - 1).fill(0);
    for (let i = 1; i < n - 1; i++) {
      alpha[i] = (3 / h[i]) * (a[i+1] - a[i]) - (3 / h[i-1]) * (a[i] - a[i-1]);
    }

    // Solving tridiagonal system using Thomas Algorithm
    const l = new Array(n).fill(1);
    const mu = new Array(n).fill(0);
    const z = new Array(n).fill(0);

    l[0] = 1;
    mu[0] = 0;
    z[0] = 0;

    for (let i = 1; i < n - 1; i++) {
      l[i] = 2 * (pts[i+1].x - pts[i-1].x) - h[i-1] * mu[i-1];
      if (Math.abs(l[i]) < 1e-9) l[i] = 1e-9;
      mu[i] = h[i] / l[i];
      z[i] = (alpha[i] - h[i-1] * z[i-1]) / l[i];
    }

    l[n-1] = 1;
    z[n-1] = 0;
    
    const c = new Array(n).fill(0);
    const b = new Array(n - 1).fill(0);
    const d = new Array(n - 1).fill(0);

    // Backward substitution
    for (let j = n - 2; j >= 0; j--) {
      c[j] = z[j] - mu[j] * c[j+1];
      b[j] = (a[j+1] - a[j]) / h[j] - h[j] * (c[j+1] + 2 * c[j]) / 3;
      d[j] = (c[j+1] - c[j]) / (3 * h[j]);
    }

    const segments: SplineSegment[] = [];
    for (let i = 0; i < n - 1; i++) {
      segments.push({
        x: pts[i].x,
        a: a[i],
        b: b[i],
        c: c[i],
        d: d[i]
      });
    }

    return segments;
  };

  const evaluateSpline = (segments: SplineSegment[], xVal: number, pts: DataPoint[]): number => {
    if (segments.length === 0) return 0;
    const n = pts.length;

    // Boundary constraints representation handles extrapolation on borders safely
    if (xVal <= pts[0].x) {
      const dx = xVal - segments[0].x;
      return segments[0].a + segments[0].b * dx + segments[0].c * dx * dx + segments[0].d * dx * dx * dx;
    }
    if (xVal >= pts[n-1].x) {
      const i = segments.length - 1;
      const dx = xVal - segments[i].x;
      return segments[i].a + segments[i].b * dx + segments[i].c * dx * dx + segments[i].d * dx * dx * dx;
    }

    // Binary search/linear find the matching interval segment
    let i = 0;
    for (let j = 0; j < segments.length; j++) {
      if (xVal >= pts[j].x && xVal <= pts[j+1].x) {
        i = j;
        break;
      }
    }

    const dx = xVal - segments[i].x;
    return segments[i].a + segments[i].b * dx + segments[i].c * dx * dx + segments[i].d * dx * dx * dx;
  };

  // ==========================================
  // DISPATCH CORE CALCULATOR LOOPS
  // ==========================================
  const executeInterpolationLoop = () => {
    if (sortedPoints.length < 2) return;

    // 1. Lagrange
    const lValue = evaluateLagrange(queryX, sortedPoints);
    setLagrangeY(lValue);

    // 2. Newton
    const newton = calculateNewtonDivDifferences(sortedPoints);
    setNewtonCoefficients(newton.coefs);
    const nValue = newton.evaluator(queryX);
    setNewtonY(nValue);

    // 3. Splines Cúbicos
    const splines = computeNaturalCubicSplines(sortedPoints);
    setSplineSegments(splines);
    const sValue = evaluateSpline(splines, queryX, sortedPoints);
    setSplineY(sValue);

    // Set selected active value
    if (method === "lagrange") {
      setInterpolatedY(lValue);
    } else if (method === "newton") {
      setInterpolatedY(nValue);
    } else {
      setInterpolatedY(sValue);
    }

    // Formulate a beautiful display equation string representation for Newton
    let polyStr = `P(x) = ${sortedPoints[0].y.toFixed(2)}`;
    if (newton.coefs.length > 1) {
      for (let i = 1; i < newton.coefs.length; i++) {
        const c = newton.coefs[i];
        if (Math.abs(c) < 1e-4) continue;
        const sign = c >= 0 ? " + " : " - ";
        const nextTerms = sortedPoints.slice(0, i).map(p => `(x - ${p.x})`).join("");
        polyStr += `${sign}${Math.abs(c).toFixed(3)}${nextTerms}`;
      }
    }
    setPolynomialString(polyStr);
  };

  useEffect(() => {
    executeInterpolationLoop();
  }, [points, queryX, method]);

  // ==========================================
  // DATA ACTIONS : ADD/DELETE/EDIT POINTS
  // ==========================================
  const handleAddNewRow = () => {
    if (points.length >= 10) {
      alert("Se recomienda un máximo de 10 puntos para evitar un sobreajuste severo por oscilaciones en los extremos.");
      return;
    }
    // Propose an empty day at the end of the month
    const lastDay = sortedPoints.length > 0 ? sortedPoints[sortedPoints.length - 1].x : 0;
    const proposedDay = Math.min(30, lastDay + 3);
    const lastPrice = sortedPoints.length > 0 ? sortedPoints[sortedPoints.length - 1].y : 10.0;
    
    // verify no overlaps
    if (points.some(p => p.x === proposedDay)) {
      setPoints([...points, { x: Math.min(30, proposedDay + 1), y: lastPrice }]);
    } else {
      setPoints([...points, { x: proposedDay, y: lastPrice }]);
    }
  };

  const handleDeleteRow = (idxToDelete: number) => {
    if (points.length <= 3) {
      alert("Se requiere por lo menos 3 puntos históricos para modelar curvatura continua mediante splines cúbicos.");
      return;
    }
    // Identify raw point we are deleting
    const targetPt = sortedPoints[idxToDelete];
    setPoints(points.filter(p => !(p.x === targetPt.x && p.y === targetPt.y)));
  };

  const handleEditCell = (idx: number, field: "x" | "y", valueStr: string) => {
    const rawVal = parseFloat(valueStr);
    const num = isNaN(rawVal) ? 0 : rawVal;
    
    const targetPt = sortedPoints[idx];
    const updated = points.map((p) => {
      if (p.x === targetPt.x && p.y === targetPt.y) {
        return {
          ...p,
          [field]: field === "x" ? Math.max(1, Math.min(31, Math.round(num))) : Math.max(0.1, num)
        };
      }
      return p;
    });
    setPoints(updated);
  };

  const handleResetActiveProduct = () => {
    const prod = PREDEFINED_PRODUCTS.find(p => p.id === selectedProductId);
    if (prod) {
      setPoints([...prod.points]);
      setQueryX(12);
    }
  };

  // ==========================================
  // METRICS & QUESTIONS DIAGNOSTIC
  // ==========================================
  
  // Calculate relative gains of different products
  const getProductIncreaseReport = () => {
    return PREDEFINED_PRODUCTS.map(prod => {
      const sorted = [...prod.points].sort((a, b) => a.x - b.x);
      const startP = sorted[0].y;
      const endP = sorted[sorted.length - 1].y;
      const absoluteChange = endP - startP;
      const percentChange = (absoluteChange / startP) * 100;
      return {
        id: prod.id,
        name: prod.name,
        icon: prod.icon,
        startP,
        endP,
        absoluteChange,
        percentChange
      };
    }).sort((a, b) => b.percentChange - a.percentChange);
  };

  const productRankings = getProductIncreaseReport();
  const topProduct = productRankings[0];

  // Evaluate curve style
  const getCurveTrendStyle = () => {
    if (sortedPoints.length < 2) return "Estable";
    const startY = sortedPoints[0].y;
    const endY = sortedPoints[sortedPoints.length - 1].y;
    const netGrowth = endY - startY;

    let localPeaks = 0;
    let localValleys = 0;
    for (let i = 1; i < sortedPoints.length - 1; i++) {
      const prev = sortedPoints[i-1].y;
      const curr = sortedPoints[i].y;
      const next = sortedPoints[i+1].y;
      if (curr > prev && curr > next) localPeaks++;
      if (curr < prev && curr < next) localValleys++;
    }

    if (localPeaks > 0 || localValleys > 0) {
      return `Fluctuación volátil con alternancia de crestas (${localPeaks} cimas localizadas). Representa un ciclo especulativo agudo instigado por acaparamiento temporal o liberaciones selectivas de inventario local.`;
    }
    if (netGrowth > 5.0) {
      return `Crecimiento escalonado severo (+${netGrowth.toFixed(1)} Bs netos). Alerta una crisis de oferta prolongada, donde la escasez física imposibilita cubrir la demanda base, empujando la cotización a niveles máximos insostenibles.`;
    }
    return `Incremento controlado moderado (+${netGrowth.toFixed(1)} Bs netos). Los mercados mayoristas logran absorber parte del golpe mediante redistribución de reservas, mitigando un espiral hiperbólico inflacionario.`;
  };

  // Test Runge warning for Lagrange
  const detectRungeDanger = () => {
    const degree = sortedPoints.length - 1;
    if (degree <= 4) return { level: "Bajo", css: "text-emerald-450", msg: "El grado polinómico es bajo. Lagrange se comporta razonablemente bien sin oscilar." };
    
    // Check for extreme overshoot in mathematical evaluation compared to input bounds
    const minInput = Math.min(...points.map(p => p.y));
    const maxInput = Math.max(...points.map(p => p.y));
    
    let overMax = false;
    let underMin = false;
    
    // sample discrete days across the month
    for (let day = 1; day <= 30; day++) {
      const val = evaluateLagrange(day, sortedPoints);
      if (val > maxInput * 1.35) overMax = true;
      if (val < minInput * 0.6) underMin = true;
    }

    if (overMax || underMin) {
      return {
        level: "Crítico",
        css: "text-rose-450 font-black animate-pulse",
        msg: `Fórmula propensa al Fenómeno de Runge (Grado ${degree}). Lagrange arroja oscilaciones periféricas insólitamente distorsionadas en los márgenes debido a la rigidez de adaptar un único polinomio para ${sortedPoints.length} puntos equidistantes.`
      };
    }

    return {
      level: "Moderado",
      css: "text-amber-450",
      msg: `Riesgo moderado (Grado ${degree}). Aunque pasa exactamente por cada punto, la curva libre empieza a ensanchar su trayectoria al alejarse de la media.`
    };
  };

  const rungeDiagnostic = detectRungeDanger();

  // ==========================================
  // DYN CUSTOM VISUAL SVG PLOT MAKER
  // ==========================================
  const dayMin = 1;
  const dayMax = 30;

  // Calculate dynamic boundaries for pricing charts to avoid rendering drops or clipping outer bounds
  const getChartYMinMax = () => {
    const valuesEvaluated: number[] = [];
    // sample a few points
    for (let day = 1; day <= 30; day += 0.5) {
      if (method === "lagrange") {
        valuesEvaluated.push(evaluateLagrange(day, sortedPoints));
      } else if (method === "newton") {
        const newton = calculateNewtonDivDifferences(sortedPoints);
        valuesEvaluated.push(newton.evaluator(day));
      } else {
        if (splineSegments.length > 0) {
          valuesEvaluated.push(evaluateSpline(splineSegments, day, sortedPoints));
        }
      }
    }
    
    // add real point values
    points.forEach(p => valuesEvaluated.push(p.y));

    let min = Math.min(...valuesEvaluated);
    let max = Math.max(...valuesEvaluated);

    if (isNaN(min) || !isFinite(min)) min = 0;
    if (isNaN(max) || !isFinite(max)) max = 35;

    // Buffer margin top and bottom
    return {
      ymin: Math.max(0, min - 2),
      ymax: Math.max(max + 2, 10)
    };
  };

  const { ymin: chartYMin, ymax: chartYMax } = getChartYMinMax();

  // Dimensioning
  const svgW = 600;
  const svgH = 340;
  const margin = { top: 25, right: 35, bottom: 45, left: 55 };

  const getSvgX = (dayVal: number) => {
    return margin.left + ((dayVal - dayMin) / (dayMax - dayMin)) * (svgW - margin.left - margin.right);
  };

  const getSvgY = (yVal: number) => {
    const clampedY = Math.max(chartYMin, Math.min(chartYMax, yVal));
    return margin.top + (1 - (clampedY - chartYMin) / (chartYMax - chartYMin)) * (svgH - margin.top - margin.bottom);
  };

  // Build the continuous interpolation curve
  const generateCurvePathData = (activeMethod: "lagrange" | "newton" | "spline") => {
    const pathPoints: { x: number; y: number }[] = [];
    const pointsCount = 100;
    const delta = (dayMax - dayMin) / pointsCount;

    const newtonObj = activeMethod === "newton" ? calculateNewtonDivDifferences(sortedPoints) : null;
    const splineObj = activeMethod === "spline" ? computeNaturalCubicSplines(sortedPoints) : null;

    for (let k = 0; k <= pointsCount; k++) {
      const day = dayMin + k * delta;
      let evaluatedY = 0;
      if (activeMethod === "lagrange") {
        evaluatedY = evaluateLagrange(day, sortedPoints);
      } else if (activeMethod === "newton" && newtonObj) {
        evaluatedY = newtonObj.evaluator(day);
      } else if (activeMethod === "spline" && splineObj) {
        evaluatedY = evaluateSpline(splineObj, day, sortedPoints);
      }
      pathPoints.push({ x: day, y: evaluatedY });
    }

    if (pathPoints.length === 0) return "";
    return `M ${getSvgX(pathPoints[0].x)} ${getSvgY(pathPoints[0].y)} ` + 
      pathPoints.slice(1).map(p => `L ${getSvgX(p.x)} ${getSvgY(p.y)}`).join(" ");
  };

  const activeCurveD = generateCurvePathData(method);
  
  // Optionally create comparison curves to demonstrate differences to users (very cool!)
  const lagrangeCurveD = method !== "lagrange" ? generateCurvePathData("lagrange") : "";
  const splineCurveD = method !== "spline" ? generateCurvePathData("spline") : "";

  return (
    <div className="space-y-6 fade-in animate-fadeIn" id="interpolation-module-scen-c-root">
      
      {/* EXPLAINER TOP BANNER */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4" id="inter-header-banner">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 rounded-full text-[10px] font-black uppercase text-blue-400 bg-blue-500/15 border border-blue-500/30 font-mono tracking-widest leading-none">
                MÉTODOS DE INTERPOLACIÓN NUMÉRICA
              </span>
              <span className="text-[10px] text-slate-505 font-bold font-mono">ESCENARIO C</span>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
              <Milestone className="w-6 h-6 text-blue-500 shrink-0" />
              Desabastecimiento de Alimentos y Curva Continua de Precios
            </h1>
            <p className="text-xs text-slate-400 max-w-4xl leading-relaxed">
              Resuelva el desequilibrio temporal de cotizaciones agrícolas construyendo modelos de tendencia continua. 
              Compare los polinomios globales de <strong>Lagrange</strong> y <strong>Newton</strong> contra la suavidad seccional elástica de los <strong>Splines Cúbicos</strong> utilizando registros estadísticos dispersos de la papa y otros insumos de la canasta básica familiar.
            </p>
          </div>
          <button
            onClick={handleResetActiveProduct}
            className="self-start lg:self-center flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-350 bg-slate-950 hover:bg-slate-905 rounded-xl transition border border-slate-850 cursor-pointer text-slate-300"
          >
            <RotateCcw className="w-4 h-4" /> Resetear Datos Iniciales
          </button>
        </div>

        {/* Dynamic products pill grid select */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2" id="grid-predef-products">
          {PREDEFINED_PRODUCTS.map((prod) => (
            <button
              key={prod.id}
              onClick={() => handleSelectProduct(prod.id)}
              className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                selectedProductId === prod.id
                  ? "bg-gradient-to-br from-blue-950/40 via-blue-900/10 to-transparent border-blue-500/70"
                  : "bg-slate-950/60 border-slate-850/80 hover:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl shrink-0" role="img" aria-label={prod.name}>
                  {prod.icon}
                </span>
                <div>
                  <h3 className="text-xs font-bold text-white leading-normal truncate">{prod.name}</h3>
                  <span className="text-[9px] text-slate-500 block truncate font-mono">
                    {prod.id === "tomate" ? "Máximo Encarecimiento" : prod.id === "papa" ? "Insumo Sugerido" : "Comportamiento Alterno"}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 line-clamp-1 leading-tight">
                {prod.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* WORKSPACE ROW WITH SLIDERS, CHARTS AND CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="interpolation-interactive-workspace">
        
        {/* LEFT COLUMN (COL SPAN 5): RAW DISCRETE DATA POINTS & INTERPOLATOR CONTROLS */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-450" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Datos Históricos (Soportes)</h2>
              </div>
              <button
                onClick={handleAddNewRow}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition border border-blue-500/30 cursor-pointer"
                id="btn-add-point-scen-c"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva Fecha S.
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              Edite los números de día y precio directamente en las casillas. El sistema re-ordenará los puntos temporalmente ($x_0 &lt; x_1 &lt; \dots &lt; x_{`{n-1}`}$) y recalculará la cizalla en tiempo real.
            </p>

            {/* List input cells */}
            <div className="space-y-2 max-h-[295px] overflow-y-auto pr-1 scrollbar-thin">
              {sortedPoints.map((pt, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-950 p-2.5 rounded-xl border border-slate-850 hover:border-slate-800 transition">
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-550 w-6">#{idx + 1}</span>
                    
                    {/* Day Selector */}
                    <div className="flex items-center bg-slate-900 rounded-lg border border-slate-850 px-2.5 py-1">
                      <span className="text-[8.5px] uppercase font-bold text-slate-500 mr-1.5 font-sans">Día (x)</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={pt.x}
                        onChange={(e) => handleEditCell(idx, "x", e.target.value)}
                        className="w-10 text-xs font-mono font-black text-slate-100 bg-transparent text-center focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Price input S/. or Bs */}
                  <div className="flex-1 flex items-center bg-slate-900 rounded-lg border border-slate-850 px-2.5 py-1">
                    <span className="text-[8.5px] uppercase font-bold text-slate-500 mr-1.5 font-sans">Precio (y)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={pt.y}
                      onChange={(e) => handleEditCell(idx, "y", e.target.value)}
                      className="w-14 text-xs font-mono font-black text-rose-400 bg-transparent text-right focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 font-bold ml-1 font-mono">Bs</span>
                  </div>

                  {/* Remove row */}
                  <button
                    onClick={() => handleDeleteRow(idx)}
                    className="p-1 px-2.5 text-rose-500 hover:text-rose-450 hover:bg-rose-950/20 rounded-lg transition"
                    title="Eliminar este punto histórico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Runge Status indicator */}
            <div className="pt-2 border-t border-slate-850/60">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex gap-2">
                <BadgeAlert className={`w-5 h-5 shrink-0 mt-0.5 ${rungeDiagnostic.css}`} />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold block text-slate-300">Riesgo de Divergencia Global: <span className={rungeDiagnostic.css}>{rungeDiagnostic.level}</span></span>
                  <p className="text-slate-450 mt-0.5">{rungeDiagnostic.msg}</p>
                </div>
              </div>
            </div>
          </div>

          {/* METHOD SELECTOR & INTERPOLATED OUTPUT SPEEDOMETER */}
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Configuración de los Solvers Analíticos (Métodos)
            </span>

            {/* Methods tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-850" id="tabs-interpol-scen-c">
              <button
                onClick={() => setMethod("lagrange")}
                className={`flex flex-col items-center py-2.5 rounded-xl cursor-pointer transition ${
                  method === "lagrange"
                    ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow"
                    : "text-slate-450 hover:text-slate-200"
                }`}
              >
                <span className="text-xs font-black uppercase tracking-wider font-sans">Lagrange</span>
                <span className="text-[8px] text-slate-350 opacity-80 mt-0.5 font-mono">Polinómico O(n)</span>
              </button>
              <button
                onClick={() => setMethod("newton")}
                className={`flex flex-col items-center py-2.5 rounded-xl cursor-pointer transition ${
                  method === "newton"
                    ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow"
                    : "text-slate-450 hover:text-slate-200"
                }`}
              >
                <span className="text-xs font-black uppercase tracking-wider font-sans">Newton</span>
                <span className="text-[8px] text-slate-350 opacity-80 mt-0.5 font-mono">Diferencias Div.</span>
              </button>
              <button
                onClick={() => setMethod("spline")}
                className={`flex flex-col items-center py-2.5 rounded-xl cursor-pointer transition ${
                  method === "spline"
                    ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow"
                    : "text-slate-450 hover:text-slate-200"
                }`}
              >
                <span className="text-xs font-black uppercase tracking-wider font-sans">Spline Cúbico</span>
                <span className="text-[8px] text-emerald-400 font-bold mt-0.5 font-mono">Tramos Suaves</span>
              </button>
            </div>

            {/* Quick description of selected math method */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850/60 text-[11px] leading-relaxed text-slate-400">
              {method === "lagrange" && (
                <span>
                  <strong>Polinomio Interpolante de Lagrange:</strong> Construye la curva multiplicando coeficientes ponderados por factores fraccionarios continuos de Lagrange L_i(x) = Π (x - x_j) / (x_i - x_j). Pasa rigurosamente por los puntos, pero se vuelve sumamente ondulado en las proximidades del borde con muchos datos.
                </span>
              )}
              {method === "newton" && (
                <span>
                  <strong>Formulación en Diferencias Divididas de Newton:</strong> Representa algebraicamente el idéntico polinomio que Lagrange, pero mediante adición incremental de términos: P(x) = f[x_0] + Σ c_j Π (x - x_k). Es computacionalmente eficiente e ideal para añadir nuevos puntos históricos sin recalcular todo.
                </span>
              )}
              {method === "spline" && (
                <span>
                  <strong>Splines Cúbicos Naturales (Recomendado):</strong> En lugar de forzar un solo polinomio de grado n-1, articula un conjunto de trozos cúbicos S_i(x) = a_i + b_i(x - x_i) + c_i(x - x_i)^2 + d_i(x - x_i)^3. Iguala derivadas de primer y segundo orden en los nodos asegurando la mínima energía de curvatura libre.
                </span>
              )}
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN (COL SPAN 7): GRAPHIC CANVAS AND ESTIMATION CONTROLS */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          
          {/* THE SVG GRAPH CARD */}
          <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded-3xl flex-grow flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-2 flex-wrap gap-2">
              <div className="flex gap-4 items-center">
                <span className="text-[10px] font-bold uppercase text-slate-450 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  RECONSTRUCCIÓN CONTINUA DE PRECIOS
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Día 1 al 30 de Abastecimiento</span>
              </div>
              <div className="flex gap-2 text-[9px] font-mono font-bold uppercase">
                <span className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  <span className="inline-block w-2.5 h-0.5 bg-blue-400" /> {method === "lagrange" ? "Lagrange / Newton" : method === "newton" ? "Newton Div" : "Cubic Spline"}
                </span>

                {method !== "spline" && (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="inline-block w-2.5 h-0.5 border-t border-dashed border-emerald-500/60" /> Splines
                  </span>
                )}
                {method !== "lagrange" && (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="inline-block w-2.5 h-0.5 border-t border-dashed border-rose-500/60" /> Lagrange
                  </span>
                )}
              </div>
            </div>

            {/* REAL SVG CANVAS */}
            <div className="bg-[#02050f] rounded-2xl border border-slate-900 overflow-hidden relative" id="svg-chart-container">
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto block select-none">
                
                {/* Horizontal grid guide lines */}
                {[1, 2, 3].map((gStep) => {
                  const val = chartYMin + ((chartYMax - chartYMin) / 4) * gStep;
                  return (
                    <g key={gStep}>
                      <line
                        x1={margin.left}
                        y1={getSvgY(val)}
                        x2={svgW - margin.right}
                        y2={getSvgY(val)}
                        stroke="#111827"
                        strokeWidth="1.5"
                      />
                      <text
                        x={margin.left - 8}
                        y={getSvgY(val) + 3}
                        textAnchor="end"
                        className="text-[9px] font-mono fill-slate-650"
                      >
                        {val.toFixed(1)} Bs
                      </text>
                    </g>
                  );
                })}

                {/* Draw comparison curves (dashed) to clearly show overshoot */}
                {splineCurveD && (
                  <path
                    d={splineCurveD}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    opacity="0.45"
                  />
                )}
                {lagrangeCurveD && (
                  <path
                    d={lagrangeCurveD}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    opacity="0.45"
                  />
                )}

                {/* THE ACTIVE METHOD MAIN CURVE */}
                {activeCurveD && (
                  <path
                    d={activeCurveD}
                    fill="none"
                    stroke={method === "spline" ? "#10b981" : method === "lagrange" ? "#f43f5e" : "#3b82f6"}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    id="interpolated-curve-path"
                  />
                )}

                {/* Vertical queryDay interactive line indicator */}
                {queryX >= dayMin && queryX <= dayMax && (
                  <line
                    x1={getSvgX(queryX)}
                    y1={margin.top}
                    x2={getSvgX(queryX)}
                    y2={svgH - margin.bottom}
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="opacity-70 animate-pulse"
                  />
                )}

                {/* Plot the Original real data points */}
                {sortedPoints.map((pt, i) => {
                  const cx = getSvgX(pt.x);
                  const cy = getSvgY(pt.y);
                  return (
                    <g key={i}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r="5.5"
                        className="fill-blue-400 stroke-[#02050f] stroke-2 cursor-pointer hover:scale-135 transition-transform"
                      />
                      <rect
                        x={cx - 24}
                        y={cy - 22}
                        width="48"
                        height="12"
                        rx="3"
                        fill="#0b0f19/80"
                        className="fill-slate-900/90 stroke-slate-800 pointer-events-none"
                      />
                      <text
                        x={cx}
                        y={cy - 13}
                        textAnchor="middle"
                        className="text-[8.5px] font-black font-mono fill-slate-200 pointer-events-none"
                      >
                        {pt.y.toFixed(1)} Bs
                      </text>
                    </g>
                  );
                })}

                {/* Highlight query dot crossing active curve */}
                {queryX >= dayMin && queryX <= dayMax && (
                  <g>
                    <circle
                      cx={getSvgX(queryX)}
                      cy={getSvgY(interpolatedY)}
                      r="9"
                      className="fill-rose-500/30 animate-pulse"
                    />
                    <circle
                      cx={getSvgX(queryX)}
                      cy={getSvgY(interpolatedY)}
                      r="4.5"
                      className="fill-rose-550 stroke-white stroke-1.5"
                    />
                  </g>
                )}

                {/* Graphics frame axis descriptions */}
                <text x={svgW / 2} y={svgH - 8} textAnchor="middle" className="text-[9px] fill-slate-500 font-bold uppercase tracking-wider font-mono">
                  Plazo Mensual (Días de Abastecimiento)
                </text>
                <text x="14" y={svgH / 2} textAnchor="middle" transform={`rotate(-90 14 ${svgH / 2})`} className="text-[9px] fill-slate-500 font-bold uppercase tracking-wider font-mono font-sans">
                  Precio de Referencia (Bs por Kilogramo)
                </text>

                {/* X Axis major milestones ticks */}
                <text x={getSvgX(1)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-500 font-mono">D1</text>
                <text x={getSvgX(5)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-600 font-mono">D5</text>
                <text x={getSvgX(10)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-600 font-mono">D10</text>
                <text x={getSvgX(15)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-600 font-mono">D15</text>
                <text x={getSvgX(20)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-600 font-mono">D20</text>
                <text x={getSvgX(25)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-600 font-mono">D25</text>
                <text x={getSvgX(30)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-500 font-mono font-bold">D30</text>
              </svg>
            </div>

            {/* INTERACTIVE DAY ESTIMATOR CONSOLE */}
            <div className="bg-[#050811] border border-slate-900 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 mt-3">
              <div className="flex-1 space-y-1 w-full md:w-auto">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  <Calendar className="w-4 h-4 text-rose-500" />
                  <span>Estimar un Día Excluido (Día X del Mes)</span>
                </div>
                <div className="flex gap-4 pt-1.5 items-center">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={queryX}
                    onChange={(e) => setQueryX(parseInt(e.target.value) || 1)}
                    className="accent-rose-500 flex-1 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                    id="slider-estimate-day"
                  />
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={queryX}
                    onChange={(e) => setQueryX(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                    className="w-14 text-center font-bold text-slate-200 bg-slate-950 border border-slate-850 rounded-lg font-mono text-xs p-1 h-7 focus:outline-none focus:border-rose-550"
                  />
                </div>
              </div>

              {/* Estimate values panel */}
              <div className="bg-[#02050f] rounded-xl px-4 py-2.5 border border-slate-900 min-w-[210px] w-full md:w-auto flex flex-col items-center justify-center">
                <span className="text-[9.5px] text-slate-450 uppercase tracking-wider font-mono font-bold">估 - Estimación Día {queryX}</span>
                <span className="text-xl font-black text-rose-400 font-mono mt-0.5">
                  {interpolatedY.toFixed(4)} Bs
                </span>
                <span className="text-[8.5px] text-slate-550 font-mono mt-0.5 uppercase tracking-wide">
                  Mediante {method === "spline" ? "Segmentación Cúbica" : "Polinomio Completo"}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* DETAILED ANSWER SHIFT QUESTIONNAIRE FOR THE REPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="interpolation-scen-c-reports">
        
        {/* LEGISLATIVE ANSWERS AND DIAGNOSTIC CORES */}
        <div className="lg:col-span-8 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3.5 mb-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-slate-350 uppercase tracking-widest">Preguntas Científicas Resueltas (Escenario C)</h3>
          </div>

          <div className="space-y-4 text-xs">
            
            {/* Q1 */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5 mb-1 text-[13px]">
                <ChevronRight className="w-4 h-4 text-blue-405 shrink-0" />
                ¿Cuál sería el precio aproximado en un día sin dato?
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Consultando el modelo analítico para el <strong className="text-white font-mono">Día {queryX}</strong> del mes, los métodos arrojan las siguientes aproximaciones interpoladas:
              </p>
              <div className="grid grid-cols-3 gap-3 mt-2.5 font-mono text-[11px] text-slate-300">
                <div className="bg-[#02050f] p-2 rounded-lg border border-slate-900 flex flex-col text-center">
                  <span className="text-rose-450 text-[10px] uppercase font-bold text-slate-500">Lagrange</span>
                  <span className="font-bold text-slate-200 mt-1">{lagrangeY.toFixed(4)} Bs</span>
                </div>
                <div className="bg-[#02050f] p-2 rounded-lg border border-slate-900 flex flex-col text-center">
                  <span className="text-blue-400 text-[10px] uppercase font-bold text-slate-500">Newton</span>
                  <span className="font-bold text-slate-200 mt-1">{newtonY.toFixed(4)} Bs</span>
                </div>
                <div className="bg-[#02050f] p-2 rounded-lg border border-slate-900 flex flex-col text-center">
                  <span className="text-emerald-400 text-[10px] uppercase font-bold text-slate-500">Spline Cúbico</span>
                  <span className="font-bold text-slate-200 mt-1">{splineY.toFixed(4)} Bs</span>
                </div>
              </div>
              <p className="text-slate-450 text-[11px] mt-2.5 leading-relaxed">
                *Observe que <span className="font-bold text-rose-450">Lagrange</span> y <span className="font-bold text-blue-405">Newton</span> dan exactamente el mismo resultado computacional (dentro de márgenes de redondeo). Esto ocurre porque existe un <b className="text-slate-300">único polinomio interpolante de grado menor o igual a n-1</b> que pasa por n puntos dados. El método de <span className="font-bold text-emerald-400">Splines Cúbicos</span> difiere debido a que une segmentos locales de grado 3 con suavidad condicional, otorgando una estimación agrícola mucho más cercana al ritmo transaccional real.
              </p>
            </div>

            {/* Q2 */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5 mb-1 text-[13px]">
                <ChevronRight className="w-4 h-4 text-blue-405 shrink-0" />
                ¿Cómo se comporta la curva de precios durante el mes?
              </h4>
              <p className="text-slate-455 leading-relaxed">
                El comportamiento general para la categoría analizada actual se califica como:
                <span className="font-bold text-white block bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 mt-1.5 text-[11.5px] leading-relaxed">
                  {getCurveTrendStyle()}
                </span>
              </p>
            </div>

            {/* Q3 */}
            <div className="bg-[#060a16] p-4 rounded-2xl border border-slate-850">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5 mb-1 text-[13px]">
                <ChevronRight className="w-4 h-4 text-blue-405 shrink-0" />
                ¿Qué producto de la canasta básica tuvo mayor incremento?
              </h4>
              <p className="text-slate-450 leading-relaxed mb-2">
                Evaluando la diferencia neta de cotización histórica entre el primer día (D1) y el horizonte final (D30), el desglose comparativo de incremento monetario y porcentual en toda la canasta es:
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px] pt-1">
                {productRankings.map((rk, i) => (
                  <div 
                    key={rk.id} 
                    className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                      i === 0 
                        ? "bg-rose-955/20 border-rose-900/60 text-white" 
                        : "bg-slate-950/80 border-slate-900 text-slate-350"
                    }`}
                  >
                    <span className="font-bold text-[11px] truncate">{rk.icon} {rk.name.split(" ")[0]}</span>
                    <div className="mt-1 font-mono">
                      <span className="block text-slate-500 font-sans text-[9px]">D1 → D30 Price:</span>
                      <span className="font-bold">{rk.startP.toFixed(1)} → {rk.endP.toFixed(1)} Bs</span>
                      <span className={`block font-bold text-xs mt-1 ${i === 0 ? "text-rose-400" : "text-slate-200"}`}>
                        +{rk.absoluteChange.toFixed(1)} Bs (+{rk.percentChange.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-slate-450 text-[10.5px] mt-2.5 leading-relaxed">
                El análisis constata que el producto con mayor impacto inflacionario extremo fue el/la <strong className="text-rose-400 font-bold">{topProduct.name}</strong>, registrando una disparidad de <strong className="text-white">+{topProduct.absoluteChange.toFixed(1)} Bs (+{topProduct.percentChange.toFixed(0)}%)</strong>. Esto refleja la baja tolerancia del rubro a cortes súbitos de fletes desde los campos de producción.
              </p>
            </div>

            {/* Q4 & Q5 */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5 mb-1 text-[13px]">
                <ChevronRight className="w-4 h-4 text-blue-405 shrink-0" />
                ¿Qué tan confiable es la interpolación y qué pasa si los datos son muy dispersos?
              </h4>
              <p className="text-slate-455 leading-relaxed">
                La fiabilidad del modelo matemático depende críticamente del método adaptado al nivel de espaciamiento o dispersión temporal de los registros:
              </p>
              <ul className="list-disc ml-4 mt-2 text-slate-450 space-y-1.5 leading-relaxed list-inside">
                <li><strong className="text-rose-405">Con datos uniformes y pocos nodos:</strong> Lagrange y Newton son extremadamente precisos gracias a su solidez analítica perfecta de grado polinomial limitado.</li>
                <li><strong className="text-amber-500">Con datos dispersos o saltos erráticos:</strong> Forzar un polinomio de alto grado (ej. 8 o más) condena la curva completa al <span className="font-bold text-rose-450 text-xs">Fenómeno de Runge</span>, donde la curva adquiere oscilaciones falsas en los extremos para lograr cruzar por los puntos alejados, distorsionando la realidad minorista (ej. calculando precios negativos o irreales).</li>
                <li><strong className="text-emerald-450">La Solución Robusta (Cubic Splines):</strong> La aproximación segmentada de Splines Cúbicos conserva la suavidad y amortigua las distorsiones, ya que cada fragmento es coordinado únicamente por sus vecinos inmediatos, impidiendo que una alteración periférica en el Día 3 altere de forma catastrófica las cotizaciones del Día 28.</li>
              </ul>
            </div>

          </div>
        </div>

        {/* MATH EQUATION & DETAIL MATH FORMULATIONS */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-850 rounded-3xl p-5 flex flex-col justify-between h-full">
          <div className="space-y-4">
            <div className="flex items-center gap-1 border-b border-slate-900 pb-3">
              <Calculator className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-450">Panel de Ecuación Activa</span>
            </div>

            {/* Final analytical formula for Newton / Spline segment */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Expresión Analítica Global (Newton)</span>
              <div 
                className="bg-[#02050f] p-3 rounded-xl font-mono text-[11px] text-blue-300 border border-slate-900 break-words leading-relaxed select-all overflow-y-auto max-h-[140px] scrollbar-thin"
                title="Ecuación polinómica en forma expandida de diferencias divididas de Newton"
              >
                {polynomialString}
              </div>
              <p className="text-[9.5px] text-slate-550 leading-normal">
                Esta ecuación corresponde a la interpolación combinatoria de grado $n-1 = {sortedPoints.length - 1}$ que pasa alternativamente por todos los puntos de soporte definidos en el casillero.
              </p>
            </div>

            {/* Displaying Newton Divided differences computed triangular elements */}
            <div className="space-y-2 pt-2 border-t border-slate-900">
              <span className="text-[10px] font-semibold text-slate-450 block font-mono">Tabla de Diferencias Divididas Calculadas</span>
              
              <div className="rounded-xl border border-slate-900 overflow-hidden text-[10px] font-mono">
                <table className="w-full text-left">
                  <thead className="bg-[#02050f] text-slate-500 border-b border-slate-900">
                    <tr>
                      <th className="p-2 text-center">Nivel</th>
                      <th className="p-2">X Base</th>
                      <th className="p-2 text-right">Coeficiente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#090e18]">
                    {newtonCoefficients.map((coef, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                        <td className="p-2 text-center font-sans font-bold bg-[#02050f]/30">a_{idx}</td>
                        <td className="p-2 text-slate-500 truncate max-w-[120px]">
                          {idx === 0 ? "x_0" : sortedPoints.slice(0, idx).map(p => `(x-${p.x})`).join("")}
                        </td>
                        <td className="p-2 text-right text-blue-400 font-bold">{coef.toFixed(5)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Spline specific segment boundaries if active */}
            {method === "spline" && splineSegments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-900 transition-opacity">
                <span className="text-[10px] font-semibold text-emerald-450 block font-mono">Segmentos Activos de Spline Cúbico</span>
                <p className="text-[9px] text-slate-550 leading-none">Coeficientes de trazos continuos $S_i(x) = a_i + b_i dx + c_i dx^2 + d_i dx^3$</p>
                <div className="bg-[#02050f] rounded-xl p-3 border border-slate-900 max-h-[140px] overflow-y-auto scrollbar-thin text-[9.5px] font-mono text-slate-400 space-y-1.5 divide-y divide-[#0a0e18]/80">
                  {splineSegments.map((seg, i) => (
                    <div key={i} className="pt-1.5 first:pt-0">
                      <span className="text-emerald-400 font-bold block mb-0.5">Tramo {i+1} : Día [{seg.x.toFixed(0)} - {sortedPoints[i+1]?.x.toFixed(0)}]</span>
                      <div className="grid grid-cols-2 gap-x-2 text-[9px] text-slate-500">
                        <span>a = {seg.a.toFixed(3)}</span>
                        <span>b = {seg.b.toFixed(3)}</span>
                        <span>c = {seg.c.toFixed(3)}</span>
                        <span>d = {seg.d.toFixed(3)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div className="border-t border-slate-900 pt-3.5 mt-4 flex items-center gap-2 text-slate-500">
            <Sliders className="w-4 h-4 shrink-0 text-slate-650" />
            <span className="text-[9.5px] font-mono leading-none tracking-tight">
              SISTEMA DIGITAL EXCLUSIVO PARA MODELOS INFLACIONARIOS
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
