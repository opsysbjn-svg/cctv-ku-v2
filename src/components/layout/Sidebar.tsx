import React from 'react';
import {
  LayoutDashboard,
  Video,
  PlaySquare,
  Camera,
  Activity,
  HardDrive,
  Calendar,
  FileText,
  Settings,
  Cctv,
} from 'lucide-react';
import { AppPage } from '../../types/system';
import { Tooltip } from '../ui/Tooltip';

interface NavItem {
  id: AppPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'live', label: 'Live Monitoring', icon: Video },
  { id: 'playback', label: 'Playback', icon: PlaySquare },
  { id: 'cameras', label: 'Kamera', icon: Camera },
  { id: 'motion', label: 'Motion Detection', icon: Activity, badge: 'Tahap 3' },
  { id: 'storage', label: 'Storage Manager', icon: HardDrive },
  { id: 'schedule', label: 'Recording Schedule', icon: Calendar, badge: 'Tahap 3' },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  activePage: AppPage;
  onSelectPage: (page: AppPage) => void;
  isCollapsed: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  isCollapsed,
}) => {
  return (
    <aside
      className={`h-screen bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 transition-all duration-200 select-none z-20 ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-800/80 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-cyan-400">
          <Cctv className="w-5 h-5 text-cyan-400" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-white tracking-tight">CCTV-KU</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-900/60 text-cyan-300 border border-blue-700/50">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">Smart Desktop Monitor</p>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          const buttonContent = (
            <button
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer group relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive
                    ? 'text-cyan-200'
                    : 'text-slate-400 group-hover:text-cyan-400'
                }`}
              />

              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Active bar indicator */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-cyan-400 rounded-r" />
              )}
            </button>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.id} content={item.label} position="right">
                {buttonContent}
              </Tooltip>
            );
          }

          return <div key={item.id}>{buttonContent}</div>;
        })}
      </nav>

      {/* Footer info */}
      <div className="p-3 border-t border-slate-800/80 shrink-0 text-xs text-slate-500">
        {!isCollapsed ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>Platform</span>
              <span className="text-slate-300 font-medium">Tauri 2 / Win Desktop</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tahap</span>
              <span className="text-cyan-400 font-mono">2.0 Recording</span>
            </div>
          </div>
        ) : (
          <div className="text-center font-mono text-[10px] text-cyan-400">T2</div>
        )}
      </div>
    </aside>
  );
};
