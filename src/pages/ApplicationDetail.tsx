import { ArrowLeft, Edit, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import ApprovalTimeline from '@/components/ApprovalTimeline';
import { useNavigate, useParams } from 'react-router-dom';

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}



export default function ApplicationDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const getApplicationById = useAppStore((state) => state.getApplicationById);

  const application = id ? getApplicationById(id) : undefined;

  if (!application) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>
        <div className="card text-center py-12">
          <p className="text-gray-500">申请不存在或已被删除</p>
        </div>
      </div>
    );
  }

  const canEdit = application.status === 'draft' || application.status === 'rejected';

  const handleEdit = () => {
    navigate(`/applications/${application.id}/edit`);
  };

  const handleResubmit = () => {
    navigate(`/applications/${application.id}/edit`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">申请详情</h1>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && application.status === 'draft' && (
            <button onClick={handleEdit} className="btn-primary inline-flex items-center gap-2">
              <Edit className="w-4 h-4" />
              编辑
            </button>
          )}
          {canEdit && application.status === 'rejected' && (
            <button
              onClick={handleResubmit}
              className="btn-primary inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              修改重提
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
              <div className="flex items-center gap-3">
                <StatusBadge status={application.status} type="application" />
                <StatusBadge status={application.urgency} type="urgency" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <dt className="text-sm text-gray-500 mb-1">申请编号</dt>
                <dd className="text-sm text-gray-900 font-medium">{application.id}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 mb-1">申请人</dt>
                <dd className="text-sm text-gray-900 font-medium">{application.applicantName}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 mb-1">所属部门</dt>
                <dd className="text-sm text-gray-900 font-medium">{application.department}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 mb-1">印章类型</dt>
                <dd className="text-sm text-gray-900 font-medium">{application.sealType}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 mb-1">文件名称</dt>
                <dd className="text-sm text-gray-900 font-medium">{application.documentName}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 mb-1">用印数量</dt>
                <dd className="text-sm text-gray-900 font-medium">{application.quantity}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 mb-1">申请时间</dt>
                <dd className="text-sm text-gray-900 font-medium">
                  {formatDate(application.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 mb-1">更新时间</dt>
                <dd className="text-sm text-gray-900 font-medium">
                  {formatDate(application.updatedAt)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-gray-500 mb-1">用印事由</dt>
                <dd className="text-sm text-gray-900">{application.reason}</dd>
              </div>
              {application.remark && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-gray-500 mb-1">备注</dt>
                  <dd className="text-sm text-gray-900">{application.remark}</dd>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">审批轨迹</h2>
            <ApprovalTimeline records={application.approvalTrail} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">当前状态</h2>
            <div className="text-center py-4">
              <div className="mb-3">
                <StatusBadge
                  status={application.status}
                  type="application"
                  className="text-base px-4 py-1.5"
                />
              </div>
              <p className="text-sm text-gray-500">
                当前节点：
                <span className="text-gray-900 font-medium">
                  {application.currentNode === 'submitter'
                    ? '申请人'
                    : application.currentNode === 'dept_head'
                    ? '部门负责人'
                    : '领导'}
                </span>
              </p>
            </div>
          </div>

          {application.status === 'rejected' && application.approvalTrail.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-red-800 mb-2">驳回原因</h3>
              {(() => {
                const rejectRecord = [...application.approvalTrail]
                  .reverse()
                  .find((r) => r.action === 'reject');
                return (
                  <p className="text-sm text-red-700">
                    {rejectRecord?.opinion || '未填写驳回原因'}
                  </p>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
