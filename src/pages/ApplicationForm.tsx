import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { useAppStore } from '@/store';
import { useNavigate, useParams } from 'react-router-dom';
import type { SealApplication, UrgencyLevel, ApprovalNode, ApplicationStatus } from '../../shared/types';

const sealTypeOptions = ['公章', '合同专用章', '财务专用章', '法人章', '发票专用章'];
const urgencyOptions: { value: UrgencyLevel; label: string }[] = [
  { value: 'normal', label: '普通' },
  { value: 'urgent', label: '紧急' },
  { value: 'emergency', label: '特急' },
];

interface FormData {
  sealType: string;
  reason: string;
  documentName: string;
  quantity: number;
  urgency: UrgencyLevel;
  remark: string;
}

const initialFormData: FormData = {
  sealType: '',
  reason: '',
  documentName: '',
  quantity: 1,
  urgency: 'normal',
  remark: '',
};

function generateId() {
  return 'app' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function ApplicationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const currentUser = useAppStore((state) => state.currentUser);
  const getApplicationById = useAppStore((state) => state.getApplicationById);
  const addApplication = useAppStore((state) => state.addApplication);
  const updateApplication = useAppStore((state) => state.updateApplication);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (isEdit && id) {
      const app = getApplicationById(id);
      if (app) {
        setFormData({
          sealType: app.sealType,
          reason: app.reason,
          documentName: app.documentName,
          quantity: app.quantity,
          urgency: app.urgency,
          remark: app.remark || '',
        });
      }
    }
  }, [isEdit, id, getApplicationById]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value, 10) || 1 : value,
    }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.sealType) newErrors.sealType = '请选择印章类型';
    if (!formData.reason.trim()) newErrors.reason = '请填写用印事由';
    if (!formData.documentName.trim()) newErrors.documentName = '请填写文件名称';
    if (!formData.quantity || formData.quantity < 1) newErrors.quantity = '用印数量必须大于0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createApplication = (status: 'draft' | 'pending_dept'): SealApplication | undefined => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const appId = generateId();
    const currentNode: ApprovalNode = status === 'draft' ? 'submitter' : 'dept_head';
    const appStatus: ApplicationStatus = status;
    const approvalTrail =
      status === 'pending_dept'
        ? [
            {
              id: 'ar' + Date.now().toString(36),
              applicationId: appId,
              node: 'submitter' as const,
              approverId: currentUser.id,
              approverName: currentUser.name,
              action: 'submit' as const,
              opinion: '提交用印申请',
              timestamp: now,
            },
          ]
        : [];
    return {
      id: appId,
      applicantId: currentUser.id,
      applicantName: currentUser.name,
      department: currentUser.department,
      sealType: formData.sealType,
      reason: formData.reason,
      documentName: formData.documentName,
      quantity: formData.quantity,
      urgency: formData.urgency,
      remark: formData.remark,
      status: appStatus,
      currentNode,
      createdAt: now,
      updatedAt: now,
      approvalTrail,
    };
  };

  const handleSaveDraft = () => {
    if (isEdit && id) {
      updateApplication(id, {
        sealType: formData.sealType,
        reason: formData.reason,
        documentName: formData.documentName,
        quantity: formData.quantity,
        urgency: formData.urgency,
        remark: formData.remark,
        status: 'draft',
      });
    } else {
      const newApp = createApplication('draft');
      if (newApp) addApplication(newApp);
    }
    navigate('/applications');
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (isEdit && id) {
      const now = new Date().toISOString();
      const existingApp = getApplicationById(id);
      const newTrail = existingApp?.approvalTrail || [];
      if (currentUser) {
        newTrail.push({
          id: 'ar' + Date.now().toString(36),
          applicationId: id,
          node: 'submitter',
          approverId: currentUser.id,
          approverName: currentUser.name,
          action: 'submit',
          opinion: '提交用印申请',
          timestamp: now,
        });
      }
      updateApplication(id, {
        sealType: formData.sealType,
        reason: formData.reason,
        documentName: formData.documentName,
        quantity: formData.quantity,
        urgency: formData.urgency,
        remark: formData.remark,
        status: 'pending_dept',
        currentNode: 'dept_head',
        approvalTrail: newTrail,
      });
    } else {
      const newApp = createApplication('pending_dept');
      if (newApp) addApplication(newApp);
    }
    navigate('/applications');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? '编辑用印申请' : '新建用印申请'}
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-group">
            <label className="label">
              印章类型 <span className="text-red-500">*</span>
            </label>
            <select
              name="sealType"
              value={formData.sealType}
              onChange={handleChange}
              className={`input-field ${errors.sealType ? 'border-red-500' : ''}`}
            >
              <option value="">请选择印章类型</option>
              {sealTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.sealType && (
              <p className="mt-1 text-sm text-red-500">{errors.sealType}</p>
            )}
          </div>

          <div className="form-group">
            <label className="label">
              紧急程度 <span className="text-red-500">*</span>
            </label>
            <select
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
              className="input-field"
            >
              {urgencyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">
              文件名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="documentName"
              value={formData.documentName}
              onChange={handleChange}
              placeholder="请输入文件名称"
              className={`input-field ${errors.documentName ? 'border-red-500' : ''}`}
            />
            {errors.documentName && (
              <p className="mt-1 text-sm text-red-500">{errors.documentName}</p>
            )}
          </div>

          <div className="form-group">
            <label className="label">
              用印数量 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min={1}
              className={`input-field ${errors.quantity ? 'border-red-500' : ''}`}
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>
            )}
          </div>

          <div className="form-group md:col-span-2">
            <label className="label">
              用印事由 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="请详细说明用印事由"
              rows={3}
              className={`input-field resize-none ${errors.reason ? 'border-red-500' : ''}`}
            />
            {errors.reason && <p className="mt-1 text-sm text-red-500">{errors.reason}</p>}
          </div>

          <div className="form-group md:col-span-2">
            <label className="label">备注</label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              placeholder="其他需要说明的事项（选填）"
              rows={2}
              className="input-field resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            取消
          </button>
          <button onClick={handleSaveDraft} className="btn-secondary inline-flex items-center gap-2">
            <Save className="w-4 h-4" />
            保存草稿
          </button>
          <button onClick={handleSubmit} className="btn-primary inline-flex items-center gap-2">
            <Send className="w-4 h-4" />
            提交审批
          </button>
        </div>
      </div>
    </div>
  );
}
