import { useState, useMemo, useRef } from 'react';
import { ArrowLeft, Save, Upload, X, Image, FileText, User, Building } from 'lucide-react';
import { useAppStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import type { SealRegistration, SealApplication, Seal } from '../../shared/types';

interface FormData {
  applicationId: string;
  sealId: string;
  registrant: string;
  registrantDepartment: string;
  usageTime: string;
  photoEvidence: string;
  remark: string;
}

function generateId() {
  return 'reg' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatDateTimeLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function RegistrationForm() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const currentUser = useAppStore((state) => state.currentUser);
  const approvedApps = useAppStore((state) => state.getApprovedApplicationsWithoutRegistration());
  const addRegistration = useAppStore((state) => state.addRegistration);
  const updateApplication = useAppStore((state) => state.updateApplication);
  const seals = useAppStore((state) => state.seals);

  const now = new Date();
  const initialFormData: FormData = {
    applicationId: '',
    sealId: '',
    registrant: '',
    registrantDepartment: '',
    usageTime: formatDateTimeLocal(now),
    photoEvidence: '',
    remark: '',
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const selectedApplication: SealApplication | undefined = useMemo(() => {
    if (!formData.applicationId) return undefined;
    return approvedApps.find((app) => app.id === formData.applicationId);
  }, [formData.applicationId, approvedApps]);

  const availableSeals: Seal[] = useMemo(() => {
    if (!selectedApplication) return [];
    return seals.filter(
      (seal) =>
        seal.sealType === selectedApplication.sealType &&
        (seal.status === 'in_use' || seal.status === 'warning')
    );
  }, [selectedApplication, seals]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleApplicationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const appId = e.target.value;
    const app = approvedApps.find((a) => a.id === appId);
    if (app) {
      setFormData((prev) => ({
        ...prev,
        applicationId: appId,
        registrant: app.applicantName,
        registrantDepartment: app.department,
        sealId: '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        applicationId: appId,
        registrant: '',
        registrantDepartment: '',
        sealId: '',
      }));
    }
    setErrors((prev) => ({
      ...prev,
      applicationId: undefined,
      sealId: undefined,
    }));
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFormData((prev) => ({ ...prev, photoEvidence: result }));
      setErrors((prev) => ({ ...prev, photoEvidence: undefined }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, photoEvidence: '' }));
  };

  const validate = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.applicationId) newErrors.applicationId = '请选择关联申请';
    if (!formData.sealId) newErrors.sealId = '请选择具体印章';
    if (!formData.registrant.trim()) newErrors.registrant = '请输入用印人';
    if (!formData.registrantDepartment.trim()) newErrors.registrantDepartment = '请输入部门';
    if (!formData.usageTime) newErrors.usageTime = '请选择用印时间';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || !currentUser) return;

    const now = new Date().toISOString();
    const newRegistration: SealRegistration = {
      id: generateId(),
      applicationId: formData.applicationId,
      sealId: formData.sealId,
      registrarId: currentUser.id,
      registrarName: currentUser.name,
      registrant: formData.registrant,
      registrantDepartment: formData.registrantDepartment,
      usageTime: new Date(formData.usageTime).toISOString(),
      photoEvidence: formData.photoEvidence || undefined,
      remark: formData.remark || undefined,
      createdAt: now,
    };

    addRegistration(newRegistration);
    updateApplication(formData.applicationId, {
      status: 'registered',
      sealId: formData.sealId,
    });

    navigate('/registrations');
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
        <h1 className="text-2xl font-bold text-gray-900">用印登记</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-group md:col-span-2">
            <label className="label">
              关联申请 <span className="text-red-500">*</span>
            </label>
            <select
              name="applicationId"
              value={formData.applicationId}
              onChange={handleApplicationChange}
              className={`input-field ${errors.applicationId ? 'border-red-500' : ''}`}
            >
              <option value="">请选择已通过审批的申请</option>
              {approvedApps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.id} - {app.reason}（{app.sealType}）
                </option>
              ))}
            </select>
            {errors.applicationId && (
              <p className="mt-1 text-sm text-red-500">{errors.applicationId}</p>
            )}
          </div>

          {selectedApplication && (
            <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-700">申请事由</div>
                  <div className="text-sm text-gray-600">{selectedApplication.reason}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-700">申请人 / 部门</div>
                  <div className="text-sm text-gray-600">
                    {selectedApplication.applicantName} / {selectedApplication.department}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-700">印章类型 / 文件名称</div>
                  <div className="text-sm text-gray-600">
                    {selectedApplication.sealType} / {selectedApplication.documentName}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="form-group md:col-span-2">
            <label className="label">
              选择印章 <span className="text-red-500">*</span>
            </label>
            <select
              name="sealId"
              value={formData.sealId}
              onChange={handleChange}
              disabled={!selectedApplication}
              className={`input-field ${errors.sealId ? 'border-red-500' : ''} ${
                !selectedApplication ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">
                {selectedApplication ? '请选择可用印章' : '请先选择关联申请'}
              </option>
              {availableSeals.map((seal) => (
                <option key={seal.id} value={seal.id}>
                  {seal.serialNumber}（批次：{seal.batchNumber}，保管人：{seal.custodian}）
                </option>
              ))}
              {selectedApplication && availableSeals.length === 0 && (
                <option value="" disabled>
                  暂无可用的{selectedApplication.sealType}
                </option>
              )}
            </select>
            {errors.sealId && <p className="mt-1 text-sm text-red-500">{errors.sealId}</p>}
          </div>

          <div className="form-group">
            <label className="label">
              用印人 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="registrant"
              value={formData.registrant}
              onChange={handleChange}
              placeholder="请输入用印人姓名"
              className={`input-field ${errors.registrant ? 'border-red-500' : ''}`}
            />
            {errors.registrant && (
              <p className="mt-1 text-sm text-red-500">{errors.registrant}</p>
            )}
          </div>

          <div className="form-group">
            <label className="label">
              部门 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="registrantDepartment"
              value={formData.registrantDepartment}
              onChange={handleChange}
              placeholder="请输入部门"
              className={`input-field ${errors.registrantDepartment ? 'border-red-500' : ''}`}
            />
            {errors.registrantDepartment && (
              <p className="mt-1 text-sm text-red-500">{errors.registrantDepartment}</p>
            )}
          </div>

          <div className="form-group md:col-span-2">
            <label className="label">
              用印时间 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              name="usageTime"
              value={formData.usageTime}
              onChange={handleChange}
              className={`input-field max-w-sm ${errors.usageTime ? 'border-red-500' : ''}`}
            />
            {errors.usageTime && <p className="mt-1 text-sm text-red-500">{errors.usageTime}</p>}
          </div>

          <div className="form-group md:col-span-2">
            <label className="label">拍照存证</label>
            {formData.photoEvidence ? (
              <div className="relative inline-block">
                <img
                  src={formData.photoEvidence}
                  alt="存证照片"
                  className="max-w-xs max-h-64 rounded-lg border border-gray-200 object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Image className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="text-primary-600 font-medium">点击上传</span> 或拖拽图片到此处
                  </div>
                  <div className="text-xs text-gray-400">支持 JPG、PNG、GIF 格式，大小不超过 10MB</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          <div className="form-group md:col-span-2">
            <label className="label">备注</label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              placeholder="其他需要说明的事项（选填）"
              rows={3}
              className="input-field resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            取消
          </button>
          <button onClick={handleSubmit} className="btn-primary inline-flex items-center gap-2">
            <Save className="w-4 h-4" />
            提交登记
          </button>
        </div>
      </div>
    </div>
  );
}
