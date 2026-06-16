import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useAppStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import type { Seal } from '../../shared/types';

const sealTypeOptions = ['公章', '合同专用章', '财务专用章', '法人章', '发票专用章'];

interface FormData {
  batchNumber: string;
  sealType: string;
  serialNumber: string;
  receivedDate: string;
  expiryDate: string;
  custodian: string;
  remark: string;
}

const initialFormData: FormData = {
  batchNumber: '',
  sealType: '',
  serialNumber: '',
  receivedDate: new Date().toISOString().split('T')[0],
  expiryDate: '',
  custodian: '',
  remark: '',
};

function generateId() {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function SealForm() {
  const navigate = useNavigate();
  const addSeal = useAppStore((state) => state.addSeal);
  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.currentUser);

  const [formData, setFormData] = useState<FormData>({
    ...initialFormData,
    custodian: currentUser?.name || '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.batchNumber.trim()) newErrors.batchNumber = '请输入批次编号';
    if (!formData.sealType) newErrors.sealType = '请选择印章类型';
    if (!formData.serialNumber.trim()) newErrors.serialNumber = '请输入序列号';
    if (!formData.receivedDate) newErrors.receivedDate = '请选择入库日期';
    if (!formData.expiryDate) newErrors.expiryDate = '请选择有效期至';
    if (formData.receivedDate && formData.expiryDate) {
      if (new Date(formData.expiryDate) <= new Date(formData.receivedDate)) {
        newErrors.expiryDate = '有效期必须晚于入库日期';
      }
    }
    if (!formData.custodian.trim()) newErrors.custodian = '请输入保管人';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const now = new Date().toISOString();
    const newSeal: Seal = {
      id: generateId(),
      batchNumber: formData.batchNumber,
      sealType: formData.sealType,
      serialNumber: formData.serialNumber,
      receivedDate: new Date(formData.receivedDate).toISOString(),
      expiryDate: new Date(formData.expiryDate).toISOString(),
      status: 'stored',
      custodian: formData.custodian,
      remark: formData.remark || undefined,
    };

    addSeal(newSeal);
    navigate('/seals');
  };

  const sealAdmins = users.filter((u) => u.role === 'seal_admin' || u.role === 'admin');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">印章入库</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-group">
            <label className="label">
              批次编号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="batchNumber"
              value={formData.batchNumber}
              onChange={handleChange}
              placeholder="如：BATCH-2026-001"
              className={`input-field ${errors.batchNumber ? 'border-red-500' : ''}`}
            />
            {errors.batchNumber && (
              <p className="mt-1 text-sm text-red-500">{errors.batchNumber}</p>
            )}
          </div>

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
            {errors.sealType && <p className="mt-1 text-sm text-red-500">{errors.sealType}</p>}
          </div>

          <div className="form-group">
            <label className="label">
              序列号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              placeholder="如：GZ-2026-0001"
              className={`input-field ${errors.serialNumber ? 'border-red-500' : ''}`}
            />
            {errors.serialNumber && (
              <p className="mt-1 text-sm text-red-500">{errors.serialNumber}</p>
            )}
          </div>

          <div className="form-group">
            <label className="label">
              保管人 <span className="text-red-500">*</span>
            </label>
            <select
              name="custodian"
              value={formData.custodian}
              onChange={handleChange}
              className={`input-field ${errors.custodian ? 'border-red-500' : ''}`}
            >
              <option value="">请选择保管人</option>
              {sealAdmins.map((user) => (
                <option key={user.id} value={user.name}>
                  {user.name}（{user.department}）
                </option>
              ))}
            </select>
            {errors.custodian && <p className="mt-1 text-sm text-red-500">{errors.custodian}</p>}
          </div>

          <div className="form-group">
            <label className="label">
              入库日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="receivedDate"
              value={formData.receivedDate}
              onChange={handleChange}
              className={`input-field ${errors.receivedDate ? 'border-red-500' : ''}`}
            />
            {errors.receivedDate && (
              <p className="mt-1 text-sm text-red-500">{errors.receivedDate}</p>
            )}
          </div>

          <div className="form-group">
            <label className="label">
              有效期至 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              className={`input-field ${errors.expiryDate ? 'border-red-500' : ''}`}
            />
            {errors.expiryDate && <p className="mt-1 text-sm text-red-500">{errors.expiryDate}</p>}
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
            保存入库
          </button>
        </div>
      </div>
    </div>
  );
}
