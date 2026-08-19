import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, Layers, Grid3x3, Boxes, Tag, LayoutTemplate, Package, ArrowRight } from 'lucide-react';

export type BuilderWorkflowStage =
  | 'projects'
  | 'blocks'
  | 'floors'
  | 'units'
  | 'pricing'
  | 'floor-plans'
  | 'inventory';

interface BuilderWorkflowBarProps {
  currentStage: BuilderWorkflowStage;
  counts?: {
    projects?: number;
    blocks?: number;
    floors?: number;
    units?: number;
    pricingRules?: number;
    floorPlans?: number;
  };
}

const STAGES: {
  id: BuilderWorkflowStage;
  to: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'projects', to: '/builder/projects', label: '1. Projects', shortLabel: 'Projects', icon: Building2 },
  { id: 'blocks', to: '/builder/blocks', label: '2. Blocks / Towers', shortLabel: 'Blocks', icon: Layers },
  { id: 'floors', to: '/builder/floors', label: '3. Floors', shortLabel: 'Floors', icon: Grid3x3 },
  { id: 'units', to: '/builder/units', label: '4. Units', shortLabel: 'Units', icon: Boxes },
  { id: 'pricing', to: '/builder/pricing', label: '5. Pricing', shortLabel: 'Pricing', icon: Tag },
  { id: 'floor-plans', to: '/builder/floor-plans', label: '6. Floor Plans', shortLabel: 'Floor Plans', icon: LayoutTemplate },
  { id: 'inventory', to: '/builder/inventory', label: '7. Inventory', shortLabel: 'Inventory', icon: Package },
];

export function BuilderWorkflowBar({ currentStage, counts }: BuilderWorkflowBarProps) {
  const location = useLocation();

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 mb-6 shadow-xs overflow-x-auto">
      <div className="flex items-center min-w-max gap-1 sm:gap-2">
        <div className="px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400 border-r border-slate-200 shrink-0 hidden md:block">
          Hierarchy Flow
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-1">
          {STAGES.map((stage, idx) => {
            const isActive = currentStage === stage.id || location.pathname === stage.to;
            const Icon = stage.icon;
            const count =
              stage.id === 'projects'
                ? counts?.projects
                : stage.id === 'blocks'
                ? counts?.blocks
                : stage.id === 'floors'
                ? counts?.floors
                : stage.id === 'units'
                ? counts?.units
                : stage.id === 'pricing'
                ? counts?.pricingRules
                : stage.id === 'floor-plans'
                ? counts?.floorPlans
                : undefined;

            return (
              <React.Fragment key={stage.id}>
                <Link
                  to={stage.to}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                      : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">{stage.label}</span>
                  <span className="inline sm:hidden">{stage.shortLabel}</span>

                  {typeof count === 'number' && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </Link>

                {idx < STAGES.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-300 shrink-0 hidden lg:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
