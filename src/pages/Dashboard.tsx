import { useMemo } from 'react';
import { Clock, FileText, AlertTriangle, Stamp } from 'lucide-react';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { formatDate, getSealDaysRemaining } from '@/shared/utils';

const statCards = [
  { key: 'pending', label: '待审批数', icon: Clock, color: 'from-amber-500 to-orange-500' },
  { key: 'monthly', label: '本月用印数', icon: FileText, color: 'from-sky-500 to-blue-500' },
  { key: 'expiring', label: '临期印章', icon: AlertTriangle, color: 'from-red-500 to-rose-500' },
  { key: 'total', label: '印章总数', icon: Stamp, color: 'from-emerald-500 to-green-500' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const applications = useAppStore((state) => state.applications);
  const seals = useAppStore((state) => state.seals);

  const pendingCount = useMemo(
    () =>
      applications.filter(
        (app) => app.status === 'pending_dept' || app.status === 'pending_leader'
      ).length,
    [applications]
  );

  const monthlyCount = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return applications
      .filter((app) => {
        const createdAt = new Date(app.createdAt);
        return (
          createdAt.getMonth() === currentMonth &&
          createdAt.getFullYear() === currentYear &&
          (app.status === 'approved' || app.status === 'registered')
        );
      })
      .reduce((sum, app) => sum + app.quantity, 0);
  }, [applications]);

  const expiringSeals = useMemo(() => {
    const now = new Date();
    const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return seals.filter((seal) => {
      const expiryDate = new Date(seal.expiryDate);
      return expiryDate <= threshold && expiryDate >= now;
    });
  }, [seals]);

  const totalSeals = seals.length;

  const sealDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    applications.forEach((app) => {
      distribution[app.sealType] = (distribution[app.sealType] || 0) + 1;
    });
    return Object.entries(distribution).map(([type, count]) => ({ type, count }));
  }, [applications]);

  const recentApplications = useMemo(
    () =>
      [...applications]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [applications]
  );

  const statValues: Record<string, number> = {
    pending: pendingCount,
    monthly: monthlyCount,
    expiring: expiringSeals.length,
    total: totalSeals,
  };

  const maxDistribution = Math.max(...sealDistribution.map((d) => d.count), 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
        <button
          onClick={() => navigate('/applications/new')}
          className="btn-primary"
        >
          新建用印申请
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{statValues[card.key]}</p>
                </div>
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">临期预警</h2>
            <span className="text-sm text-gray-500">30天内到期</span>
          </div>
          {expiringSeals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无临期印章</div>
          ) : (
            <div className="space-y-3">
              {expiringSeals.map((seal) => {
                const daysLeft = getSealDaysRemaining(seal);
                const isUrgent = daysLeft <= 7;
                return (
                  <div
                    key={seal.id}
                    className={`p-4 rounded-lg border ${
                      isUrgent
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{seal.sealType}</span>
                          <StatusBadge status={seal.status} type="seal" />
                        </div>
                        <p className="text-sm text-gray-600">{seal.serialNumber}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${
                            isUrgent ? 'text-red-600' : 'text-amber-600'
                          }`}
                        >
                          {daysLeft}天
                        </p>
                        <p className="text-xs text-gray-500">
                          到期：{formatDate(seal.expiryDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">用印类型分布</h2>
          {sealDistribution.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无数据</div>
          ) : (
            <div className="space-y-4">
              {sealDistribution.map((item) => (
                <div key={item.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.type}</span>
                    <span className="text-sm text-gray-500">{item.count} 次</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-700 rounded-full transition-all"
                      style={{ width: `${(item.count / maxDistribution) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">最近用印记录</h2>
            <button
              onClick={() => navigate('/applications')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              查看全部
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申请编号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申请人
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  印章类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用印事由
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  紧急程度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申请时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentApplications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {app.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {app.applicantName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {app.sealType}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {app.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={app.urgency} type="urgency" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={app.status} type="application" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(app.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => navigate(`/applications/${app.id}`)}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
