import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  Image,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Download,
  Filter,
  Search,
} from 'lucide-react';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import PhotoEvidenceModal from '@/components/PhotoEvidenceModal';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { formatDate, getSealDaysRemaining } from '@/shared/utils';
import type { SealRegistration, SealApplication } from '@/shared/types';

interface FilterState {
  startDate: string;
  endDate: string;
  applicantName: string;
  department: string;
}

export default function SealDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const seals = useAppStore((state) => state.seals);
  const registrations = useAppStore((state) => state.registrations);
  const applications = useAppStore((state) => state.applications);

  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    applicantName: '',
    department: '',
  });
  const [showFilters, setShowFilters] = useState(true);
  const [previewReg, setPreviewReg] = useState<SealRegistration | null>(null);

  const seal = id ? seals.find((s) => s.id === id) : undefined;
  const sealRegistrations = id
    ? registrations
        .filter((r) => r.sealId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];
  const getApplicationById = (appId: string) => applications.find((a) => a.id === appId);

  const departments = useMemo(() => {
    const set = new Set<string>();
    sealRegistrations.forEach((r) => {
      const app = getApplicationById(r.applicationId);
      if (app?.department) set.add(app.department);
    });
    return Array.from(set);
  }, [sealRegistrations, applications]);

  const filteredRegistrations = useMemo(() => {
    return sealRegistrations.filter((reg) => {
      const app = getApplicationById(reg.applicationId);
      const regTime = new Date(reg.createdAt).getTime();
      if (filters.startDate) {
        const start = new Date(filters.startDate).getTime();
        if (regTime < start) return false;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate + ' 23:59:59').getTime();
        if (regTime > end) return false;
      }
      if (filters.applicantName && app) {
        if (!app.applicantName.includes(filters.applicantName)) return false;
      }
      if (filters.department && app) {
        if (app.department !== filters.department) return false;
      }
      return true;
    });
  }, [sealRegistrations, filters, applications]);

  const handleExport = () => {
    if (filteredRegistrations.length === 0) {
      alert('当前筛选结果为空，无法导出');
      return;
    }
    const header = [
      '登记编号',
      '关联申请编号',
      '申请事由',
      '申请人',
      '申请部门',
      '印章批次',
      '印章序列号',
      '登记人',
      '用印人',
      '用印部门',
      '用印时间',
      '登记时间',
      '存证情况',
      '备注',
    ];
    const rows = filteredRegistrations.map((reg) => {
      const app = getApplicationById(reg.applicationId);
      return [
        reg.id,
        reg.applicationId,
        app?.reason || '',
        app?.applicantName || '',
        app?.department || '',
        seal?.batchNumber || '',
        seal?.serialNumber || '',
        reg.registrarName,
        reg.registrant,
        reg.registrantDepartment,
        formatDate(reg.usageTime),
        formatDate(reg.createdAt),
        reg.photoEvidence ? '已上传' : '未上传',
        reg.remark || '',
      ];
    });
    const escape = (val: string) => {
      const s = String(val).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const csv = '\ufeff' + [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `印章台账_${seal?.batchNumber || seal?.id}_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResetFilters = () => {
    setFilters({ startDate: '', endDate: '', applicantName: '', department: '' });
  };

  const stats = useMemo(() => {
    if (!seal) return null;
    const daysRemaining = getSealDaysRemaining(seal);
    return {
      daysRemaining,
      totalUsed: sealRegistrations.length,
      totalQuantity: sealRegistrations.reduce((sum) => sum + 1, 0),
    };
  }, [seal, sealRegistrations]);

  if (!seal) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/seals')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回印章列表
        </button>
        <div className="card text-center py-12">
          <p className="text-gray-500">印章批次不存在或已被删除</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/seals')}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">印章批次台账</h1>
            <p className="text-sm text-gray-500 mt-1">
              批次编号 {seal.batchNumber} · 序列号 {seal.serialNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={seal.status} type="seal" className="text-base px-4 py-1.5" />
          {stats && stats.daysRemaining > 0 && stats.daysRemaining <= 30 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              <AlertTriangle className="w-3.5 h-3.5" />
              临期（剩余 {stats.daysRemaining} 天）
            </span>
          )}
          {stats && stats.daysRemaining <= 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <AlertTriangle className="w-3.5 h-3.5" />
              已过期
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <ShieldCheck className="w-4 h-4" />
            使用状态
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {seal.status === 'stored'
              ? '库存'
              : seal.status === 'in_use'
              ? '使用中'
              : seal.status === 'warning'
              ? '临期使用中'
              : seal.status === 'expired'
              ? '已过期'
              : '已锁定'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <FileText className="w-4 h-4" />
            累计用印登记
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats ? stats.totalUsed : 0} 次
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Clock className="w-4 h-4" />
            启用时间
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {seal.enableDate ? formatDate(seal.enableDate) : '尚未启用'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Calendar className="w-4 h-4" />
            有效期剩余
          </div>
          <div
            className={`text-2xl font-bold ${
              stats && stats.daysRemaining <= 0
                ? 'text-red-600'
                : stats && stats.daysRemaining <= 30
                ? 'text-orange-600'
                : 'text-gray-900'
            }`}
          >
            {stats ? (stats.daysRemaining > 0 ? `${stats.daysRemaining} 天` : '已过期') : '—'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">批次基本信息</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
          <div>
            <dt className="text-gray-500 mb-1">批次编号</dt>
            <dd className="text-gray-900 font-medium">{seal.batchNumber}</dd>
          </div>
          <div>
            <dt className="text-gray-500 mb-1">印章类型</dt>
            <dd className="text-gray-900">{seal.sealType}</dd>
          </div>
          <div>
            <dt className="text-gray-500 mb-1">印章序列号</dt>
            <dd className="text-gray-900">{seal.serialNumber}</dd>
          </div>
          <div>
            <dt className="text-gray-500 mb-1">入库日期</dt>
            <dd className="text-gray-900">{formatDate(seal.receivedDate)}</dd>
          </div>
          <div>
            <dt className="text-gray-500 mb-1">有效期至</dt>
            <dd className="text-gray-900">{formatDate(seal.expiryDate)}</dd>
          </div>
          <div>
            <dt className="text-gray-500 mb-1">保管人</dt>
            <dd className="text-gray-900">{seal.custodian}</dd>
          </div>
          {seal.remark && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-gray-500 mb-1">备注</dt>
              <dd className="text-gray-900">{seal.remark}</dd>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            历史用印登记
            <span className="text-sm font-normal text-gray-500">
              （筛选后 {filteredRegistrations.length} / 全部 {sealRegistrations.length}）
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="btn-secondary inline-flex items-center gap-1.5"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? '收起筛选' : '展开筛选'}
            </button>
            <button
              onClick={handleExport}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              导出台账（CSV）
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">登记日期起</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">登记日期止</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">申请人</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filters.applicantName}
                  onChange={(e) => setFilters((f) => ({ ...f, applicantName: e.target.value }))}
                  placeholder="输入申请人姓名"
                  className="input-field text-sm pl-9"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">申请部门</label>
              <select
                value={filters.department}
                onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
                className="input-field text-sm"
              >
                <option value="">全部部门</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
              <button onClick={handleResetFilters} className="text-sm text-gray-500 hover:text-gray-700">
                重置筛选条件
              </button>
            </div>
          </div>
        )}

        {filteredRegistrations.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p>
              {sealRegistrations.length === 0
                ? '该印章批次暂无用印登记记录'
                : '没有符合当前筛选条件的登记记录'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登记编号
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    关联申请
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登记人 / 用印人
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用印时间
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登记时间
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    拍照存证
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRegistrations.map((reg) => {
                  const application = getApplicationById(reg.applicationId);
                  return (
                    <tr key={reg.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {reg.id}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {application ? (
                          <div>
                            <Link
                              to={`/applications/${application.id}`}
                              className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                              {application.id}
                            </Link>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {application.reason}
                            </div>
                          </div>
                        ) : (
                          <span>{reg.applicationId}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        <div>{reg.registrarName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          用印人：{reg.registrant}（{reg.registrantDepartment}）
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(reg.usageTime)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(reg.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {reg.photoEvidence ? (
                          <img
                            src={reg.photoEvidence}
                            alt="存证"
                            onClick={() => setPreviewReg(reg)}
                            className="w-12 h-12 rounded border border-gray-200 object-cover cursor-pointer hover:ring-2 hover:ring-primary-400 transition-all"
                            title="点击查看大图"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">无</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm space-x-3 whitespace-nowrap">
                        {reg.photoEvidence && (
                          <button
                            onClick={() => setPreviewReg(reg)}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            查看存证
                          </button>
                        )}
                        {application && (
                          <Link
                            to={`/applications/${application.id}`}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            查看申请
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PhotoEvidenceModal
        open={!!previewReg}
        onClose={() => setPreviewReg(null)}
        registration={previewReg || undefined}
        application={previewReg ? getApplicationById(previewReg.applicationId) : undefined}
      />
    </div>
  );
}
