/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Calculator, 
  HelpCircle, 
  Check, 
  ArrowRight, 
  Info, 
  Award, 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw,
  Sliders, 
  ShoppingCart, 
  ChevronRight, 
  ShieldAlert, 
  BookOpen,
  Apple,
  LineChart,
  Grid
} from "lucide-react";
import { DataPoint } from "../types";

// Predefined products with datasets (Same as Scenario C for perfect coherence)
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
    name: "Papa (Insumo Sugerido)",
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
    name: "Tomate (Extremo)",
    icon: "🍅",
    description: "Altamente perecedero. Desabastecimiento que desató especulación severa.",
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
    name: "Arroz (Grano Estable)",
    icon: "🌾",
    description: "Insumo básico almacenable. Registra un incremento lento y mitigado.",
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
    description: "Regulado por cupos intermitentes de aduanas y especulación específica.",
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

interface SplineSegment {
  x: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

export default function IntegrationModule() {
  // Active product selection (allows also combined entire "canasta")
  const [selectedProductId, setSelectedProductId] = useState<string>("canasta");
  
  // Custom points maps initialized with predefined values to ensure persistence
  const [customPoints, setCustomPoints] = useState<Record<string, DataPoint[]>>({
    papa: [...PREDEFINED_PRODUCTS[0].points],
    tomate: [...PREDEFINED_PRODUCTS[1].points],
    arroz: [...PREDEFINED_PRODUCTS[2].points],
    aceite: [...PREDEFINED_PRODUCTS[3].points]
  });

  // Daily consumption multiplier (Q in kg/day or baskets/day)
  const [dailyConsumption, setDailyConsumption] = useState<number>(2.0);

  // Active integration method selector
  const [method, setMethod] = useState<"trapezoidal" | "simpson13" | "simpson38">("simpson13");

  // Selection tab for answers to user's questions 
  const [activeFaqTab, setActiveFaqTab] = useState<number>(0);

  // Hover day indicator for interactive SVG chart
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // ==========================================
  // MATHEMATICAL SOLVER : NATURAL CUBIC SPLINES
  // ==========================================
  const computeNaturalCubicSplines = (pts: DataPoint[]): SplineSegment[] => {
    const n = pts.length;
    if (n < 2) return [];

    const hVec = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      hVec[i] = pts[i+1].x - pts[i].x;
      if (hVec[i] <= 0) hVec[i] = 0.001;
    }

    const a = pts.map(p => p.y);

    const alpha = new Array(n - 1).fill(0);
    for (let i = 1; i < n - 1; i++) {
      alpha[i] = (3 / hVec[i]) * (a[i+1] - a[i]) - (3 / hVec[i-1]) * (a[i] - a[i-1]);
    }

    const l = new Array(n).fill(1);
    const mu = new Array(n).fill(0);
    const z = new Array(n).fill(0);

    l[0] = 1;
    mu[0] = 0;
    z[0] = 0;

    for (let i = 1; i < n - 1; i++) {
      l[i] = 2 * (pts[i+1].x - pts[i-1].x) - hVec[i-1] * mu[i-1];
      if (Math.abs(l[i]) < 1e-9) l[i] = 1e-9;
      mu[i] = hVec[i] / l[i];
      z[i] = (alpha[i] - hVec[i-1] * z[i-1]) / l[i];
    }

    l[n-1] = 1;
    z[n-1] = 0;
    
    const c = new Array(n).fill(0);
    const b = new Array(n - 1).fill(0);
    const d = new Array(n - 1).fill(0);

    for (let j = n - 2; j >= 0; j--) {
      c[j] = z[j] - mu[j] * c[j+1];
      b[j] = (a[j+1] - a[j]) / hVec[j] - hVec[j] * (c[j+1] + 2 * c[j]) / 3;
      d[j] = (c[j+1] - c[j]) / (3 * hVec[j]);
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

    if (xVal <= pts[0].x) {
      const dx = xVal - segments[0].x;
      return segments[0].a + segments[0].b * dx + segments[0].c * dx * dx + segments[0].d * dx * dx * dx;
    }
    if (xVal >= pts[n-1].x) {
      const i = segments.length - 1;
      const dx = xVal - segments[i].x;
      return segments[i].a + segments[i].b * dx + segments[i].c * dx * dx + segments[i].d * dx * dx * dx;
    }

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

  // Helper to retrieve the reconstructed continuous 31-day daily prices for any product ID
  const getProductDailyPrices = (prodId: string): number[] => {
    const pts = customPoints[prodId];
    if (!pts) return Array(31).fill(0);
    const sorted = [...pts].sort((a, b) => a.x - b.x);
    const segments = computeNaturalCubicSplines(sorted);
    const daily: number[] = [];
    for (let d = 1; d <= 31; d++) {
      const splineVal = evaluateSpline(segments, d, sorted);
      daily.push(Math.max(0.1, splineVal)); // safe clamp to prevent negative prices
    }
    return daily;
  };

  // Obtain active 31-day price path (Canasta Colectiva sums all 4 products)
  const getActiveDailyPrices = (): number[] => {
    if (selectedProductId === "canasta") {
      const papaPrices = getProductDailyPrices("papa");
      const tomatePrices = getProductDailyPrices("tomate");
      const arrozPrices = getProductDailyPrices("arroz");
      const aceitePrices = getProductDailyPrices("aceite");
      
      return Array.from({ length: 31 }, (_, i) => papaPrices[i] + tomatePrices[i] + arrozPrices[i] + aceitePrices[i]);
    } else {
      return getProductDailyPrices(selectedProductId);
    }
  };

  const dailyPrices = getActiveDailyPrices();

  // ==========================================
  // MATHEMATICAL SOLVERS : NUMERICAL INTEGRATION
  // ==========================================
  
  // 1. Trapezoidal Rule Composed (h spacing variable)
  const integrateTrapezoidal = (y: number[], h: number): number => {
    const n = y.length - 1; // number of intervals = 30
    let sum = y[0] + y[n];
    for (let i = 1; i < n; i++) {
      sum += 2 * y[i];
    }
    return (h / 2) * sum;
  };

  // 2. Simpson 1/3 Rule Composed (h spacing variable, demands even number of intervals)
  const integrateSimpson13 = (y: number[], h: number): number => {
    const n = y.length - 1; // n = 30 intervals (even)
    if (n % 2 !== 0) return 0;
    
    let sum = y[0] + y[n];
    for (let i = 1; i < n; i++) {
      if (i % 2 === 1) {
        sum += 4 * y[i];
      } else {
        sum += 2 * y[i];
      }
    }
    return (h / 3) * sum;
  };

  // 3. Simpson 3/8 Rule Composed (h spacing variable, demands interval count divisible by 3)
  const integrateSimpson38 = (y: number[], h: number): number => {
    const n = y.length - 1; // n = 30 intervals (divisible by 3)
    if (n % 3 !== 0) return 0;

    let sum = y[0] + y[n];
    for (let i = 1; i < n; i++) {
      if (i % 3 === 0) {
        sum += 2 * y[i];
      } else {
        sum += 3 * y[i];
      }
    }
    return ((3 * h) / 8) * sum;
  };

  // ==========================================
  // ANALYTICS & PURCHASING POWER CALCULATIONS
  // ==========================================
  const dailyExpenditures = dailyPrices.map(price => price * dailyConsumption);
  const hDay = 1.0; // Day-to-Day step

  const trapezoidalTotal = integrateTrapezoidal(dailyExpenditures, hDay);
  const simpson13Total = integrateSimpson13(dailyExpenditures, hDay);
  const simpson38Total = integrateSimpson38(dailyExpenditures, hDay);

  // Active integrated value based on user selected method
  const activeIntegratedCost = 
    method === "trapezoidal" ? trapezoidalTotal :
    method === "simpson13" ? simpson13Total : simpson38Total;

  // BASELINE COST (Scenario where prices stayed stable at Day 1 value)
  const basePriceOnDay1 = dailyPrices[0];
  const baselineDailyExpense = basePriceOnDay1 * dailyConsumption;
  const baselineTotalCost = baselineDailyExpense * 30; // 30 complete days integration under flat rate

  // Loss of purchasing power (Averge overspending)
  const excessCostAbs = activeIntegratedCost - baselineTotalCost;
  const excessCostPct = (excessCostAbs / baselineTotalCost) * 100;

  // Product contribution metrics to answer Question 5
  const getProductIntegrationReport = () => {
    return PREDEFINED_PRODUCTS.map(prod => {
      const prices = getProductDailyPrices(prod.id);
      const expenditures = prices.map(p => p * dailyConsumption);
      
      const s13Int = integrateSimpson13(expenditures, hDay);
      const basePrice = prices[0];
      const baseTotal = basePrice * dailyConsumption * 30;
      const absLoss = s13Int - baseTotal;
      const pctLoss = baseTotal > 0 ? (absLoss / baseTotal) * 100 : 0;

      return {
        id: prod.id,
        name: prod.name,
        icon: prod.icon,
        monthlySpent: s13Int,
        baselineSpent: baseTotal,
        absoluteLoss: absLoss,
        percentLoss: pctLoss
      };
    }).sort((a, b) => b.absoluteLoss - a.absoluteLoss); // Sorted by absolute impact on wallet
  };

  const productReportList = getProductIntegrationReport();
  const highestImpactProduct = productReportList[0];

  // Method differences comparisons
  const s13vsS38Diff = Math.abs(simpson13Total - simpson38Total);
  const s2vsTrapDiff = Math.abs(simpson13Total - trapezoidalTotal);

  // ==========================================
  // DATA INTERACTION HANDLERS (SUPPORT POINTS)
  // ==========================================
  const activeProductPoints = customPoints[selectedProductId] || [];
  const sortedSupportPoints = [...activeProductPoints].sort((a, b) => a.x - b.x);

  const handleEditSupportPrice = (idx: number, newValString: string) => {
    const parsed = parseFloat(newValString);
    const validPrice = isNaN(parsed) ? 1.0 : Math.max(0.1, parsed);

    const targetPt = sortedSupportPoints[idx];
    const updatedPointsList = activeProductPoints.map(p => {
      if (p.x === targetPt.x && p.y === targetPt.y) {
        return { ...p, y: validPrice };
      }
      return p;
    });

    setCustomPoints({
      ...customPoints,
      [selectedProductId]: updatedPointsList
    });
  };

  const handleResetCurrentPrices = () => {
    if (selectedProductId === "canasta") {
      // resets all
      const reverted: Record<string, DataPoint[]> = {};
      PREDEFINED_PRODUCTS.forEach(p => {
        reverted[p.id] = [...p.points];
      });
      setCustomPoints(reverted);
    } else {
      const original = PREDEFINED_PRODUCTS.find(p => p.id === selectedProductId);
      if (original) {
        setCustomPoints({
          ...customPoints,
          [selectedProductId]: [...original.points]
        });
      }
    }
  };

  // ==========================================
  // VISUAL CANVAS PLOT DRAW METRIC HELPERS
  // ==========================================
  const svgW = 600;
  const svgH = 280;
  const margin = { top: 25, right: 30, bottom: 45, left: 55 };

  const dayMin = 1;
  const dayMax = 31; // Days on X axis span from 1 to 31 (30 intervals)

  const maxYVal = Math.max(...dailyExpenditures, baselineDailyExpense, 30) * 1.12;

  const getSvgX = (day: number) => {
    return margin.left + ((day - dayMin) / (dayMax - dayMin)) * (svgW - margin.left - margin.right);
  };

  const getSvgY = (expense: number) => {
    return margin.top + (1 - expense / maxYVal) * (svgH - margin.top - margin.bottom);
  };

  // Price line path data properties
  const generatePathData = (list: number[]) => {
    if (list.length === 0) return "";
    return `M ${getSvgX(1)} ${getSvgY(list[0])} ` + 
      list.slice(1).map((val, i) => `L ${getSvgX(i + 2)} ${getSvgY(val)}`).join(" ");
  };

  const activeCurveLineD = generatePathData(dailyExpenditures);

  // Generate SVG segments depending on active integration rules to visually highlight "Trapecios" or "Simpsons"
  const renderIntegrationPolygons = () => {
    if (method === "trapezoidal") {
      // 30 vertical distinct trapezoids
      return dailyExpenditures.slice(0, 30).map((valLeft, i) => {
        const xL = getSvgX(i + 1);
        const xR = getSvgX(i + 2);
        const yL = getSvgY(valLeft);
        const yR = getSvgY(dailyExpenditures[i + 1]);
        const yZero = getSvgY(0);

        return (
          <polygon
            key={i}
            points={`${xL},${yZero} ${xL},${yL} ${xR},${yR} ${xR},${yZero}`}
            className="fill-blue-500/5 stroke-blue-500/15 hover:fill-blue-500/15 transition-colors duration-100"
            strokeWidth="0.8"
          />
        );
      });
    } else {
      // Simpson compound segments displays smooth curve shapes shaded to ground
      const pathData = activeCurveLineD + ` L ${getSvgX(31)} ${getSvgY(0)} L ${getSvgX(1)} ${getSvgY(0)} Z`;
      return (
        <path
          d={pathData}
          className="fill-emerald-500/5 stroke-emerald-500/10 hover:fill-emerald-500/10 transition-colors duration-200"
        />
      );
    }
  };

  return (
    <div className="space-y-6 fade-in animate-fadeIn" id="integration-module-escen-d-root">
      
      {/* HEADER BANNER */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4" id="integ-header-banner">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 rounded-full text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-mono tracking-widest leading-none">
                MÉTODOS DE INTEGRACIÓN NUMÉRICA
              </span>
              <span className="text-[10px] text-slate-500 font-bold font-mono">ESCENARIO D</span>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
              <ShoppingCart className="w-6 h-6 text-emerald-500 shrink-0" />
              Costo Acumulado y Pérdida del Poder Adquisitivo Familiar
            </h1>
            <p className="text-xs text-slate-400 max-w-4xl leading-relaxed">
              Calcule computacionalmente el presupuesto real devengado por una familia sumetida a un encarecimiento de alimentos. En este simulador económico, el <strong>área bajo la curva continua de gastos</strong> equivale al costo acumulado. Evalué el impacto mediante aproximación por la <strong>Regla del Trapecio</strong>, la regla parabólica de <strong>Simpson 1/3</strong> y el bloque cúbico de <strong>Simpson 3/8</strong>.
            </p>
          </div>
          <button
            onClick={handleResetCurrentPrices}
            className="self-start lg:self-center flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-300 bg-slate-950 hover:bg-slate-900 rounded-xl transition border border-slate-850 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-450" /> Reestablecer Precios original
          </button>
        </div>

        {/* Dynamic products selectors & Canasta integradora */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2" id="integration-prod-selectors">
          {/* Canasta sum option */}
          <button
            onClick={() => setSelectedProductId("canasta")}
            className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
              selectedProductId === "canasta"
                ? "bg-gradient-to-br from-emerald-950/40 via-emerald-900/10 to-transparent border-emerald-500/70"
                : "bg-slate-950/60 border-slate-850/80 hover:border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl shrink-0" role="img" aria-label="canasta">🛒</span>
              <div>
                <h3 className="text-xs font-black text-white leading-normal truncate">Canasta Completa</h3>
                <span className="text-[9px] text-emerald-500 block truncate font-mono font-bold">Papa + Tomate + Arroz + Aceite</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 line-clamp-1 leading-tight">
              Suma combinada de todos los alimentos básicos mensuales.
            </p>
          </button>

          {PREDEFINED_PRODUCTS.map((prod) => (
            <button
              key={prod.id}
              onClick={() => setSelectedProductId(prod.id)}
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
                  <h3 className="text-xs font-bold text-white leading-normal truncate">{prod.name.split(" ")[0]}</h3>
                  <span className="text-[9px] text-slate-500 block truncate font-mono">
                    D1: {customPoints[prod.id]?.[0]?.y || prod.points[0].y} Bs → D30: {customPoints[prod.id]?.[5]?.y || prod.points[5].y} Bs
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

      {/* INTERACTIVE WORKSPACE ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="integration-panels-holder">
        
        {/* LEFT COMPACT CONTROLS: CONSUMPTION MULTIPLIER AND PRICE SUPPORTS */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          
          {/* CONSUMER CONFIGURATION MODULE */}
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-850 pb-3">
              <Sliders className="w-4 h-4 text-emerald-450" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Parámetros del Gasto Familiar</h2>
            </div>

            {/* Q consumption slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-350">Volumen de Consumo Diario:</span>
                <span className="font-mono font-black text-rose-450 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20 text-xs">
                  {dailyConsumption.toFixed(2)} {selectedProductId === "canasta" ? "Canastas" : "kg"} / Día
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={dailyConsumption}
                onChange={(e) => setDailyConsumption(parseFloat(e.target.value) || 1.5)}
                className="w-full accent-rose-550 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                id="slider-daily-consump-scen-d"
              />
              <p className="text-[10.5px] text-slate-500 leading-normal font-sans">
                Aumente o disminuya la cantidad diaria adquirida del insumo. Esto escalará proporcionalmente la curva de costos integrada ($C(t) = P(t) \cdot Q$).
              </p>
            </div>
          </div>

          {/* CHOSEN COMPONENT'S PRICE EDIT PANEL */}
          <div className="bg-slate-900/40 border border-[#1e293b] p-5 rounded-3xl space-y-4 flex-grow flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block border-b border-slate-850 pb-2 mb-2">
                Hitos de Cotización Mayorista ({selectedProductId === "canasta" ? "Precios Base" : "Soportes Activos"})
              </span>

              {selectedProductId === "canasta" ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-center space-y-2 py-8">
                  <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-bold">Modo Canasta Completa Activo</p>
                  <p className="text-[10px] text-slate-500 leading-normal max-w-sm mx-auto">
                    La canasta suma dinámicamente los precios diarios de cada producto individual. Seleccione un alimento arriba (Papa, Tomate, etc.) para editar individualmente sus cotizaciones base.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                    Personalice el costo de mercado en los puntos de control. El algoritmo de <strong>Splines Cúbicos</strong> reconstruirá de inmediato la suave trayectoria de precios continuos para los 31 días.
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-[185px] overflow-y-auto pr-1">
                    {sortedSupportPoints.map((pt, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-850">
                        <span className="text-[10px] font-mono font-bold text-slate-500">Día {pt.x}</span>
                        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 w-24">
                          <input
                            type="number"
                            step="0.5"
                            value={pt.y}
                            onChange={(e) => handleEditSupportPrice(idx, e.target.value)}
                            className="w-full text-right text-xs font-black text-rose-450 bg-transparent font-mono focus:outline-none"
                          />
                          <span className="text-[9px] text-slate-500 font-bold ml-1 font-mono">Bs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stable price state overview metric */}
            <div className="bg-[#02050f] p-3 rounded-xl border border-slate-850/80 text-[11px] leading-relaxed mt-2 flex items-center justify-between gap-3 text-slate-400">
              <span className="font-medium shrink-0">Cotización de Partida (Día 1):</span>
              <span className="font-mono font-bold text-white text-xs text-right truncate">
                {dailyPrices[0].toFixed(2)} Bs / {selectedProductId === "canasta" ? "Canasta" : "kg"}
              </span>
            </div>
          </div>

          {/* INTEGRATION SELECTOR TABS CARD */}
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Integrador Numérico Activo
            </span>

            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-850" id="tabs-integr-scen-d">
              <button
                onClick={() => setMethod("trapezoidal")}
                className={`flex flex-col items-center py-2 rounded-xl cursor-pointer transition ${
                  method === "trapezoidal"
                    ? "bg-slate-800 text-white shadow font-bold"
                    : "text-slate-450 hover:text-slate-200"
                }`}
              >
                <span className="text-[11px] uppercase tracking-wide font-sans">Trapecio</span>
                <span className="text-[8px] text-slate-500 font-mono">Errores $O(h^2)$</span>
              </button>
              <button
                onClick={() => setMethod("simpson13")}
                className={`flex flex-col items-center py-2 rounded-xl cursor-pointer transition ${
                  method === "simpson13"
                    ? "bg-emerald-600 text-white shadow font-bold"
                    : "text-slate-450 hover:text-slate-200"
                }`}
              >
                <span className="text-[11px] uppercase tracking-wide font-sans">Simpson 1/3</span>
                <span className="text-[8px] text-emerald-350 font-bold font-mono">Errores $O(h^4)$</span>
              </button>
              <button
                onClick={() => setMethod("simpson38")}
                className={`flex flex-col items-center py-2 rounded-xl cursor-pointer transition ${
                  method === "simpson38"
                    ? "bg-blue-600 text-white shadow font-bold"
                    : "text-slate-450 hover:text-slate-200"
                }`}
              >
                <span className="text-[11px] uppercase tracking-wide font-sans">Simpson 3/8</span>
                <span className="text-[8px] text-blue-350 font-bold font-mono">Cúbico $O(h^4)$</span>
              </button>
            </div>

            <div className="text-[10.5px] leading-relaxed text-slate-450 font-medium">
              {method === "trapezoidal" && (
                <span>
                  <strong>Trapecio Compuesto (30 intervalos):</strong> Aproxima el área interpolando linealmente los precios entre cada día. El error de truncamiento se expresa como de orden O(h²), sobre-estimando ligeramente en trayectorias con concavidad marcada.
                </span>
              )}
              {method === "simpson13" && (
                <span>
                  <strong>Simpson 1/3 Compuesto (30 intervalos - Par):</strong> Ajusta arcos parabólicos continuos de segundo grado para pares sucesivos de días. Con un error de orden O(h⁴), reduce drásticamente las imprecisiones de curvatura.
                </span>
              )}
              {method === "simpson38" && (
                <span>
                  <strong>Simpson 3/8 Compuesto (30 intervalos - Divisible por 3):</strong> Emplea aproximaciones cúbicas continuas de tercer grado agrupando bloques de 3 intervalos consecutivos. Ideal para modelar transiciones altamente dinámicas.
                </span>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT CHART COMPONENT AND COMPARISONS SPEEDOMETERS */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          
          {/* THE SVG GRAPH CARD */}
          <div className="bg-[#0b0f19] border border-slate-800 p-5 rounded-3xl flex-grow flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-3 flex-wrap gap-2">
              <div className="flex gap-4 items-center">
                <span className="text-[10px] font-bold uppercase text-slate-450 flex items-center gap-1 font-mono">
                  <LineChart className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Visualizador de Área Integrada (Egresos Mensuales)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Días 1 al 31 del Mes</span>
              </div>
              <div className="flex gap-2 text-[9px] font-mono font-bold uppercase">
                <span className="flex items-center gap-1 bg-rose-500/10 text-rose-450 px-2.5 py-0.5 rounded border border-rose-500/20">
                  <span className="inline-block w-2.5 h-0.5 bg-rose-400 mr-1" /> Gasto Real Inflacionario
                </span>
                <span className="flex items-center gap-1 bg-slate-500/10 text-slate-400 px-2.5 py-0.5 rounded border border-slate-800">
                  <span className="inline-block w-2.5 h-0.5 border-t border-dashed border-slate-500 mr-1" /> Base Estable (Sin Inflación)
                </span>
              </div>
            </div>

            {/* GRAPH PLOT WINDOW CONTAINER */}
            <div 
              className="bg-[#02050f] rounded-2xl border border-slate-900 overflow-hidden relative" 
              id="svg-integration-area-container"
            >
              <svg 
                viewBox={`0 0 ${svgW} ${svgH}`} 
                className="w-full h-auto block select-none"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const xRel = e.clientX - rect.left;
                  const percentOfPlot = (xRel - margin.left) / (svgW - margin.left - margin.right);
                  const approxDay = Math.round(1 + percentOfPlot * 30);
                  if (approxDay >= 1 && approxDay <= 31) {
                    setHoveredDay(approxDay);
                  } else {
                    setHoveredDay(null);
                  }
                }}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {/* Horizontal Guide Grid Lines */}
                {[0.25, 0.5, 0.75].map((scale, gIdx) => {
                  const val = maxYVal * scale;
                  return (
                    <g key={gIdx}>
                      <line
                        x1={margin.left}
                        y1={getSvgY(val)}
                        x2={svgW - margin.right}
                        y2={getSvgY(val)}
                        stroke="#111827"
                        strokeWidth="1"
                      />
                      <text
                        x={margin.left - 8}
                        y={getSvgY(val) + 3}
                        textAnchor="end"
                        className="text-[9px] font-mono fill-slate-705"
                      >
                        {val.toFixed(0)} Bs
                      </text>
                    </g>
                  );
                })}

                {/* SHADED BASELINE INTEGRATION AREA */}
                <rect
                  x={getSvgX(1)}
                  y={getSvgY(baselineDailyExpense)}
                  width={getSvgX(31) - getSvgX(1)}
                  height={getSvgY(0) - getSvgY(baselineDailyExpense)}
                  fill="#475569"
                  fillOpacity="0.04"
                />

                {/* SHADED RECONSTRUCTED INTEGRATION REGULA POLYGONS ACCORDING TO SELECTED INTEGRATOR */}
                {renderIntegrationPolygons()}

                {/* BASELINE PRICE LIMIT LINE (FLAT STEADY VALUE) */}
                <line
                  x1={getSvgX(1)}
                  y1={getSvgY(baselineDailyExpense)}
                  x2={getSvgX(31)}
                  y2={getSvgY(baselineDailyExpense)}
                  stroke="#475569"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.8"
                />
                <text
                  x={getSvgX(29)}
                  y={getSvgY(baselineDailyExpense) - 6}
                  textAnchor="end"
                  className="text-[8.5px] fill-slate-500 font-bold uppercase tracking-wider font-mono bg-slate-900"
                >
                  Gasto Constante Base: {baselineDailyExpense.toFixed(1)} Bs/día
                </text>

                {/* INFLATION ACTIVE PRICE LINE PATH */}
                {activeCurveLineD && (
                  <path
                    d={activeCurveLineD}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    id="integration-curve-line"
                  />
                )}

                {/* Plot the historical support nodes */}
                {sortedSupportPoints.map((pt, i) => {
                  const targetDailyExpense = pt.y * dailyConsumption;
                  const cx = getSvgX(pt.x);
                  const cy = getSvgY(targetDailyExpense);
                  return (
                    <g key={i}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r="5"
                        className="fill-rose-500 stroke-[#02050f] stroke-2 cursor-pointer hover:scale-130 transition-transform"
                      />
                    </g>
                  );
                })}

                {/* Draw hovered day vertical reference line and tooltip pointers */}
                {hoveredDay && hoveredDay <= 31 && (
                  <g>
                    <line
                      x1={getSvgX(hoveredDay)}
                      y1={margin.top}
                      x2={getSvgX(hoveredDay)}
                      y2={svgH - margin.bottom}
                      stroke="#10b981"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx={getSvgX(hoveredDay)}
                      cy={getSvgY(dailyExpenditures[hoveredDay - 1])}
                      r="4.5"
                      className="fill-emerald-500 stroke-white stroke-1"
                    />
                    <rect
                      x={getSvgX(hoveredDay) > svgW - 140 ? getSvgX(hoveredDay) - 105 : getSvgX(hoveredDay) + 8}
                      y={margin.top + 10}
                      width="95"
                      height="46"
                      rx="6"
                      fill="#02050f"
                      stroke="#1e293b"
                      strokeWidth="1"
                      fillOpacity="0.95"
                    />
                    <text
                      x={getSvgX(hoveredDay) > svgW - 140 ? getSvgX(hoveredDay) - 105 + 8 : getSvgX(hoveredDay) + 16}
                      y={margin.top + 23}
                      className="text-[9.5px] fill-slate-200 font-bold font-sans"
                    >
                      Día del Mes: {hoveredDay}
                    </text>
                    <text
                      x={getSvgX(hoveredDay) > svgW - 140 ? getSvgX(hoveredDay) - 105 + 8 : getSvgX(hoveredDay) + 16}
                      y={margin.top + 36}
                      className="text-[9px] fill-rose-400 font-bold font-mono font-sans"
                    >
                      Gasto: {dailyExpenditures[hoveredDay - 1].toFixed(1)} Bs
                    </text>
                    <text
                      x={getSvgX(hoveredDay) > svgW - 140 ? getSvgX(hoveredDay) - 105 + 8 : getSvgX(hoveredDay) + 16}
                      y={margin.top + 47}
                      className="text-[7.5px] fill-slate-500 font-mono font-sans"
                    >
                      Precio: {dailyPrices[hoveredDay - 1].toFixed(2)} Bs
                    </text>
                  </g>
                )}

                {/* GRAPH FRAME LABELS */}
                <text x={svgW / 2} y={svgH - 6} textAnchor="middle" className="text-[9px] fill-slate-500 font-bold uppercase tracking-wider font-mono">
                  Plazo Mensual Integrado (Intervalos de 1 Día)
                </text>
                <text x="14" y={(svgH - margin.bottom) / 2 + 10} textAnchor="middle" transform={`rotate(-90 14 ${(svgH - margin.bottom) / 2 + 10})`} className="text-[9px] fill-slate-500 font-bold uppercase tracking-wider font-mono">
                  Gasto Familiar Diario (Bs / Día)
                </text>

                {/* Tick markers */}
                <text x={getSvgX(1)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-500 font-mono font-bold">D1</text>
                <text x={getSvgX(5)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-600 font-mono">D5</text>
                <text x={getSvgX(10)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-600 font-mono">D10</text>
                <text x={getSvgX(15)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-600 font-mono">D15</text>
                <text x={getSvgX(20)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-600 font-mono">D20</text>
                <text x={getSvgX(25)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-600 font-mono">D25</text>
                <text x={getSvgX(31)} y={svgH - 24} textAnchor="middle" className="text-[9.5px] fill-slate-500 font-mono font-bold">D31</text>
              </svg>
            </div>

            {/* THREE COMPETING SOLVER METRIC OUTPUTS */}
            <div className="grid grid-cols-3 gap-3 mt-4" id="integration-speedometer-cards">
              
              {/* TRAPEZOIDAL */}
              <div 
                className={`bg-[#050811] rounded-2xl p-3 border transition-all duration-150 relative ${
                  method === "trapezoidal" ? "border-slate-500 shadow-md" : "border-slate-850/60"
                }`}
              >
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 font-mono block">R. del Trapecio</span>
                  <span className="text-sm sm:text-[15.5px] font-black font-mono block text-white">
                    {trapezoidalTotal.toFixed(2)} Bs
                  </span>
                  <span className="text-[8px] text-slate-550 block font-mono">Lineales compuestas</span>
                </div>
                {method === "trapezoidal" && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                  </span>
                )}
              </div>

              {/* SIMPSON 1/3 */}
              <div 
                className={`bg-[#050811] rounded-2xl p-3 border transition-all duration-150 relative ${
                  method === "simpson13" ? "border-emerald-500 shadow-md" : "border-slate-850/60"
                }`}
              >
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#10b981] font-mono block">Simpson 1/3</span>
                  <span className="text-sm sm:text-[15.5px] font-black font-mono block text-emerald-400">
                    {simpson13Total.toFixed(2)} Bs
                  </span>
                  <span className="text-[8px] text-[#10b981]/70 block font-mono">Parabolas compuestas</span>
                </div>
                {method === "simpson13" && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>

              {/* SIMPSON 3/8 */}
              <div 
                className={`bg-[#050811] rounded-2xl p-3 border transition-all duration-150 relative ${
                  method === "simpson38" ? "border-blue-500 shadow-md" : "border-slate-850/60"
                }`}
              >
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-blue-450 font-mono block">Simpson 3/8</span>
                  <span className="text-sm sm:text-[15.5px] font-black font-mono block text-blue-400">
                    {simpson38Total.toFixed(2)} Bs
                  </span>
                  <span className="text-[8px] text-blue-400/70 block font-mono">Cúbicos compuestos</span>
                </div>
                {method === "simpson38" && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* DETAILED RESULTS & QUESTIONS SUBSECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="integration-reports-and-metrics-panel">
        
        {/* LEGISLATIVE SCIENTIFIC ANSWERS TO FIVE PRESCRIBED QUESTIONS */}
        <div className="lg:col-span-7 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-805/85 pb-3.5 mb-2">
            <BookOpen className="w-5 h-5 text-emerald-405 shrink-0" />
            <h3 className="font-bold text-sm text-slate-350 uppercase tracking-widest">Preguntas Científicas Resueltas (Escenario D)</h3>
          </div>

          {/* Tab selectors for five questions */}
          <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850" id="answers-tabs-index">
            {["Q1", "Q2", "Q3", "Q4", "Q5"].map((q, qIdx) => (
              <button
                key={qIdx}
                onClick={() => setActiveFaqTab(qIdx)}
                className={`py-1.5 rounded-lg text-xs font-black cursor-pointer transition ${
                  activeFaqTab === qIdx 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="text-xs space-y-3 pt-2" id="faq-active-tab-content">
            
            {/* Q1: Gasto Mensual acumulado */}
            {activeFaqTab === 0 && (
              <div className="space-y-2 animate-fadeIn">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block font-mono">PREGUNTA 1 • GASTO ACUMULADO</span>
                <h4 className="font-bold text-slate-200 text-sm leading-tight">¿Cuánto gastó una familia en total de manera acumulada durante el mes?</h4>
                <p className="text-slate-400 leading-relaxed">
                  Bajo la actual selección de <strong className="text-white">{selectedProductId === "canasta" ? "Canasta Colectiva Familiar" : PREDEFINED_PRODUCTS.find(p => p.id === selectedProductId)?.name}</strong> con el método continuo <strong className="text-emerald-400">{method === "simpson13" ? "Simpson 1/3 Composto" : method === "simpson38" ? "Simpson 3/8 Compuesto" : "Trapecio Compuesto"}</strong>, el desembolso total asciende a:
                </p>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 mt-2 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 block">GASTO MENSUAL INTEGRADO</span>
                    <span className="text-2xl font-black text-rose-455 font-mono">{activeIntegratedCost.toFixed(3)} Bs</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-450 text-right max-w-[200px]">
                    Basado en una demanda constante de <strong className="text-white font-mono">{dailyConsumption.toFixed(1)} {selectedProductId === "canasta" ? "unid" : "kg"}</strong> por día.
                  </span>
                </div>
                <p className="text-slate-450 mt-2">
                  *Este monto se determina computando el área matemática exacta situada bajo el spline de cotización agrícola. Los diferentes solvers arrojan pequeñas variaciones locales como consecuencia de su error de truncamiento inherente.
                </p>
              </div>
            )}

            {/* Q2: Costo sin inflacion */}
            {activeFaqTab === 1 && (
              <div className="space-y-2 animate-fadeIn">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block font-mono">PREGUNTA 2 • ESCENARIO IDEAL SIN INFLACIÓN</span>
                <h4 className="font-bold text-slate-200 text-sm leading-tight">¿Cuánto hubiera gastado la familia si los precios NO hubiesen subido?</h4>
                <p className="text-slate-400 leading-relaxed">
                  En condiciones estables donde la cotización del mercado no aumentara y se mantuviera eternamente fija en los precios del primer día (<strong className="text-white font-mono">{dailyPrices[0].toFixed(2)} Bs</strong>), el costo total acumulado del consumo hubiese sido:
                </p>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 mt-2 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 block">VALOR DE PRESUPUESTO CONTROL</span>
                    <span className="text-2xl font-black text-slate-300 font-mono">{baselineTotalCost.toFixed(3)} Bs</span>
                  </div>
                  <span className="text-[11px] text-slate-450 text-right max-w-[240px]">
                    Calculado como un rectángulo plano ideal: <span className="text-slate-200 font-mono">P_inicial ({dailyPrices[0].toFixed(1)} Bs) • {dailyConsumption} • 30 d</span>.
                  </span>
                </div>
                <p className="text-slate-450 mt-2">
                  Esto demuestra que bajo estabilidad inflacionaria, la previsibilidad del presupuesto doméstico permite asegurar una dieta básica balanceada sin desbalances presupuestarios imprevistos.
                </p>
              </div>
            )}

            {/* Q3: Perdida poder adquisitivo */}
            {activeFaqTab === 2 && (
              <div className="space-y-2 animate-fadeIn">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block font-mono">PREGUNTA 3 • SOBREGANANCIA NEGATIVA</span>
                <h4 className="font-bold text-slate-200 text-sm leading-tight">¿Cuál fue la pérdida aproximada de poder adquisitivo del bolsillo familiar?</h4>
                <p className="text-slate-400 leading-relaxed">
                  La inflación sustrae poder de compra obligando al hogar a depositar Bs extras para adquirir la misma canasta. Esta pérdida, calculada matemáticamente como el área excedente entre la curva oscilatoria y la base del día 0, asciende a:
                </p>
                <div className="bg-slate-955/15 p-4 rounded-2xl border border-rose-900/40 mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 block">DESEMBOLSO EXTRA NETO</span>
                    <span className="text-xl font-black text-rose-400 font-mono">+{excessCostAbs.toFixed(3)} Bs</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 block">INCREMETO RELATIVO DEL GASTO</span>
                    <span className="text-xl font-black text-rose-455 font-mono">+{excessCostPct.toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-slate-450 mt-2 leading-relaxed">
                  En términos prácticos, la familia experimentó una devaluación del <strong className="text-slate-300">{excessCostPct.toFixed(0)}%</strong> de su dinero asignado a esta categoría de alimentos. Necesitan ese porcentaje exacto de ingresos complementarios solo para mantener cubierto el abastecimiento estándar inicial.
                </p>
              </div>
            )}

            {/* Q4: Precision integradores */}
            {activeFaqTab === 3 && (
              <div className="space-y-2 animate-fadeIn">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block font-mono">PREGUNTA 4 • EVALUACIÓN DE CONGREGACIÓN TÉCNICA</span>
                <h4 className="font-bold text-slate-200 text-sm leading-tight">¿Qué método de integración fue más preciso y por qué?</h4>
                <p className="text-slate-400 leading-relaxed">
                  Para el modelado de dinámicas inflacionarias con curvas suaves continuas generadas por Splines, 
                  los métodos de <strong className="text-[#10b981]">Simpson 1/3</strong> y <strong className="text-blue-450">Simpson 3/8</strong> son sustancialmente más exactos que la <strong className="text-slate-300">Regla del Trapecio</strong>.
                </p>
                <div className="border border-slate-850 bg-slate-950 p-3 rounded-xl space-y-2 leading-relaxed text-slate-450">
                  <p>
                    • <strong>Regla del Trapecio (orden O(h²)):</strong> Une los precios diarios con tramos rectos. Para tramos cóncavos, acumula un desvío que sobre-estima el egreso familiar neto.
                  </p>
                  <p>
                    • <strong>Regla de Simpson (orden O(h⁴)):</strong> Al usar curvaturas cuadráticas o cúbicas, amortigua de forma idónea las dinámicas de aceleración y picos de precios, amortiguando al mínimo el error de aproximación.
                  </p>
                </div>
                <p className="text-slate-450 text-[10.5px]">
                  *Estructuralmente, al evaluar con un paso uniforme de h = 1 día sobre 30 intervalos, <strong>Simpson 3/8</strong> se corona como el método idóneo debido al uso de interpoladores locales de grado 3, amoldándose mejor a las uniones elásticas de los splines.
                </p>
              </div>
            )}

            {/* Q5: Producto que mas afecto */}
            {activeFaqTab === 4 && (
              <div className="space-y-2 animate-fadeIn">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block font-mono">PREGUNTA 5 • IMPACTO POR PRODUCTOS INDIVIDUALES</span>
                <h4 className="font-bold text-slate-200 text-sm leading-tight">¿Qué producto individual afectó más severamente al gasto mensual?</h4>
                <p className="text-slate-400 leading-relaxed">
                  De acuerdo con la integración individual por separado en el sistema de abastecimiento de la canasta, el desglose e impacto de sobrecobro absoluto es:
                </p>
                
                <div className="space-y-1.5 pt-1">
                  {productReportList.map((pr, index) => (
                    <div key={pr.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-850/70 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{pr.icon}</span>
                        <span className="font-bold text-slate-200">{pr.name.split(" ")[0]}</span>
                      </div>
                      <div className="flex gap-4 font-mono">
                        <span className="text-slate-500">Integrado: {pr.monthlySpent.toFixed(1)} Bs</span>
                        <span className="font-bold text-rose-450">Excedente: +{pr.absoluteLoss.toFixed(1)} Bs (+{pr.percentLoss.toFixed(0)}%)</span>
                        {index === 0 && <span className="bg-rose-500/10 text-rose-400 text-[8px] font-black uppercase px-1.5 rounded flex items-center tracking-widest animate-pulse border border-rose-500/25">MÁXIMO INFLADOR</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-slate-450 mt-2">
                  El análisis certifica que el producto con mayor impacto absoluto dañino fue el/la <strong className="text-rose-400">{highestImpactProduct.name.split(" ")[0]}</strong> con una fianza de sobregasto forzado de <strong className="text-white">+{highestImpactProduct.absoluteLoss.toFixed(2)} Bs</strong>. Esto se atribuye al vertiginoso ascenso de su precio unitario, el cual se triplicó a lo largo de los 30 días de crisis.
                </p>
              </div>
            )}

          </div>

        </div>

        {/* INTEGRATION REPORT SIDE TABLE CARD */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl flex flex-col h-[405px] overflow-hidden">
          <div className="p-4 bg-slate-900/50 border-b border-slate-850 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Auditoría Técnica</h3>
              <p className="text-[10px] text-slate-500 font-mono">Control de espaciamiento y discretización</p>
            </div>
            <Award className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="space-y-4 overflow-auto flex-grow p-4 scrollbar-thin text-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Métricas de la Simulación</span>
            
            <div className="bg-[#020617] p-4 rounded-xl space-y-3 font-mono text-[11px] text-slate-400 border border-slate-850">
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span>Paso Temporal (h)</span>
                <span className="font-bold text-slate-300">1.0 Día</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span>Intervalos de Integración (n)</span>
                <span className="font-bold text-slate-300">30</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span>Puntos de Muestreo (N)</span>
                <span className="font-bold text-slate-300">31</span>
              </div>
              <div className="flex justify-between border-b border-[#111827] pb-1.5">
                <span>Spline de Reconstrucción</span>
                <span className="font-bold text-emerald-405">Cúbico Natural</span>
              </div>
              <div className="flex justify-between pb-0.5">
                <span>Diferencia S1/3 vs S3/8</span>
                <span className="font-bold text-indigo-400">{s13vsS38Diff.toFixed(5)} Bs</span>
              </div>
              <div className="flex justify-between pb-0.5">
                <span>Diferencia S1/3 vs Trapecio</span>
                <span className="font-bold text-rose-450">{s2vsTrapDiff.toFixed(5)} Bs</span>
              </div>
            </div>

            <div className="border border-slate-850 bg-slate-900/10 rounded-xl p-4 space-y-1.5">
              <h4 className="font-bold text-slate-300 text-[11px] flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-emerald-450" />
                Fiabilidad de Integridad Numérica
              </h4>
              <p className="text-slate-500 leading-relaxed text-[10px]">
                En aproximaciones diarias ($h=1$), la cercanía entre Simpson 1/3 y Simpson 3/8 ($\Delta \approx$ {s13vsS38Diff.toFixed(2)} Bs) ratifica una excelente convergencia. El método de los trapecios linealizados sobredimensiona el gasto familiar bruto al ignorar las transiciones elásticas suaves en los despliegues logísticos de precios.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
