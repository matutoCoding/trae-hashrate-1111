import { useState, useMemo } from 'react';
import { Search, Plus, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import type { Seal, SealStatus } from '@/shared/types';
import { isSealExpired, isSealLocked } from '@/shared/utils';

const PAGE_SIZE = 10;

const statusOptions: { value: SealStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'stored', label: '入库' },
  { value: 'in_use', label: '使用中' },
  { value: 'warning', label: '临期' },
  { value: 'expired', label: '已过期' },
  { value: 'locked', label: '已锁定' },
];

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function getDaysRemaining(expiryDate: string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getProgressPercentage(receivedDate: string, expiryDate: string): number {
  const start = new Date(receivedDate).getTime();
  const end = new Date(expiryDate).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
}

function getProgressColor(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'bg-red-500';
  if (daysRemaining <= 30) return 'bg-orange-500';
  return 'bg-green-500';
}

export default function SealList() {
  const navigate = useNavigate();
  const seals = useAppStore((state) => state.seals);
  const enableSeal = useAppStore((state) => state.enableSeal);
  const updateSeal = useAppStore((state) => state.updateSeal);

  const [statusFilter, setStatusFilter] = useState<SealStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const processedSeals = useMemo(() => {
    return seals.map((seal) => {
      const daysRemaining = getDaysRemaining(seal.expiryDate);
      let effectiveStatus: SealStatus = seal.status;
      if (daysRemaining <= 0 && seal.status !== 'locked') {
        effectiveStatus = 'expired';
      } else if (daysRemaining > 0 && daysRemaining <= 30 && seal.status === 'in_use') {
        effectiveStatus = 'warning';
      }
      return {
        ...seal,
        daysRemaining,
        effectiveStatus,
        isExpired: daysRemaining <= 0,
        isWarning: daysRemaining > 0 && daysRemaining <= 30,
        progress: getProgressPercentage(seal.receivedDate, seal.expiryDate),
      };
    });
  }, [seals]);

  const expiringCount = useMemo(
    () => processedSeals.filter((s) => s.isWarning && !s.isExpired).length,
    [processedSeals]
  );

  const filteredSeals = useMemo(() => {
    return processedSeals
      .filter((seal) => {
        const matchesStatus = statusFilter === 'all' || seal.effectiveStatus === statusFilter;
        const matchesSearch =
          searchQuery === '' ||
          seal.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seal.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seal.sealType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seal.custodian.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (a.status === 'stored' && b.status !== 'stored') return -1;
        if (b.status === 'stored' && a.status !== 'stored') return 1;
        if (a.status === 'stored' && b.status === 'stored') {
          return new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime();
        }
        return new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime();
      });
  }, [processedSeals, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredSeals.length / PAGE_SIZE);
  const paginatedSeals = filteredSeals.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as SealStatus | 'all');
    setCurrentPage(1);
  };

  const getEarliestAvailableSealOfType = (sealType: string): Seal | undefined => {
    return seals
      .filter(
        (s) =>
          s.sealType === sealType &&
          s.status === 'stored' &&
          !isSealExpired(s) &&
          !isSealLocked(s)
      )
      .sort(
        (a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime()
      )[0];
  };

  const isSealTheEarliestAvailable = (seal: Seal): boolean => {
    if (seal.status !== 'stored') return true;
    const earliest = getEarliestAvailableSealOfType(seal.sealType);
    return !earliest || earliest.id === seal.id;
  };

  const handleEnable = (seal: Seal) => {
    if (seal.status !== 'stored') return;
    const earliest = getEarliestAvailableSealOfType(seal.sealType);
    if (earliest && earliest.id !== seal.id) {
      alert(`请先启用同类型更早入库的批次：${earliest.batchNumber}`);
      return;
    }
    enableSeal(seal.id);
  };

  const handleCheckExpiry = () => {
    processedSeals.forEach((seal) => {
      if (seal.isExpired && seal.status !== 'expired' && seal.status !== 'locked') {
        updateSeal(seal.id, { status: 'expired' });
      } else if (
        seal.isWarning &&
        !seal.isExpired &&
        seal.status === 'in_use'
      ) {
        updateSeal(seal.id, { status: 'warning' });
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">印章效期管理</h1>
          {expiringCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              <AlertTriangle className="w-3.5 h-3.5" />
              {expiringCount} 枚临期
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/seals/new')}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新增入库
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索批次编号、序列号、印章类型、保管人..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  批次编号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  印章类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  序列号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  入库日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  有效期至
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  效期进度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  保管人
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedSeals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                paginatedSeals.map((seal) => (
                  <tr
                    key={seal.id}
                    className={`${
                      seal.isExpired
                        ? 'bg-red-50'
                        : seal.isWarning
                        ? 'bg-orange-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {seal.batchNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {seal.sealType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {seal.serialNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(seal.receivedDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex flex-col">
                        <span>{formatDate(seal.expiryDate)}</span>
                        <span
                          className={`text-xs mt-0.5 ${
                            seal.isExpired
                              ? 'text-red-600 font-medium'
                              : seal.isWarning
                              ? 'text-orange-600 font-medium'
                              : 'text-gray-400'
                          }`}
                        >
                          {seal.isExpired
                            ? `已过期 ${Math.abs(seal.daysRemaining)} 天`
                            : `剩余 ${seal.daysRemaining} 天`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-32">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>{seal.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(seal.daysRemaining)}`}
                            style={{ width: `${Math.min(seal.progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {seal.custodian}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge
                          status={seal.isExpired ? 'expired' : seal.effectiveStatus}
                          type="seal"
                        />
                        {seal.isExpired && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-600 text-white">
                            已锁定
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {seal.isExpired ? (
                        <span className="text-gray-400 cursor-not-allowed">启用</span>
                      ) : seal.status === 'stored' ? (
                        isSealTheEarliestAvailable(seal) ? (
                          <button
                            onClick={() => handleEnable(seal)}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            启用
                          </button>
                        ) : (
                          <button
                            disabled
                            title="请先启用更早入库的同类型批次"
                            className="text-gray-400 cursor-not-allowed font-medium"
                          >
                            启用
                          </button>
                        )
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredSeals.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              共 {filteredSeals.length} 条记录，当前第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    page === currentPage
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
