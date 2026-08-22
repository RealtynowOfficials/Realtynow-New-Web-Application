import { Search, CheckCheck, Trash2, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Button, Select } from '../ui';
import { CATEGORIES, PRIORITIES, type NotificationCategory, type UiPriority } from './notification-utils';

export type StatusFilter = 'all' | 'unread';
export type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'earlier';
export type SortOrder = 'newest' | 'oldest';

export function NotificationToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  dateFilter,
  onDateFilterChange,
  sort,
  onSortChange,
  onMarkAllRead,
  onClearAll,
  onOpenPreferences,
  unreadCount,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  categoryFilter: NotificationCategory | 'all';
  onCategoryFilterChange: (v: NotificationCategory | 'all') => void;
  priorityFilter: UiPriority | 'all';
  onPriorityFilterChange: (v: UiPriority | 'all') => void;
  dateFilter: DateFilter;
  onDateFilterChange: (v: DateFilter) => void;
  sort: SortOrder;
  onSortChange: (v: SortOrder) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onOpenPreferences: () => void;
  unreadCount: number;
}) {
  return (
    <div className="sticky top-[64px] z-20 -mx-4 mb-5 border-b border-navy-100 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-navy-800 dark:bg-navy-950/90 sm:top-0 sm:rounded-2xl sm:border sm:shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 sm:min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search notifications..."
              className="w-full rounded-xl border border-navy-150 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-400/10 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
            />
          </div>

          <div className="flex rounded-lg bg-navy-100 p-1 dark:bg-navy-800">
            <button
              onClick={() => onStatusFilterChange('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${statusFilter === 'all' ? 'bg-white text-navy-900 shadow dark:bg-navy-700 dark:text-white' : 'text-navy-500'}`}
            >
              All
            </button>
            <button
              onClick={() => onStatusFilterChange('unread')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${statusFilter === 'unread' ? 'bg-white text-navy-900 shadow dark:bg-navy-700 dark:text-white' : 'text-navy-500'}`}
            >
              Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          </div>

          <Button size="sm" variant="ghost" icon={<SlidersHorizontal className="h-3.5 w-3.5" />} onClick={onOpenPreferences}>
            Preferences
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value as NotificationCategory | 'all')}
            className="w-auto text-xs"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Select
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value as UiPriority | 'all')}
            className="w-auto text-xs"
          >
            <option value="all">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>

          <Select value={dateFilter} onChange={(e) => onDateFilterChange(e.target.value as DateFilter)} className="w-auto text-xs">
            <option value="all">Any time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This week</option>
            <option value="earlier">Earlier</option>
          </Select>

          <button
            type="button"
            onClick={() => onSortChange(sort === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-1.5 rounded-lg border border-navy-150 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50 dark:border-navy-700 dark:text-navy-300 dark:hover:bg-navy-800"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sort === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<CheckCheck className="h-3.5 w-3.5" />} onClick={onMarkAllRead}>
              Mark all read
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-error-600"
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={onClearAll}
            >
              Clear all
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
