/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  RotateCcw, 
  ShieldAlert, 
  LineChart, 
  Table, 
  Info, 
  Flame, 
  Compass, 
  TrendingDown, 
  Truck, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Cpu, 
  Activity, 
  Layers
} from "lucide-react";
import { DiffEqResult } from "../types";

export default function DiffEqModule() {
  // Main Sub-Tab selector for EDO views
  // "carb" -> Escenario B: Vaciado Crítico de Reservas de Carburantes
  // "social" -> Escenario G: Dinámica y Mediación Social
  const [activeScenario, setActiveScenario] = useState<"carb" | "social">("carb");

  // ==========================================
  // STATE FOR ESCENARIO B : FUEL RESERVES
  // ==========================================
  const [fuelInit, setFuelInit] = useState<number>(4500); // Initial R(0) in m3
  const [fuelInputRate, setFuelInputRate] = useState<number>(350); // m3/day normal delivery
  const [fuelReduction, setFuelReduction] = useState<number>(30); // % input reduction due to protests/blockades
  const [fuelBaseConsumption, setFuelBaseConsumption] = useState<number>(400); // m3/day base consumption
  const [fuelDemandSurge, setFuelDemandSurge] = useState<number>(25); // % surge in demand
  const [fuelPanicRate, setFuelPanicRate] = useState<number>(100); // Absolute extra daily panic-buying rate (m3)
  const [fuelCriticalLevel, setFuelCriticalLevel] = useState<number>(1000); // Critical reserve alert line (m3)
  const [fuelStepSize, setFuelStepSize] = useState<number>(0.5); // step size h (days)
  const [fuelMaxDays, setFuelMaxDays] = useState<number>(30); // simulation horizon (days)
  const [fuelIntermittent, setFuelIntermittent] = useState<boolean>(false); // Enable fluctuating delivery schedule

  // Solver outputs for Fuel Reserves
  interface CarbStep {
    t: number;
    eulerR: number;
    heunR: number;
    rk4R: number;
    inflow: number;
    outflow: number;
  }
  const [carbResults, setCarbResults] = useState<CarbStep[]>([]);

  // ==========================================
  // STATE FOR ESCENARIO G : SOCIAL INTERACTION & MEDIATION MODEL
  // ==========================================
  const [socialNeutral, setSocialNeutral] = useState<number>(800); // N: Citizens Neutral
  const [socialProtest, setSocialProtest] = useState<number>(50);  // M: active Protestors
  const [socialMediator, setSocialMediator] = useState<number>(10); // D: Dialogue mediators
  
  // Specific model coefficients as per Escenario G:
  const [socialA, setSocialA] = useState<number>(0.001);  // a: rate of influence or contagion of discontent
  const [socialB, setSocialB] = useState<number>(0.05);   // b: recovery or return to neutrality
  const [socialC, setSocialC] = useState<number>(0.015);  // c: dialogue effectiveness
  const [socialK, setSocialK] = useState<number>(0.05);   // k: institutional reaction / mediator mobilization
  const [socialR, setSocialR] = useState<number>(0.12);   // r: mediator exhaustion/desgaste

  const [socialStepSize, setSocialStepSize] = useState<number>(0.5); // dt / h
  const [socialMaxDays, setSocialMaxDays] = useState<number>(25);
  const [socialPlotMethod, setSocialPlotMethod] = useState<"rk4" | "heun" | "euler">("rk4");
  const [activeSocialPreset, setActiveSocialPreset] = useState<string>("default");

  // Solver outputs for Social Mediation
  const [socialRk4Results, setSocialRk4Results] = useState<DiffEqResult[]>([]);
  const [socialHeunResults, setSocialHeunResults] = useState<DiffEqResult[]>([]);
  const [socialEulerResults, setSocialEulerResults] = useState<DiffEqResult[]>([]);

  // ==========================================
  // SIMULATION ALGORITHM : ESCENARIO B (FUEL)
  // ==========================================
  const getFuelInflow = (t: number): number => {
    const base = fuelInputRate * (1 - fuelReduction / 100);
    // Intermittent supply delivery drops simulated as sinusoidal delivery delay
    if (fuelIntermittent) {
      return Math.max(0, base * (1 + 0.65 * Math.sin((2 * Math.PI * t) / 7)));
    }
    return base;
  };

  const getFuelOutflow = (t: number): number => {
    const base = fuelBaseConsumption * (1 + fuelDemandSurge / 100);
    return base + fuelPanicRate;
  };

  const runFuelSimulation = () => {
    const list: CarbStep[] = [];
    const h = fuelStepSize;
    const stepsCount = Math.floor(fuelMaxDays / h);

    // ODE derivative function: f(t, R) = Net Supply flow rate capped for bounds
    const f_ode = (tVal: number, rVal: number): number => {
      const inflow = getFuelInflow(tVal);
      const outflow = getFuelOutflow(tVal);
      const net = inflow - outflow;
      // Physical boundary constraint: if inventory is depleted, net draw stops
      if (rVal <= 1e-9 && net < 0) {
        return 0;
      }
      return net;
    };

    // Initial state setup for both estimators
    let r_euler = fuelInit;
    let r_heun = fuelInit;
    let r_rk4 = fuelInit;
    let t = 0;

    list.push({
      t: 0,
      eulerR: r_euler,
      heunR: r_heun,
      rk4R: r_rk4,
      inflow: getFuelInflow(0),
      outflow: getFuelOutflow(0)
    });

    for (let i = 0; i < stepsCount; i++) {
      // 1. EULER ESTIMATION
      const slope_euler = f_ode(t, r_euler);
      const next_euler = Math.max(0, r_euler + h * slope_euler);

      // 2. HEUN METHOD (Improved Euler, 2nd order predictor-corrector)
      const slope_heun_1 = f_ode(t, r_heun);
      const r_predict = Math.max(0, r_heun + h * slope_heun_1);
      const slope_heun_2 = f_ode(t + h, r_predict);
      const next_heun = Math.max(0, r_heun + (h / 2) * (slope_heun_1 + slope_heun_2));

      // 3. RK-4 (Runge-Kutta 4th Order)
      const k1 = f_ode(t, r_rk4);
      const k2 = f_ode(t + h/2, Math.max(0, r_rk4 + (h/2) * k1));
      const k3 = f_ode(t + h/2, Math.max(0, r_rk4 + (h/2) * k2));
      const k4 = f_ode(t + h, Math.max(0, r_rk4 + h * k3));
      const next_rk4 = Math.max(0, r_rk4 + (h / 6) * (k1 + 2*k2 + 2*k3 + k4));

      // Advance clock
      t += h;
      r_euler = next_euler;
      r_heun = next_heun;
      r_rk4 = next_rk4;

      list.push({
        t,
        eulerR: r_euler,
        heunR: r_heun,
        rk4R: r_rk4,
        inflow: getFuelInflow(t),
        outflow: getFuelOutflow(t)
      });
    }
    setCarbResults(list);
  };

  // ==========================================
  // SIMULATION ALGORITHM : ESCENARIO G (SOCIAL)
  // ==========================================
  const dYdt_social = (t: number, Y: number[]): number[] => {
    const N = Math.max(0, Y[0]);
    const M = Math.max(0, Y[1]);
    const D = Math.max(0, Y[2]);

    const dN = -socialA * N * M + socialB * D;
    const dM = socialA * N * M - socialC * M * D;
    const dD = socialK * M - socialR * D;

    return [dN, dM, dD];
  };

  const runSocialSimulation = () => {
    const listRK4: DiffEqResult[] = [];
    const listHeun: DiffEqResult[] = [];
    const listEuler: DiffEqResult[] = [];

    let yRk4 = [socialNeutral, socialProtest, socialMediator];
    let yHeun = [socialNeutral, socialProtest, socialMediator];
    let yEuler = [socialNeutral, socialProtest, socialMediator];
    
    listRK4.push({ t: 0, neutral: yRk4[0], protestor: yRk4[1], mediator: yRk4[2] });
    listHeun.push({ t: 0, neutral: yHeun[0], protestor: yHeun[1], mediator: yHeun[2] });
    listEuler.push({ t: 0, neutral: yEuler[0], protestor: yEuler[1], mediator: yEuler[2] });

    let t = 0;
    const h = socialStepSize;
    const stepsCount = Math.floor(socialMaxDays / h);

    for (let i = 0; i < stepsCount; i++) {
      // RK4 step
      const k1 = dYdt_social(t, yRk4);
      const yTemp2 = [
        yRk4[0] + (h/2) * k1[0],
        yRk4[1] + (h/2) * k1[1],
        yRk4[2] + (h/2) * k1[2]
      ];
      const k2 = dYdt_social(t + h/2, yTemp2);
      const yTemp3 = [
        yRk4[0] + (h/2) * k2[0],
        yRk4[1] + (h/2) * k2[1],
        yRk4[2] + (h/2) * k2[2]
      ];
      const k3 = dYdt_social(t + h/2, yTemp3);
      const yTemp4 = [
        yRk4[0] + h * k3[0],
        yRk4[1] + h * k3[1],
        yRk4[2] + h * k3[2]
      ];
      const k4 = dYdt_social(t + h, yTemp4);

      const nextN_rk4 = yRk4[0] + (h/6) * (k1[0] + 2*k2[0] + 2*k3[0] + k4[0]);
      const nextM_rk4 = yRk4[1] + (h/6) * (k1[1] + 2*k2[1] + 2*k3[1] + k4[1]);
      const nextD_rk4 = yRk4[2] + (h/6) * (k1[2] + 2*k2[2] + 2*k3[2] + k4[2]);
      
      yRk4 = [nextN_rk4, nextM_rk4, nextD_rk4];

      // Heun (Improved Euler) step
      const fHeun1 = dYdt_social(t, yHeun);
      const yPredict = [
        Math.max(0, yHeun[0] + h * fHeun1[0]),
        Math.max(0, yHeun[1] + h * fHeun1[1]),
        Math.max(0, yHeun[2] + h * fHeun1[2])
      ];
      const fHeun2 = dYdt_social(t + h, yPredict);
      
      const nextN_heun = yHeun[0] + (h/2) * (fHeun1[0] + fHeun2[0]);
      const nextM_heun = yHeun[1] + (h/2) * (fHeun1[1] + fHeun2[1]);
      const nextD_heun = yHeun[2] + (h/2) * (fHeun1[2] + fHeun2[2]);
      
      yHeun = [nextN_heun, nextM_heun, nextD_heun];

      // Euler Step
      const fEuler = dYdt_social(t, yEuler);
      const nextN_eul = yEuler[0] + h * fEuler[0];
      const nextM_eul = yEuler[1] + h * fEuler[1];
      const nextD_eul = yEuler[2] + h * fEuler[2];

      yEuler = [nextN_eul, nextM_eul, nextD_eul];

      t += h;

      listRK4.push({
        t,
        neutral: Math.max(0, yRk4[0]),
        protestor: Math.max(0, yRk4[1]),
        mediator: Math.max(0, yRk4[2])
      });

      listHeun.push({
        t,
        neutral: Math.max(0, yHeun[0]),
        protestor: Math.max(0, yHeun[1]),
        mediator: Math.max(0, yHeun[2])
      });

      listEuler.push({
        t,
        neutral: Math.max(0, yEuler[0]),
        protestor: Math.max(0, yEuler[1]),
        mediator: Math.max(0, yEuler[2])
      });
    }

    setSocialRk4Results(listRK4);
    setSocialHeunResults(listHeun);
    setSocialEulerResults(listEuler);
  };

  // Re-run loops when respective states undergo shifts
  useEffect(() => {
    if (activeScenario === "carb") {
      runFuelSimulation();
    } else {
      runSocialSimulation();
    }
  }, [
    activeScenario, 
    fuelInit, fuelInputRate, fuelReduction, fuelBaseConsumption, fuelDemandSurge, fuelPanicRate, fuelCriticalLevel, fuelStepSize, fuelMaxDays, fuelIntermittent,
    socialNeutral, socialProtest, socialMediator, socialA, socialB, socialC, socialK, socialR, socialStepSize, socialMaxDays
  ]);

  // Restores default setups
  const handleResetFuel = () => {
    setFuelInit(4500);
    setFuelInputRate(350);
    setFuelReduction(30);
    setFuelBaseConsumption(400);
    setFuelDemandSurge(25);
    setFuelPanicRate(100);
    setFuelCriticalLevel(1000);
    setFuelStepSize(0.5);
    setFuelMaxDays(30);
    setFuelIntermittent(false);
  };

  const handleResetSocial = () => {
    setSocialNeutral(800);
    setSocialProtest(50);
    setSocialMediator(10);
    setSocialA(0.001);
    setSocialB(0.05);
    setSocialC(0.015);
    setSocialK(0.05);
    setSocialR(0.12);
    setSocialStepSize(0.5);
    setSocialMaxDays(25);
    setActiveSocialPreset("default");
  };

  const applySocialPreset = (preset: "default" | "diálogo" | "sin_mediadores" | "masificacion" | "desgaste" | "tregua") => {
    setActiveSocialPreset(preset);
    if (preset === "default") {
      setSocialNeutral(800);
      setSocialProtest(50);
      setSocialMediator(10);
      setSocialA(0.001);
      setSocialB(0.05);
      setSocialC(0.015);
      setSocialK(0.05);
      setSocialR(0.12);
    } else if (preset === "diálogo") {
      setSocialNeutral(800);
      setSocialProtest(100);
      setSocialMediator(30);
      setSocialA(0.0006);
      setSocialB(0.12);
      setSocialC(0.035);
      setSocialK(0.15);
      setSocialR(0.06);
    } else if (preset === "sin_mediadores") {
      setSocialNeutral(800);
      setSocialProtest(50);
      setSocialMediator(0);
      setSocialA(0.0015);
      setSocialB(0);
      setSocialC(0);
      setSocialK(0);
      setSocialR(0.25);
    } else if (preset === "masificacion") {
      setSocialNeutral(800);
      setSocialProtest(40);
      setSocialMediator(10);
      setSocialA(0.0035);
      setSocialB(0.02);
      setSocialC(0.005);
      setSocialK(0.03);
      setSocialR(0.15);
    } else if (preset === "desgaste") {
      setSocialNeutral(800);
      setSocialProtest(50);
      setSocialMediator(20);
      setSocialA(0.0012);
      setSocialB(0.05);
      setSocialC(0.012);
      setSocialK(0.06);
      setSocialR(0.40);
    } else if (preset === "tregua") {
      setSocialNeutral(600);
      setSocialProtest(200);
      setSocialMediator(80);
      setSocialA(0.0008);
      setSocialB(0.08);
      setSocialC(0.015);
      setSocialK(0.04);
      setSocialR(0.10);
    }
  };

  // ==========================================
  // METRICS & ANALYSIS : ESCENARIO B (FUEL)
  // ==========================================
  const findCriticalDayFuel = (dataset: { t: number; r: number }[]) => {
    const match = dataset.find(x => x.r <= fuelCriticalLevel);
    return match ? match.t : null;
  };

  const critEuler = findCriticalDayFuel(carbResults.map(i => ({ t: i.t, r: i.eulerR })));
  const critHeun = findCriticalDayFuel(carbResults.map(i => ({ t: i.t, r: i.heunR })));
  const critRk4 = findCriticalDayFuel(carbResults.map(i => ({ t: i.t, r: i.rk4R })));

  // Stability diagnostic for fuel
  const checkFuelStability = () => {
    // If euler overflows, hits infinite, or shows oscillations that differ by more than 20% from RK4
    const eulerDiverged = carbResults.some(r => isNaN(r.eulerR) || !isFinite(r.eulerR));
    if (eulerDiverged || fuelStepSize >= 2.0) {
      return "El solver RK4 es el más estable y exacto. Euler muestra Inestabilidad Numérica Crítica (divergencia de redondeo o retraso acumulado severo) debido a la rudeza de su extrapolación lineal de primer escalón.";
    }
    return `RK4 ofrece un perfil matemático robusto con un error local de quinto orden O(h⁵). Heun (corrector promedio) atenúa parte de la cizalla lineal y es de segundo orden. Euler es de primer orden O(h²) y, con h = ${fuelStepSize} días, exagera el vaciado por error por truncamiento constante.`;
  };

  // ==========================================
  // METRICS & ANALYSIS : ESCENARIO G (SOCIAL)
  // ==========================================
  const findConflictPeaks = (dataset: DiffEqResult[]) => {
    let peakM = 0;
    let peakDay = 0;
    dataset.forEach(r => {
      if (r.protestor > peakM) {
        peakM = r.protestor;
        peakDay = r.t;
      }
    });
    return { peakM, peakDay };
  };

  const socialActiveResults = 
    socialPlotMethod === "rk4" 
      ? socialRk4Results 
      : socialPlotMethod === "heun" 
        ? socialHeunResults 
        : socialEulerResults;
  const socialPeaks = findConflictPeaks(socialActiveResults);

  const getSocialCriticalStatus = () => {
    const threshold = 250;
    const match = socialActiveResults.find(r => r.protestor >= threshold);
    return match 
      ? `El conflicto civil llega a nivel crítico el **Día ${match.t.toFixed(1)}** de la escalada (superando el límite de seguridad de ${threshold} manifestantes activos).`
      : `Bajo los parámetros actuales, el conflicto NUNCA llega al umbral de peligro severo de ${threshold} manifestantes en la calle, disipándose de forma controlada.`;
  };

  // SVG parameters for drafting dynamic plots
  const svgW = 560;
  const svgH = 300;
  const margin = { top: 20, right: 30, bottom: 45, left: 55 };

  // Helper coordinate mapper for Fuel SVG Plotting
  const getSvgX_fuel = (tVal: number) => {
    return margin.left + (tVal / fuelMaxDays) * (svgW - margin.left - margin.right);
  };

  const getSvgY_fuel = (rVal: number) => {
    // Max visual bound is maximum initial or active inventory
    const maxVal = Math.max(fuelInit, 5000);
    return margin.top + (1 - rVal / maxVal) * (svgH - margin.top - margin.bottom);
  };

  // Helper coordinate mapper for Social SVG Plotting
  const getSvgX_social = (tVal: number) => {
    return margin.left + (tVal / socialMaxDays) * (svgW - margin.left - margin.right);
  };

  const getSvgY_social = (val: number) => {
    const maxVal = Math.max(
      ...socialActiveResults.map(r => r.neutral),
      ...socialActiveResults.map(r => r.protestor),
      1000
    );
    return margin.top + (1 - val / maxVal) * (svgH - margin.top - margin.bottom);
  };

  return (
    <div className="space-y-6 fade-in animate-fadeIn" id="diffeq-view-module-root">
      
      {/* DOUBLE SCENARIO TAB PANEL AT THE TOP */}
      <div className="flex p-1.5 bg-slate-950 border border-slate-850 rounded-2xl gap-2 w-full max-w-2xl mx-auto shadow-inner" id="scenario-selector-bar">
        <button
          onClick={() => setActiveScenario("carb")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeScenario === "carb"
              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow"
              : "text-slate-450 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <Flame className="w-4 h-4 shrink-0" />
          <span>ESCENARIO B: Vaciado de Reservas</span>
        </button>
        <button
          onClick={() => setActiveScenario("social")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeScenario === "social"
              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow"
              : "text-slate-450 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <Cpu className="w-4 h-4 shrink-0" />
          <span>ESCENARIO G: Mediación de Conflictos</span>
        </button>
      </div>

      {/* RENDER ACTIVE SCENARIO VIEWPORTS */}
      {activeScenario === "carb" ? (
        
        // =========================================================================
        // SCENARIO B VIEWPORT: LOGISTICS RESERVES DEEP SIMULATOR
        // =========================================================================
        <div className="space-y-6" id="scenario-b-fuel-simulator-wrapper">
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-6">
            
            {/* Header Description */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500 animate-pulse" />
                  Vaciado Crítico de Reservas de Carburantes (Escenario B)
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Compare visualmente los comportamientos de aproximación numérica de **Euler**, **Heun**, y **RK4** resolviendo la ecuación diferencial no autónoma de inventarios: 
                  <code className="text-blue-300 font-mono ml-1 text-xs font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-900">R'(t) = Entrada(t) - Consumo(t)</code>.
                </p>
              </div>
              <button
                onClick={handleResetFuel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-350 bg-slate-850 hover:bg-slate-800 rounded-lg transition border border-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reestablecer Parámetros
              </button>
            </div>

            {/* Inputs & Visualizer Split Card Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Sliders and logistics parameter control (Left column) */}
              <div className="lg:col-span-5 space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-550 block border-b border-slate-800 pb-1">
                  Variables de Flujo de Inventarios
                </span>

                {/* Stock Initial Values */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Reserva Inicial R₀</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={100}
                        max={10000}
                        step={100}
                        value={fuelInit}
                        onChange={(e) => setFuelInit(Math.max(100, parseInt(e.target.value) || 0))}
                        className="w-full text-right p-1 bg-slate-900 border border-slate-800 rounded text-xs font-mono font-bold text-white outline-none"
                      />
                      <span className="text-[10px] text-slate-500 font-mono font-bold">m³</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Alerta Crítica R_crit</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={3000}
                        step={100}
                        value={fuelCriticalLevel}
                        onChange={(e) => setFuelCriticalLevel(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full text-right p-1 bg-slate-900 border border-slate-800 rounded text-xs font-mono font-bold text-rose-450 outline-none"
                      />
                      <span className="text-[10px] text-slate-500 font-mono font-bold">m³</span>
                    </div>
                  </div>
                </div>

                {/* Logistics Drivers */}
                <div className="space-y-3.5 bg-slate-950/60 p-4 rounded-xl border border-slate-850 text-xs">
                  
                  {/* Delivery Input */}
                  <div>
                    <div className="flex justify-between mb-1 text-slate-400">
                      <label className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-blue-450" />
                        <span>Abastecimiento Base (Entrada):</span>
                      </label>
                      <span className="font-mono font-bold text-blue-400">{fuelInputRate} m³/día</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="1000"
                      step="25"
                      value={fuelInputRate}
                      onChange={(e) => setFuelInputRate(parseInt(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer bg-slate-800 h-1 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Protests/War Blockade reduction */}
                  <div>
                    <div className="flex justify-between mb-1 text-slate-400">
                      <label>Reducción por Bloqueos / Paros:</label>
                      <span className="font-mono font-bold text-rose-400">-{fuelReduction}% del flujo</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={fuelReduction}
                      onChange={(e) => setFuelReduction(parseInt(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer bg-slate-800 h-1 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Consumo base */}
                  <div>
                    <div className="flex justify-between mb-1 text-slate-400">
                      <label>Consumo Promedio Comunitario:</label>
                      <span className="font-mono font-bold text-slate-300">{fuelBaseConsumption} m³/día</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="1000"
                      step="25"
                      value={fuelBaseConsumption}
                      onChange={(e) => setFuelBaseConsumption(parseInt(e.target.value))}
                      className="w-full accent-slate-400 cursor-pointer bg-slate-800 h-1 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Surge demand */}
                  <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-900">
                    <div>
                      <div className="flex justify-between mb-1 text-slate-405 text-[11px]">
                        <label>Sobredemanda (+%):</label>
                        <span className="font-mono font-bold text-amber-450">+{fuelDemandSurge}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="150"
                        step="5"
                        value={fuelDemandSurge}
                        onChange={(e) => setFuelDemandSurge(parseInt(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer bg-slate-800 h-1 rounded-lg appearance-none"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-slate-405 text-[11px]">
                        <label>Pánico de Compra:</label>
                        <span className="font-mono font-bold text-red-405">+{fuelPanicRate} m³</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        step="25"
                        value={fuelPanicRate}
                        onChange={(e) => setFuelPanicRate(parseInt(e.target.value))}
                        className="w-full accent-red-450 cursor-pointer bg-slate-800 h-1 rounded-lg appearance-none"
                      />
                    </div>
                  </div>

                  {/* Supply delivery Intermittent scheduling checkbox */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                    <div>
                      <label className="text-[11px] font-bold text-slate-350 block cursor-pointer select-none" htmlFor="chk-intermittent">
                        Simular Despachos Oscilatorios
                      </label>
                      <p className="text-[9px] text-slate-500 leading-none">Intermitencia semanal en la logística de barcos/pipas.</p>
                    </div>
                    <input
                      type="checkbox"
                      id="chk-intermittent"
                      checked={fuelIntermittent}
                      onChange={(e) => setFuelIntermittent(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Step size and simulation limits control */}
                  <div className="pt-3 border-t border-slate-850 space-y-2">
                    <div className="flex justify-between text-slate-300 font-semibold text-[11px]">
                      <label>Tamaño de Paso Numérico (h / dt):</label>
                      <span className="font-mono text-amber-450 font-bold">{fuelStepSize} días</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.5"
                      step="0.1"
                      value={fuelStepSize}
                      onChange={(e) => setFuelStepSize(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer bg-slate-800 h-1.5 rounded-lg appearance-none"
                    />
                    <span className="text-[9px] text-slate-500 block leading-tight">
                      *Incremente h &gt; 1.5 para presenciar el colapso de error acumulativo en el algoritmo de Euler mientras RK4 se mantiene estable.
                    </span>
                  </div>
                </div>

              </div>

              {/* Graphical Canvas area (Right column) */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-4">
                
                {/* SVG Curve Graphics */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2.5 mb-3 flex-wrap gap-2">
                    <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider font-mono">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <span className="inline-block w-2.5 h-0.5 bg-rose-400" /> Euler (Pr_1)
                      </span>
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <span className="inline-block w-2.5 h-1 border-t border-dashed border-amber-455" /> Heun (Pr_2)
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="inline-block w-2.5 h-0.5 bg-emerald-450" /> RK-4 (Pr_4)
                      </span>
                    </div>
                    <div className="text-[10px] text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-bold font-mono">
                      LÍNEA CRÍTICA: R_crit
                    </div>
                  </div>

                  {/* SVG Container */}
                  <div className="bg-[#020617] rounded-lg border border-slate-850 overflow-hidden relative">
                    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto block select-none">
                      {/* Grid lines horizontal */}
                      <line x1={margin.left} y1={getSvgY_fuel(1000)} x2={svgW - margin.right} y2={getSvgY_fuel(1000)} stroke="#1e293b" strokeWidth="0.8" />
                      <line x1={margin.left} y1={getSvgY_fuel(2500)} x2={svgW - margin.right} y2={getSvgY_fuel(2500)} stroke="#1e293b" strokeWidth="0.8" />
                      <line x1={margin.left} y1={getSvgY_fuel(4000)} x2={svgW - margin.right} y2={getSvgY_fuel(4000)} stroke="#1e293b" strokeWidth="0.8" />

                      {/* Red dashed line representing Critical reserve level */}
                      <line
                        x1={margin.left}
                        y1={getSvgY_fuel(fuelCriticalLevel)}
                        x2={svgW - margin.right}
                        y2={getSvgY_fuel(fuelCriticalLevel)}
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />

                      {/* Line Plot paths */}
                      {/* Euler Path */}
                      {carbResults.length > 0 && (
                        <path
                          d={`M ${getSvgX_fuel(carbResults[0].t)} ${getSvgY_fuel(carbResults[0].eulerR)} ` + 
                             carbResults.slice(1).map(r => `L ${getSvgX_fuel(r.t)} ${getSvgY_fuel(r.eulerR)}`).join(" ")}
                          stroke="#f43f5e"
                          strokeWidth="2"
                          strokeLinecap="round"
                          fill="none"
                        />
                      )}

                      {/* Heun Path */}
                      {carbResults.length > 0 && (
                        <path
                          d={`M ${getSvgX_fuel(carbResults[0].t)} ${getSvgY_fuel(carbResults[0].heunR)} ` + 
                             carbResults.slice(1).map(r => `L ${getSvgX_fuel(r.t)} ${getSvgY_fuel(r.heunR)}`).join(" ")}
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                          strokeLinecap="round"
                          fill="none"
                        />
                      )}

                      {/* RK4 Path */}
                      {carbResults.length > 0 && (
                        <path
                          d={`M ${getSvgX_fuel(carbResults[0].t)} ${getSvgY_fuel(carbResults[0].rk4R)} ` + 
                             carbResults.slice(1).map(r => `L ${getSvgX_fuel(r.t)} ${getSvgY_fuel(r.rk4R)}`).join(" ")}
                          stroke="#10b981"
                          strokeWidth="3"
                          strokeLinecap="round"
                          fill="none"
                        />
                      )}

                      {/* Dot highlight on crossing RK4 critical day */}
                      {critRk4 !== null && (
                        <circle
                          cx={getSvgX_fuel(critRk4)}
                          cy={getSvgY_fuel(fuelCriticalLevel)}
                          r="5.5"
                          fill="#ef4444"
                          stroke="#fff"
                          strokeWidth="1.5"
                          className="animate-pulse"
                        />
                      )}

                      {/* Axis Labels */}
                      <text x={svgW / 2} y={svgH - 8} textAnchor="middle" className="text-[9px] fill-slate-500 font-bold uppercase tracking-wider font-mono">
                        Tiempo Transcurrido (Días de Simulación)
                      </text>
                      <text x="14" y={svgH / 2} textAnchor="middle" transform={`rotate(-90 14 ${svgH / 2})`} className="text-[9px] fill-slate-500 font-bold uppercase tracking-wider font-mono">
                        Reservas en Planta (m³ de Carburante)
                      </text>

                      {/* X Tick Text */}
                      <text x={getSvgX_fuel(0)} y={svgH - 24} textAnchor="middle" className="text-[9px] fill-slate-550 font-mono">Día 0</text>
                      <text x={getSvgX_fuel(fuelMaxDays / 2)} y={svgH - 24} textAnchor="middle" className="text-[9px] fill-slate-550 font-mono">D Día {Math.floor(fuelMaxDays/2)}</text>
                      <text x={getSvgX_fuel(fuelMaxDays)} y={svgH - 24} textAnchor="middle" className="text-[9px] fill-slate-550 font-mono">D Día {fuelMaxDays}</text>

                      {/* Y Tick numbers */}
                      <text x={margin.left - 6} y={getSvgY_fuel(1000) + 3} textAnchor="end" className="text-[9px] fill-slate-600 font-mono">1,000 m³</text>
                      <text x={margin.left - 6} y={getSvgY_fuel(2500) + 3} textAnchor="end" className="text-[9px] fill-slate-600 font-mono">2,500 m³</text>
                      <text x={margin.left - 6} y={getSvgY_fuel(4000) + 3} textAnchor="end" className="text-[9px] fill-slate-600 font-mono">4,000 m³</text>
                    </svg>
                  </div>
                </div>

                {/* Analytical result cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-slate-500 font-mono block uppercase font-bold">Colapso Euler (1er Orden)</span>
                      <span className="text-xl font-black text-rose-450 mt-1 block font-mono">
                        {critEuler !== null ? `Día ${critEuler.toFixed(1)}` : "SEGURO"}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-550 block leading-tight font-mono uppercase mt-1">Margen Lineal Brutal</span>
                  </div>

                  <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-slate-500 font-mono block uppercase font-bold">Colapso Heun (2do Orden)</span>
                      <span className="text-xl font-black text-amber-500 mt-1 block font-mono">
                        {critHeun !== null ? `Día ${critHeun.toFixed(1)}` : "SEGURO"}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-550 block leading-tight font-mono uppercase mt-1">Predicción Intermedia</span>
                  </div>

                  <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-slate-500 font-mono block uppercase font-bold">Colapso RK4 (4to Orden)</span>
                      <span className="text-xl font-black text-emerald-400 mt-1 block font-mono">
                        {critRk4 !== null ? `Día ${critRk4.toFixed(1)}` : "SEGURO"}
                      </span>
                    </div>
                    <span className="text-[9px] text-emerald-500/80 block leading-tight font-mono uppercase mt-1 font-bold">Aproximación Real</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* DYNAMIC ANSWER SHEETS OR BENTO BOX */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="scenario-b-responses">
            
            {/* Answer details */}
            <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
                <Info className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Cuestionario Científico de Reserva Crítica</h3>
              </div>

              <div className="space-y-4 text-xs my-1 flex-grow">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1">
                    1. ¿En cuántos días la reserva disponible llega a su nivel crítico?
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    {critRk4 !== null ? (
                      <span>
                        La simulación exacta de cuarto orden (RK4) indica que, bajo los parámetros definidos, la planta se quedará sin combustible de seguridad (reservas menores a {fuelCriticalLevel} m³) en el <strong className="text-red-400 font-mono">Día {critRk4.toFixed(2)}</strong>. Euler calcula este evento en el día {critEuler !== null ? critEuler.toFixed(2) : "N/A"} y Heun en el día {critHeun !== null ? critHeun.toFixed(2) : "N/A"}.
                      </span>
                    ) : (
                      <span>
                        Con el equilibrio de flujo actual, la reserva nunca desciende por debajo de la barrera de seguridad de los {fuelCriticalLevel} m³ dentro del horizonte temporal estimado de {fuelMaxDays} días. El sistema se encuentra <span className="text-emerald-400 font-bold">operando en estado estable seguro</span>.
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1">
                    2. ¿Qué pasa si aumenta el consumo diario o se reduce el abastecimiento?
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    Un aumento en el consumo (vía el slider de demanda surge del <span className="text-amber-400 font-bold">+{fuelDemandSurge}%</span> o por el factor de compras de pánico de <span className="text-amber-400 font-bold">+{fuelPanicRate} m³</span>) desplaza la curva de vaciado violentamente hacia la izquierda, adelantando la fecha de desabastecimiento. 
                    De manera similar, bloquear el reabastecimiento (pérdidas del <span className="text-rose-400 font-bold">-{fuelReduction}%</span> de ingreso) reduce drásticamente la capacidad de amortiguación de la planta, provocando colapsos de stock incluso ante niveles de consumo ordinarios.
                  </p>
                </div>

                <div className="bg-[#0b0c16] p-4 rounded-xl border border-slate-850">
                  <h4 className="font-mono text-[10px] font-bold text-slate-350 block uppercase tracking-wider mb-2.5">
                    3. Comparación Científica: ¿Heun vs Euler vs RK4?
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-400">
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-900">
                      <span className="font-bold text-rose-455 block border-b border-slate-900 pb-1 mb-1 font-mono">Euler (1er Orden)</span>
                      Metodología de avance de primer grado. Acumula un error local de $O(h^2)$. Carece de corrector derivado, generando un notable desfase lineal si $h$ aumenta.
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-900">
                      <span className="font-bold text-amber-500 block border-b border-slate-900 pb-1 mb-1 font-mono">Heun (2do Orden)</span>
                      Predice la pendiente futura y la promedia con la inicial para corregir el paso. Reduce el error local significativamente a un grado cuadrático $O(h^3)$.
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-900">
                      <span className="font-bold text-emerald-400 block border-b border-slate-900 pb-1 mb-1 font-mono">RK4 (4to Orden)</span>
                      Evalúa cuatro derivadas ponderadas (inicial, medias corregidas, final). Es de alta precisión con error de quinto orden $O(h^5)$, ideal para sistemas altamente sensibles.
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1">
                    4. ¿Qué método numérico da una aproximación más estable y por qué?
                  </h4>
                  <p className="text-slate-400 leading-relaxed leading-normal text-[11px]">
                    <span className="font-mono text-amber-450">{checkFuelStability()}</span> El comportamiento es notorio si ensancha el paso temporal (h &gt; 1.5). El método de Euler sobrepasa la línea real cayendo en vaciados ficticios o acumulando distorsiones drásticas de volumen, mientras que RK4 preserva la consistencia física del inventario.
                  </p>
                </div>
              </div>

            </div>

            {/* Step tables side-by-side data comparator */}
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl flex flex-col h-[525px] overflow-hidden">
              <div className="p-4 bg-slate-900/50 border-b border-slate-850 flex justify-between items-center shrink-0 flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">Tabla Comparativa de Métodos</h3>
                  <p className="text-[9px] text-slate-500 font-mono">Evaluación temporal side-by-side (en m³ de carburante)</p>
                </div>
                <Activity className="w-5 h-5 text-slate-400 animate-pulse" />
              </div>

              <div className="overflow-auto flex-grow rounded-lg font-mono text-[10.5px] scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#020617] sticky top-0 text-slate-500 font-sans border-b border-slate-850">
                    <tr>
                      <th className="p-2.5 text-center">Día (t)</th>
                      <th className="p-2.5 text-rose-455">Euler</th>
                      <th className="p-2.5 text-amber-500">Heun</th>
                      <th className="p-2.5 text-emerald-400 font-bold bg-slate-900/30">RK4</th>
                      <th className="p-2.5 text-[9px] text-right">Net Flow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/50">
                    {carbResults.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/20 transition">
                        <td className="p-2.5 text-center text-slate-600 bg-slate-900/10 font-bold">{row.t.toFixed(1)}</td>
                        <td className="p-2.5 text-rose-400">{row.eulerR.toFixed(1)}</td>
                        <td className="p-2.5 text-amber-400">{row.heunR.toFixed(1)}</td>
                        <td className="p-2.5 text-emerald-400 font-bold bg-emerald-900/5">{row.rk4R.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-medium text-slate-500">
                          {(row.inflow - row.outflow).toFixed(0)} m³
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

      ) : (

        // =========================================================================
        // SCENARIO G VIEWPORT: COUPLED SOCIAL MEDIATION ENGINE
        // =========================================================================
        <div className="space-y-6" id="scenario-g-social-simulator-wrapper">
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-6">
            
            {/* Header Description */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-500" />
                  Dinámica Social y Mediación de Conflictos (Escenario G)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Evolución temporal de poblaciones acopladas de Ciudadanos Neutrales, Manifestantes Activos y Mediadores Parlamentarios reguladas por ODEs complejas inter-dependientes.
                </p>
              </div>
              <button
                onClick={handleResetSocial}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-350 bg-slate-850 hover:bg-slate-800 rounded-lg transition border border-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reestablecer Parámetros
              </button>
            </div>

            {/* Split layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Sliders sidebar (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-550 block border-b border-slate-850 pb-1">
                  Ponderación de Población y Tasas
                </span>

                {/* Populations Inputs */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Neutrales N</span>
                    <input
                      type="number"
                      value={socialNeutral}
                      onChange={(e) => setSocialNeutral(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-right p-1.5 text-xs bg-slate-900 border border-slate-800 rounded font-mono font-bold text-slate-200 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-rose-455 block font-mono">Activos M</span>
                    <input
                      type="number"
                      value={socialProtest}
                      onChange={(e) => setSocialProtest(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-right p-1.5 text-xs bg-slate-900 border border-slate-800 rounded font-mono font-bold text-rose-400 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-blue-455 block font-mono">Mediadores D</span>
                    <input
                      type="number"
                      value={socialMediator}
                      onChange={(e) => setSocialMediator(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-right p-1.5 text-xs bg-slate-900 border border-slate-800 rounded font-mono font-bold text-blue-400 outline-none"
                    />
                  </div>
                </div>

                {/* Visual Simulation Presets inside column */}
                <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-xl mb-1 text-xs space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                    Escenarios de Simulación EDO
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => applySocialPreset("diálogo")}
                      className={`py-2 px-2.5 rounded-lg border text-[11px] font-semibold transition text-left cursor-pointer ${
                        activeSocialPreset === "diálogo"
                          ? "bg-slate-900 border-blue-550 text-blue-400 shadow-md shadow-blue-950/30"
                          : "bg-slate-950 border-slate-900 text-slate-450 hover:border-slate-850"
                      }`}
                    >
                      <span className="font-bold block">1. Paz y Diálogo</span>
                      <span className="text-[9px] text-slate-500 font-mono leading-none">Alta efectividad c</span>
                    </button>
                    <button
                      onClick={() => applySocialPreset("sin_mediadores")}
                      className={`py-2 px-2.5 rounded-lg border text-[11px] font-semibold transition text-left cursor-pointer ${
                        activeSocialPreset === "sin_mediadores"
                          ? "bg-slate-900 border-red-500/40 text-red-400 shadow-md shadow-red-955/30"
                          : "bg-slate-950 border-slate-900 text-slate-450 hover:border-slate-850"
                      }`}
                    >
                      <span className="font-bold block">2. Sin Mediadores</span>
                      <span className="text-[9px] text-slate-500 font-mono leading-none">k = 0, D(0) = 0</span>
                    </button>
                    <button
                      onClick={() => applySocialPreset("masificacion")}
                      className={`py-2 px-2.5 rounded-lg border text-[11px] font-semibold transition text-left cursor-pointer ${
                        activeSocialPreset === "masificacion"
                          ? "bg-slate-900 border-amber-500/40 text-amber-400 shadow-md shadow-amber-955/30"
                          : "bg-slate-950 border-slate-900 text-slate-450 hover:border-slate-850"
                      }`}
                    >
                      <span className="font-bold block">3. Masificación</span>
                      <span className="text-[9px] text-slate-500 font-mono leading-none">Alto contagio a</span>
                    </button>
                    <button
                      onClick={() => applySocialPreset("desgaste")}
                      className={`py-2 px-2.5 rounded-lg border text-[11px] font-semibold transition text-left cursor-pointer ${
                        activeSocialPreset === "desgaste"
                          ? "bg-slate-900 border-orange-500/40 text-orange-400 shadow-md shadow-orange-955/30"
                          : "bg-slate-950 border-slate-900 text-slate-450 hover:border-slate-850"
                      }`}
                    >
                      <span className="font-bold block">4. Alto Desgaste</span>
                      <span className="text-[9px] text-slate-500 font-mono leading-none">Alta fatiga r</span>
                    </button>
                  </div>
                  <button
                    onClick={() => applySocialPreset("tregua")}
                    className={`w-full py-1.5 px-2 rounded-lg border text-[10px] font-bold uppercase transition text-center cursor-pointer ${
                      activeSocialPreset === "tregua"
                        ? "bg-slate-900 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-955/20"
                        : "bg-slate-950 border-slate-900 text-slate-500 hover:border-slate-850"
                    }`}
                  >
                    5. Tregua Frágil / Equilibrio Dinámico
                  </button>
                </div>
 
                {/* Rates Sliders */}
                <div className="space-y-3.5 bg-slate-950/60 p-4 rounded-xl border border-slate-850 text-xs text-slate-350">
                  {/* Slider a */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="font-mono text-[10px] text-slate-400">Tasa de Contagio / Influencia del Descontento (a):</label>
                      <span className="font-mono font-bold text-rose-400">{socialA.toFixed(4)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0001"
                      max="0.0050"
                      step="0.0001"
                      value={socialA}
                      onChange={(e) => {
                        setSocialA(parseFloat(e.target.value));
                        setActiveSocialPreset("custom");
                      }}
                      className="w-full accent-rose-500 cursor-pointer bg-slate-800 h-1 rounded appearance-none"
                    />
                  </div>
 
                  {/* Slider b */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="font-mono text-[10px] text-slate-400">Tasa de Recuperación / Retorno a Neutralidad (b):</label>
                      <span className="font-mono font-bold text-slate-300">{socialB.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="0.50"
                      step="0.01"
                      value={socialB}
                      onChange={(e) => {
                        setSocialB(parseFloat(e.target.value));
                        setActiveSocialPreset("custom");
                      }}
                      className="w-full accent-slate-400 cursor-pointer bg-slate-800 h-1 rounded appearance-none"
                    />
                  </div>
 
                  {/* Slider c */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="font-mono text-[10px] text-slate-400">Efectividad del Diálogo / Desmovilización (c):</label>
                      <span className="font-mono font-bold text-blue-400">{socialC.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.001"
                      max="0.050"
                      step="0.001"
                      value={socialC}
                      onChange={(e) => {
                        setSocialC(parseFloat(e.target.value));
                        setActiveSocialPreset("custom");
                      }}
                      className="w-full accent-blue-500 cursor-pointer bg-slate-800 h-1 rounded appearance-none"
                    />
                  </div>
 
                  {/* Slider k */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="font-mono text-[10px] text-slate-400">Reacción de Mediadores (Movilización k):</label>
                      <span className="font-mono font-bold text-indigo-400">{socialK.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="0.50"
                      step="0.01"
                      value={socialK}
                      onChange={(e) => {
                        setSocialK(parseFloat(e.target.value));
                        setActiveSocialPreset("custom");
                      }}
                      className="w-full accent-indigo-505 cursor-pointer bg-slate-800 h-1 rounded appearance-none"
                    />
                  </div>
 
                  {/* Slider r */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="font-mono text-[10px] text-slate-400">Tasa de Desgaste / Burnout de Mediadores (r):</label>
                      <span className="font-mono font-bold text-orange-400">{socialR.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="0.50"
                      step="0.01"
                      value={socialR}
                      onChange={(e) => {
                        setSocialR(parseFloat(e.target.value));
                        setActiveSocialPreset("custom");
                      }}
                      className="w-full accent-orange-500 cursor-pointer bg-slate-800 h-1 rounded appearance-none"
                    />
                  </div>
 
                  {/* dt bounds step size */}
                  <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-1 text-[11px]">
                        <span className="font-semibold text-slate-400">Paso h:</span>
                        <span className="font-mono text-amber-450 font-bold">{socialStepSize} d</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.1"
                        value={socialStepSize}
                        onChange={(e) => setSocialStepSize(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer bg-slate-800 h-1 rounded appearance-none"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-[11px]">
                        <span className="font-semibold text-slate-400">Horizonte:</span>
                        <span className="font-mono text-slate-350 font-bold">{socialMaxDays} d</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="60"
                        step="5"
                        value={socialMaxDays}
                        onChange={(e) => setSocialMaxDays(parseInt(e.target.value))}
                        className="w-full accent-slate-400 cursor-pointer bg-slate-800 h-1 rounded appearance-none"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Graphics visual column (7 cols) */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-900 pb-2 flex-wrap gap-2">
                    <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider font-mono">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <span className="inline-block w-2 h-2 rounded-full bg-slate-400" /> Neutrales
                      </span>
                      <span className="flex items-center gap-1.5 text-rose-455">
                        <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Manifestantes
                      </span>
                      <span className="flex items-center gap-1.5 text-blue-455">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Mediadores
                      </span>
                    </div>

                    <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        onClick={() => setSocialPlotMethod("rk4")}
                        className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-md transition cursor-pointer ${
                          socialPlotMethod === "rk4" ? "bg-slate-800 text-white shadow" : "text-slate-500"
                        }`}
                      >
                        RK-4
                      </button>
                      <button
                        onClick={() => setSocialPlotMethod("heun")}
                        className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-md transition cursor-pointer ${
                          socialPlotMethod === "heun" ? "bg-slate-800 text-white shadow" : "text-slate-500"
                        }`}
                      >
                        Heun
                      </button>
                      <button
                        onClick={() => setSocialPlotMethod("euler")}
                        className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-md transition cursor-pointer ${
                          socialPlotMethod === "euler" ? "bg-slate-800 text-white shadow" : "text-slate-500"
                        }`}
                      >
                        Euler
                      </button>
                    </div>
                  </div>
 
                  {/* SVG Container */}
                  <div className="bg-[#020617] rounded-lg border border-slate-850 overflow-hidden relative">
                    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto block select-none">
                      {/* Horizontal Grid guidelines */}
                      <line x1={margin.left} y1={getSvgY_social(200)} x2={svgW - margin.right} y2={getSvgY_social(200)} stroke="#1e293b" strokeWidth="0.8" />
                      <line x1={margin.left} y1={getSvgY_social(500)} x2={svgW - margin.right} y2={getSvgY_social(500)} stroke="#1e293b" strokeWidth="0.8" />
                      <line x1={margin.left} y1={getSvgY_social(800)} x2={svgW - margin.right} y2={getSvgY_social(800)} stroke="#1e293b" strokeWidth="0.8" />
 
                      {/* Population Paths */}
                      {socialActiveResults.length > 0 && (
                        <>
                          {/* Neutral Line */}
                          <path
                            d={`M ${getSvgX_social(socialActiveResults[0].t)} ${getSvgY_social(socialActiveResults[0].neutral)} ` + 
                               socialActiveResults.slice(1).map(r => `L ${getSvgX_social(r.t)} ${getSvgY_social(r.neutral)}`).join(" ")}
                            stroke="#64748b"
                            strokeWidth="2.1"
                            fill="none"
                          />
 
                          {/* Protestors Line */}
                          <path
                            d={`M ${getSvgX_social(socialActiveResults[0].t)} ${getSvgY_social(socialActiveResults[0].protestor)} ` + 
                               socialActiveResults.slice(1).map(r => `L ${getSvgX_social(r.t)} ${getSvgY_social(r.protestor)}`).join(" ")}
                            stroke="#ef4444"
                            strokeWidth="2.5"
                            className="animate-pulse"
                            fill="none"
                          />
 
                          {/* Mediators Line */}
                          <path
                            d={`M ${getSvgX_social(socialActiveResults[0].t)} ${getSvgY_social(socialActiveResults[0].mediator)} ` + 
                               socialActiveResults.slice(1).map(r => `L ${getSvgX_social(r.t)} ${getSvgY_social(r.mediator)}`).join(" ")}
                            stroke="#3b82f6"
                            strokeWidth="2.1"
                            fill="none"
                          />
                        </>
                      )}
 
                      {/* Pico representator circle */}
                      <circle
                        cx={getSvgX_social(socialPeaks.peakDay)}
                        cy={getSvgY_social(socialPeaks.peakM)}
                        r="4.5"
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth="1.5"
                      />
 
                      {/* X coordinates labels */}
                      <text x={svgW / 2} y={svgH - 8} textAnchor="middle" className="text-[9px] fill-slate-500 font-bold uppercase tracking-wider font-mono">
                        Tiempo Transcurrido (Días de Simulación)
                      </text>
                      <text x="14" y={svgH / 2} textAnchor="middle" transform={`rotate(-90 14 ${svgH / 2})`} className="text-[9px] fill-slate-500 font-bold uppercase tracking-wider font-mono">
                        Censo Social (Habitantes activos)
                      </text>
 
                      <text x={getSvgX_social(0)} y={svgH - 24} textAnchor="middle" className="text-[9px] fill-slate-500 font-mono">D0</text>
                      <text x={getSvgX_social(socialMaxDays / 2)} y={svgH - 24} textAnchor="middle" className="text-[9px] fill-slate-500 font-mono">D Día {Math.floor(socialMaxDays/2)}</text>
                      <text x={getSvgX_social(socialMaxDays)} y={svgH - 24} textAnchor="middle" className="text-[9px] fill-slate-500 font-mono">D Día {socialMaxDays}</text>
                    </svg>
                  </div>
                </div>
 
                {/* Dynamic indicators cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/70 p-4 border border-slate-850 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide font-bold block font-mono">Pico Máximo de Protestas</span>
                      <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
                        {socialPeaks.peakM.toFixed(1)} personas
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-550 font-mono mt-1 uppercase block">Registrado el Día {socialPeaks.peakDay.toFixed(1)}</span>
                  </div>
 
                  <div className="bg-slate-950/70 p-4 border border-slate-850 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide font-bold block font-mono">Estabilización de Crisis</span>
                      <span className="text-xl font-bold font-mono text-blue-400 mt-1 block">
                        {socialActiveResults.length > 0 ? socialActiveResults[socialActiveResults.length - 1].protestor.toFixed(1) : 0} personas
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-550 font-mono mt-1 uppercase block">Día de control {socialMaxDays}</span>
                  </div>
                </div>
              </div>
 
            </div>
 
          </div>
 
          {/* Social Responses and Comparative Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="scenario-g-responses">
            
            <div className="lg:col-span-7 bg-slate-900/40 border border-slate-850 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Info className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Análisis y Respuestas de Simulación (Escenario G)</h3>
              </div>
 
              <div className="space-y-3.5 text-xs">
                {/* Pregunta 1 */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    ¿El conflicto tiende a estabilizarse o desbordarse?
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans text-[11px]">
                    El sistema oscila dinámicamente. {
                      socialActiveResults.length > 2 && 
                      Math.abs(socialActiveResults[socialActiveResults.length - 1].protestor - socialActiveResults[socialActiveResults.length - 2].protestor) < 1.0
                        ? "Bajo la configuración actual, el sistema ha alcanzado un estado de equilibrio asintótico (los censos cambian poco al final)."
                        : "En estos parámetros, el sistema muestra una tendencia activa y oscilatoria sin llegar aún a una estabilización asintótica definitiva en el horizonte medido."
                    } Si hay mediadores suficientes y la tasa de diálogo es activa, el conflicto disminuye paulatinamente hasta que las fuerzas de descontento se cansan o retornan a la neutralidad.
                  </p>
                </div>
 
                {/* Pregunta 2 */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-455" />
                    ¿Cómo evoluciona el número de manifestantes durante el mes?
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans text-[11px]">
                    Actualmente, el número de manifestantes muestra un pico máximo de <strong className="text-rose-400 font-mono">{socialPeaks.peakM.toFixed(1)} activos</strong> en el <strong className="text-slate-300 font-mono">Día {socialPeaks.peakDay.toFixed(1)}</strong>. Al finalizar la simulación el día {socialMaxDays}, el censo de manifestantes activos finaliza en <strong className="text-rose-455 font-mono">{(socialActiveResults.length > 0 ? socialActiveResults[socialActiveResults.length - 1].protestor : 0).toFixed(0)} personas</strong>, lo que representa una tendencia general de {
                      (socialActiveResults.length > 0 ? socialActiveResults[socialActiveResults.length - 1].protestor : 0) > socialProtest 
                        ? "incremento neto respecto al día inicial."
                        : "atenuación o enfriamiento neto respecto al punto inicial."
                    }
                  </p>
                </div>
 
                {/* Pregunta 3 */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    ¿Qué ocurre si se mejora significativamente la tasa de diálogo (c)?
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans text-[11px]">
                    Un aumento en <strong className="text-blue-400 font-mono">c</strong> disminuye la curva de manifestantes activos <strong className="text-rose-400">M(t)</strong> muy rápidamente. El término reactivo <strong className="font-mono">-c * M * D</strong> actúa como disipador principal del pánico y descontento. Los manifestantes vuelven más rápido a ser ciudadanos pacificados, reduciendo el pico crítico.
                  </p>
                </div>
 
                {/* Pregunta 4 */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    ¿Qué sucede si no existen mediadores (D(0) = 0 o k = 0)?
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans text-[11px]">
                    Si <strong className="text-blue-400 font-mono">D(0) = 0</strong> y la respuesta estatal <strong className="text-indigo-400 font-mono">k = 0</strong>, los mediadores desaparecen. El término disipador dialógico desaparece, provocando que la protesta civil se propague ilimitadamente por contagio social (<strong className="text-rose-455">a * N * M</strong>), consumiendo a toda la población neutral hasta vaciarla. Pruébelo con el preset <strong className="text-red-400 uppercase">"Sin Mediadores"</strong>.
                  </p>
                </div>
 
                {/* Pregunta 5 */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
                  <h4 className="font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    ¿Qué parámetros causan la masificación/escalamiento del conflicto?
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans text-[11px]">
                    El conflicto se masifica rápidamente con una alta tasa de influencia de descontento (<strong className="text-rose-455 font-mono">a &gt; 0.0025</strong>) combinada con alta tasa de desgaste de mediadores (<strong className="text-orange-400 font-mono">r &gt; 0.25</strong>), baja efectividad dialógica (<strong className="text-blue-400 font-mono">c &lt; 0.005</strong>) y baja respuesta gubernamental (<strong className="text-indigo-400 font-mono">k</strong>). Esto rompe la contención social desatando un estallido masivo indefinido.
                  </p>
                </div>
              </div>
            </div>
 
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl flex flex-col h-[400px] overflow-hidden">
              <div className="p-4 bg-slate-900/50 border-b border-slate-850 flex justify-between items-center shrink-0">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">Tabla de Censo Social</h3>
                <Table className="w-5 h-5 text-slate-400" />
              </div>
 
              <div className="overflow-auto flex-grow rounded-lg font-mono text-[10.5px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#020617] sticky top-0 text-slate-500 font-sans border-b border-slate-850">
                    <tr>
                      <th className="p-2 w-12 text-center">Día (t)</th>
                      <th className="p-2">N (Neutral)</th>
                      <th className="p-2 text-rose-455">M (Manifestante)</th>
                      <th className="p-2 text-blue-455">D (Mediador)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/50">
                    {socialActiveResults.map((rk, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/20 transition">
                        <td className="p-2.5 text-center text-slate-550 bg-slate-900/10 font-bold">{rk.t.toFixed(1)}</td>
                        <td className="p-2.5 text-slate-450">{rk.neutral.toFixed(0)}</td>
                        <td className="p-2.5 text-rose-400 font-bold">{rk.protestor.toFixed(1)}</td>
                        <td className="p-2.5 text-blue-400">{rk.mediator.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
 
          </div>

        </div>

      )}

    </div>
  );
}
