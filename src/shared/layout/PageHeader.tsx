import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
}

/**
 * PageHeader — TailAdmin pattern: title row on top, breadcrumb on right.
 * Falls back gracefully if no breadcrumbs are supplied.
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="font-heading text-title-sm font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h1>
        {subtitle && (
          <p className="text-theme-sm mt-0.5 text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-theme-sm">
            <Link
              to="/dashboard"
              className="text-gray-500 hover:text-brand-500 dark:text-gray-400"
            >
              Home
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-1.5">
                <ChevronRight size={14} className="text-gray-400" />
                {crumb.href ? (
                  <Link
                    to={crumb.href}
                    className="text-gray-500 hover:text-brand-500 dark:text-gray-400"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-800 dark:text-white/90">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
