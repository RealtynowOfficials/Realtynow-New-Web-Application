import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Printer,
  CheckSquare,
  Square,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import { useLanguageContext } from '../../lib/i18n/language-context';

export interface ColumnDef<T> {
  field: keyof T | string;
  headerName: string;
  width?: string | number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface EnterpriseDataGridProps<T extends { id: string | number }> {
  title?: string;
  subtitle?: string;
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  onExportCsv?: () => void;
}

export function EnterpriseDataGrid<T extends { id: string | number }>({
  title,
  subtitle,
  columns,
  data,
  loading = false,
  onRowClick,
  onAdd,
  onEdit,
  onDelete,
}: EnterpriseDataGridProps<T>) {
  const { t } = useLanguageContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterColumn, setFilterColumn] = useState<string>('all');

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      if (filterColumn !== 'all') {
        const val = String((row as Record<string, unknown>)[filterColumn] ?? '').toLowerCase();
        return val.includes(q);
      }
      return Object.values(row as Record<string, unknown>).some((val) =>
        String(val ?? '')
          .toLowerCase()
          .includes(q),
      );
    });
  }, [data, searchQuery, filterColumn]);

  // Sort Logic
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = (a as Record<string, unknown>)[sortField];
      const valB = (b as Record<string, unknown>)[sortField];
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map((d) => d.id)));
    }
  };

  const toggleSelectRow = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // CSV Export
  const exportCSV = () => {
    if (!data.length) return;
    const headers = columns.map((c) => c.headerName).join(',');
    const rows = data.map((row) =>
      columns.map((c) => `"${String((row as Record<string, unknown>)[c.field as string] ?? '').replace(/"/g, '""')}"`).join(','),
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
      {/* Grid Top Action Bar */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {title && <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">{title}</h2>}
          {subtitle && <p className="text-xs text-slate-300 mt-0.5">{subtitle}</p>}
        </div>

        {/* Global Action Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t('common.search', 'Search records...')}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
            />
          </div>

          {/* Filter Dropdown */}
          <select
            value={filterColumn}
            onChange={(e) => setFilterColumn(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="all">{t('blog.allCategories', 'All Columns')}</option>
            {columns.map((c) => (
              <option key={String(c.field)} value={String(c.field)}>
                {c.headerName}
              </option>
            ))}
          </select>

          {/* Export Buttons */}
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
            title="Export Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
            title="Print / PDF"
          >
            <Printer className="w-3.5 h-3.5 text-red-400" />
            <span>Print</span>
          </button>

          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-md shadow-red-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('common.add', 'Add New')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider sticky top-0 z-10">
              <th className="p-3.5 w-10 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {selectedIds.size === paginatedData.length && paginatedData.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-red-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              {columns.map((col) => (
                <th
                  key={String(col.field)}
                  style={{ width: col.width }}
                  className="p-3.5 whitespace-nowrap border-r border-slate-200/60 last:border-r-0 select-none"
                >
                  <div
                    className={`flex items-center justify-between gap-1.5 ${col.sortable !== false ? 'cursor-pointer hover:text-red-600' : ''}`}
                    onClick={() => col.sortable !== false && handleSort(String(col.field))}
                  >
                    <span>{col.headerName}</span>
                    {col.sortable !== false && (
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 opacity-40 ${sortField === col.field ? 'opacity-100 text-red-600' : ''}`}
                      />
                    )}
                  </div>
                </th>
              ))}
              <th className="p-3.5 text-right whitespace-nowrap w-24">{t('portal.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="p-3.5 text-center">
                    <div className="h-4 w-4 bg-slate-200 rounded mx-auto" />
                  </td>
                  {columns.map((c, i) => (
                    <td key={i} className="p-3.5">
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                    </td>
                  ))}
                  <td className="p-3.5 text-right">
                    <div className="h-4 w-12 bg-slate-100 rounded ml-auto" />
                  </td>
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="p-12 text-center text-slate-400">
                  {t('search.noResults', 'No matching records found')}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const isSelected = selectedIds.has(row.id);
                return (
                  <tr
                    key={String(row.id)}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors border-b border-slate-100 ${
                      isSelected ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50/80'
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => toggleSelectRow(row.id, e)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-red-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    {columns.map((col) => (
                      <td
                        key={String(col.field)}
                        className="p-3.5 border-r border-slate-100 last:border-r-0 whitespace-nowrap font-medium"
                      >
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.field as string] ?? '—')}
                      </td>
                    ))}
                    <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(row)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>
            {t('common.showing', 'Showing')}{' '}
            <strong className="font-bold text-slate-900">
              {sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </strong>{' '}
            {t('common.to', 'to')}{' '}
            <strong className="font-bold text-slate-900">{Math.min(currentPage * pageSize, sortedData.length)}</strong>{' '}
            {t('common.of', 'of')} <strong className="font-bold text-slate-900">{sortedData.length}</strong>{' '}
            {t('common.entries', 'entries')}
          </span>
          {selectedIds.size > 0 && (
            <span className="ml-2 font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
              ({selectedIds.size} {t('compare.selectedCount', 'selected')})
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-red-600"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-slate-800">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
