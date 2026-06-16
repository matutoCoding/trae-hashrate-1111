import { useEffect } from 'react';
import { X, FileText, User, Calendar, Shield } from 'lucide-react';
import { formatDate } from '@/shared/utils';
import type { SealRegistration, SealApplication } from '@/shared/types';

interface PhotoEvidenceModalProps {
  open: boolean;
  onClose: () => void;
  registration?: SealRegistration;
  application?: SealApplication;
}

export default function PhotoEvidenceModal({
  open,
  onClose,
  registration,
  application,
}: PhotoEvidenceModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open || !registration) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">存证照片预览</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 p-5">
          {registration.photoEvidence ? (
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <img
                src={registration.photoEvidence}
                alt="用印存证"
                className="w-full h-auto max-h-[60vh] object-contain rounded"
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">该登记未上传存证照片</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="flex items-center gap-1.5 text-gray-500 mb-0.5">
              <FileText className="w-3.5 h-3.5" />
              <span className="text-xs">登记编号</span>
            </div>
            <div className="text-gray-900 font-medium">{registration.id}</div>
          </div>
          {application && (
            <div>
              <div className="flex items-center gap-1.5 text-gray-500 mb-0.5">
                <FileText className="w-3.5 h-3.5" />
                <span className="text-xs">关联申请编号</span>
              </div>
              <div className="text-gray-900 font-medium">
                {application.id}
                <span className="text-gray-500 text-xs ml-2">（{application.reason}）</span>
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 text-gray-500 mb-0.5">
              <User className="w-3.5 h-3.5" />
              <span className="text-xs">登记人 / 用印人</span>
            </div>
            <div className="text-gray-900">
              {registration.registrarName} / {registration.registrant}（
              {registration.registrantDepartment}）
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-gray-500 mb-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-xs">用印时间 / 登记时间</span>
            </div>
            <div className="text-gray-900">
              {formatDate(registration.usageTime)} / {formatDate(registration.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
