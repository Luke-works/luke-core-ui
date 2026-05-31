import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';

/* ── Detail Item ─────────────────────────────────────────────── */

export interface DetailItem {
  label: string;
  value: string | ReactNode;
  icon?: LucideIcon;
  muted?: boolean;
  accent?: 'blue' | 'green' | 'red' | 'amber';
  onClick?: () => void;
}

/* ── Props ────────────────────────────────────────────────────── */

interface DetailPanelProps {
  title: string;
  icon: LucideIcon;
  items: DetailItem[];
  defaultOpen?: boolean;
  actions?: ReactNode;
  badge?: ReactNode;
}

const accentTextClass: Record<string, string> = {
  blue: 'text-brand-500 dark:text-brand-400',
  green: 'text-success-600 dark:text-success-500',
  red: 'text-error-600 dark:text-error-500',
  amber: 'text-warning-600 dark:text-orange-400',
};

export default function DetailPanel({
  title,
  icon: TitleIcon,
  items,
  defaultOpen = true,
  actions,
  badge,
}: DetailPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] mb-3 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center w-full px-5 py-3 text-left transition-colors ${
          open
            ? 'bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800'
            : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'
        }`}
      >
        <span className="text-gray-400 mr-2.5 inline-flex">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-50 text-brand-500 mr-2.5 shrink-0 dark:bg-brand-500/15 dark:text-brand-400">
          <TitleIcon size={15} />
        </span>
        <span className="flex-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
          {title}
        </span>
        {badge && <span className="mr-3">{badge}</span>}
        {actions && (
          <span onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
            {actions}
          </span>
        )}
      </button>

      {/* Body */}
      {open && (
        <div
          className="grid px-5 py-5"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
            gap: '20px 28px',
          }}
        >
          {items.map((item, idx) => {
            const Icon = item.icon;
            const accentCls = item.accent ? accentTextClass[item.accent] : '';
            const baseTextCls = item.muted
              ? 'text-gray-500 dark:text-gray-400'
              : 'text-gray-800 dark:text-white/90';
            const isClickable = !!item.onClick;

            return (
              <div key={idx} className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {Icon && (
                    <span className="flex items-center justify-center w-4 h-4 rounded bg-gray-100 dark:bg-white/[0.05] text-gray-400 shrink-0">
                      <Icon size={11} />
                    </span>
                  )}
                  <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-none">
                    {item.label}
                  </span>
                </div>

                {typeof item.value === 'string' ? (
                  isClickable ? (
                    <button
                      type="button"
                      className="block text-theme-sm text-brand-500 hover:underline break-all text-left"
                      title={item.value}
                      onClick={item.onClick}
                    >
                      {item.value}
                    </button>
                  ) : (
                    <span
                      className={`block text-theme-sm break-all ${accentCls || baseTextCls} ${
                        item.accent ? 'font-semibold' : ''
                      }`}
                      title={item.value}
                    >
                      {item.value}
                    </span>
                  )
                ) : (
                  <div className={`text-theme-sm ${baseTextCls}`}>{item.value}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
