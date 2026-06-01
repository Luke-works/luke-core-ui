import { Lock } from 'lucide-react';

export default function NoAccess() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-gray-400">
        <Lock size={28} />
      </div>
      <h2 className="text-base font-medium text-gray-800 dark:text-white/90">No access</h2>
      <p className="text-theme-sm mt-1 max-w-sm text-gray-500 dark:text-gray-400">
        You don't have permission to view this page. Contact an operator if you think this is a mistake.
      </p>
    </div>
  );
}
