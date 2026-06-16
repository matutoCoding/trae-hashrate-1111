import { useState } from 'react';
import { ArrowLeft, Edit, RefreshCw, FileText, User, Calendar, Image, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import ApprovalTimeline from '@/components/ApprovalTimeline';
import PhotoEvidenceModal from '@/components/PhotoEvidenceModal';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDate } from '@/shared/utils';
import type { SealRegistration } from '@/shared/types';

export default function ApplicationDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const applications = useAppStore((state) => state.applications);
  const registrations = useAppStore((state) => state.registrations);
  const seals = useAppStore((state) => state.seals);

  const [previewReg, setPreviewReg] = useState<SealRegistration | null>(null);

  const application = id ? applications.find((a) => a.id === id) : undefined;
  const relatedRegistrations = id
    ? registrations
        .filter((r) => r.applicationId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];
  const getSealById = (sealId: string) => seals.find((s) => s.id === sealId);

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

          {relatedRegistrations.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                用印登记记录（{relatedRegistrations.length}）
              </h2>
              <div className="space-y-5">
                {relatedRegistrations.map((reg) => {
                  const seal = getSealById(reg.sealId);
                  return (
                    <div
                      key={reg.id}
                      className="border border-gray-200 rounded-lg p-5 space-y-4 bg-gray-50/50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            登记编号 {reg.id}
                          </span>
                          <StatusBadge status="registered" type="application" />
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(reg.createdAt)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div className="flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <dt className="text-gray-500">印章批次</dt>
                            <dd className="text-gray-900 font-medium">
                              {seal ? `${seal.batchNumber}（${seal.serialNumber}）` : reg.sealId}
                            </dd>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <dt className="text-gray-500">登记人 / 用印人</dt>
                            <dd className="text-gray-900">
                              {reg.registrarName} / {reg.registrant}（{reg.registrantDepartment}）
                            </dd>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <dt className="text-gray-500">用印时间</dt>
                            <dd className="text-gray-900">{formatDate(reg.usageTime)}</dd>
                          </div>
                        </div>
                        {reg.remark && (
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <dt className="text-gray-500">备注</dt>
                              <dd className="text-gray-900">{reg.remark}</dd>
                            </div>
                          </div>
                        )}
                        {reg.photoEvidence && (
                          <div className="sm:col-span-2 flex items-start gap-2">
                            <Image className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <dt className="text-gray-500 mb-1">
                                拍照存证
                                <button
                                  onClick={() => setPreviewReg(reg)}
                                  className="ml-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                                >
                                  点击查看大图
                                </button>
                              </dt>
                              <img
                                src={reg.photoEvidence}
                                alt="存证照片"
                                onClick={() => setPreviewReg(reg)}
                                className="max-w-xs max-h-48 rounded-lg border border-gray-200 object-contain cursor-pointer hover:ring-2 hover:ring-primary-400 transition-all"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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

      <PhotoEvidenceModal
        open={!!previewReg}
        onClose={() => setPreviewReg(null)}
        registration={previewReg || undefined}
        application={application}
      />
    </div>
  );
}
