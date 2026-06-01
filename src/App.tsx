import React, { useState } from "react";
import { 
  Boxes, 
  Binary, 
  TrendingUp, 
  Spline, 
  Flame, 
  Compass
} from "lucide-react";

// Import modules
import EquationsModule from "./components/EquationsModule";
import RootsModule from "./components/RootsModule";
import InterpolationModule from "./components/InterpolationModule";
import IntegrationModule from "./components/IntegrationModule";
import DiffEqModule from "./components/DiffEqModule";

type TabId = "equations" | "roots" | "interpolation" | "integration" | "diffeq";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("equations");

  const navItems = [
    {
      id: "equations" as TabId,
      name: "Sistemas de Ecuaciones",
      scenario: "Escenarios A y F",
      desc: "Distribución en rutas de planta (3x3)",
      icon: Boxes,
    },
    {
      id: "roots" as TabId,
      name: "Raíces de Ecuaciones",
      scenario: "Escenario E",
      desc: "Análisis de colapso de reservas familiares",
      icon: Binary,
    },
    {
      id: "interpolation" as TabId,
      name: "Interpolación Curva Papa",
      scenario: "Escenario C",
      desc: "Curva de cotizaciones de la papa",
      icon: Spline,
    },
    {
      id: "integration" as TabId,
      name: "Integración Mensual",
      scenario: "Escenario D",
      desc: "Costo acumulado mensual de canasta",
      icon: TrendingUp,
    },
    {
      id: "diffeq" as TabId,
      name: "Ecuaciones Diferenciales",
      scenario: "Escenarios B y G",
      desc: "Reservas de carburante y mediación de conflictos",
      icon: Flame,
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans antialiased" id="applet-viewport-root">
      {/* Mobile Sticky Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 lg:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-sm font-bold tracking-tight text-white uppercase">
              Numeryx<span className="font-light opacity-85">Labs</span>
            </h1>
          </div>
          <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-extrabold text-blue-400 bg-blue-500/10 rounded-md border border-blue-500/20 font-mono">
            Active Labs
          </span>
        </div>
      </header>

      {/* Exact Project Title & Real Problem Banner */}
      <div className="max-w-7xl mx-auto px-4 pt-6 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-4 relative overflow-hidden shadow-xl" id="project-main-banner-card">
          {/* subtle ambient glass circles or grid mesh */}
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-850 pb-5">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 text-[9px] uppercase tracking-widest font-extrabold text-blue-400 bg-blue-500/10 rounded-md border border-blue-500/20 font-mono">
                  Proyecto de Investigación Multidisciplinaria
                </span>
                <span className="px-2 py-0.5 text-[9px] uppercase tracking-widest font-extrabold text-emerald-400 bg-emerald-500/10 rounded-md border border-emerald-500/20 font-mono">
                  Métodos Numéricos Aplicados
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight uppercase font-mono">
                Simulación numérica de abastecimiento, precios y conflicto social en contexto de crisis
              </h1>
            </div>
            
            {/* Deploy & Git details widget */}
            <div className="flex flex-wrap gap-2 text-[10px] sm:self-start lg:self-center font-mono shrink-0">
              <a 
                href="https://github.com/mirkosonyjb/metodos-numericos-crisis" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl px-3 py-2 flex items-center gap-2 transition"
                id="link-github-repo"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>GitHub Repositorio Source</span>
              </a>
              <div className="bg-slate-950 border border-slate-800 text-slate-400 rounded-xl px-3 py-2 flex items-center gap-2" id="badge-deployment-status">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span>Deploy: Publicación Web Activa</span>
              </div>
            </div>
          </div>
          
          {/* Brief explanation of the Real-World Problem */}
          <div className="space-y-3" id="problem-explanation-container">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
              <span className="p-1 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20">
                <Compass className="w-3.5 h-3.5" />
              </span>
              Contexto del Problema Real
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-5xl">
              Durante estados de emergencia y desabastecimiento provocado por bloqueos, huelgas o rumores de pánico, los eslabones logísticos y de paz social experimentan fluctuaciones severas. Este laboratorio computacional utiliza modelos de <strong className="text-slate-200">sistemas de ecuaciones simultáneas</strong> para resolver flujos logísticos, <strong className="text-slate-200">raíces de ecuaciones</strong> para calcular el colapso de reservas presupuestarias, <strong className="text-slate-200">interpolación con trazadores cúbicos</strong> para proyectar la cotización volátil de alimentos básicos como la papa, <strong className="text-slate-200">fórmulas integrales numéricas</strong> para mensurar el costo acumulado de la canasta familiar familiar, y <strong className="text-slate-200">ecuaciones diferenciales de Heun y Runge-Kutta 4</strong> para proyectar la respuesta de mediadores frente a epidemias de descontento social (Escenarios G y B).
            </p>
          </div>
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 pt-0">
        {/* Left Sidebar Layout */}
        <aside className="w-full lg:w-72 flex flex-col gap-4 shrink-0">
          {/* Logo Brand Box */}
          <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center gap-3 shadow-lg shadow-blue-900/15">
            <div className="bg-white/15 p-2 rounded-xl">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white uppercase">
                Numeryx<span className="font-light opacity-80">Labs</span>
              </h1>
              <p className="text-[10px] text-blue-150 opacity-90 font-mono">v4.0 // Numerical Labs</p>
            </div>
          </div>

          {/* Simulations Nav box */}
          <div className="bg-slate-900/40 border border-slate-800/85 p-4 rounded-2xl flex flex-col gap-3">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Simulaciones</div>
            
            <nav className="flex flex-col gap-1.5">
              {navItems.map((item, index) => {
                const IconComponent = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-slate-800/50 border-blue-500/40 text-blue-400 font-semibold shadow-md shadow-blue-950/20"
                        : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200"
                    }`}
                    id={`nav-${item.id}`}
                  >
                    <span className={`text-[10px] font-mono ${isSelected ? "text-blue-400 font-bold" : "text-slate-500"}`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? "text-blue-400" : "text-slate-505"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate">{item.name}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Status Box */}
          <div className="p-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Status del Kernel</div>
            <div className="flex items-center gap-2 text-xs text-green-400 font-mono">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Ready: Active Core
            </div>
          </div>
        </aside>

        {/* Main Content Pane */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Active view title banner */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-450 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/15">
                Escenario Activo
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
                {navItems.find(n => n.id === activeTab)?.name}
              </h2>
              <p className="text-slate-400 text-xs italic md:text-sm">
                {navItems.find(n => n.id === activeTab)?.desc}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <span className="text-xs text-slate-400 font-mono bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Gauss-Seidel Active
              </span>
            </div>
          </div>

          <div id="active-module-view-section">
            {activeTab === "equations" && <EquationsModule />}
            {activeTab === "roots" && <RootsModule />}
            {activeTab === "interpolation" && <InterpolationModule />}
            {activeTab === "integration" && <IntegrationModule />}
            {activeTab === "diffeq" && <DiffEqModule />}
          </div>
        </main>
      </div>

      {/* Footer Info credit */}
      <footer className="border-t border-slate-900/80 text-slate-500 py-8 text-center text-xs bg-slate-950/60 mt-16">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5">
          <p className="font-semibold text-slate-400">Laboratorio Científico de Métodos Numéricos © 2026</p>
          <p className="max-w-xl mx-auto text-slate-500">
            Modelamiento de distribución de recursos, análisis financiero de colapsos, interpolación agroalimentaria e integración de canastas básicas.
          </p>
        </div>
      </footer>
    </div>
  );
}
