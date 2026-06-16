import { Router, type Request, type Response } from 'express';
import dataStore from '../dataStore.js';
import type { SealApplication, ApplicationStatus, ApprovalRecord } from '../../shared/types.js';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  try {
    const { status, applicantId, department } = req.query as {
      status?: ApplicationStatus;
      applicantId?: string;
      department?: string;
    };

    let applications = dataStore.getAll('applications');

    if (status) {
      applications = applications.filter((app) => app.status === status);
    }
    if (applicantId) {
      applications = applications.filter((app) => app.applicantId === applicantId);
    }
    if (department) {
      applications = applications.filter((app) => app.department === department);
    }

    applications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取申请列表失败',
    });
  }
});

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const application = dataStore.getById('applications', id);

    if (!application) {
      res.status(404).json({
        success: false,
        error: '申请不存在',
      });
      return;
    }

    const approvalRecords = dataStore.find(
      'approvalRecords',
      (r) => r.applicationId === id,
    );

    res.json({
      success: true,
      data: {
        ...application,
        approvalTrail: approvalRecords,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取申请详情失败',
    });
  }
});

router.post('/', (req: Request, res: Response): void => {
  try {
    const {
      applicantId,
      applicantName,
      department,
      sealType,
      sealId,
      reason,
      documentName,
      quantity,
      urgency,
    } = req.body;

    if (!applicantId || !applicantName || !sealType || !reason || !documentName) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段',
      });
      return;
    }

    const now = new Date().toISOString();
    const newApplication = dataStore.create('applications', {
      applicantId,
      applicantName,
      department: department || '',
      sealType,
      sealId,
      reason,
      documentName,
      quantity: quantity || 1,
      urgency: urgency || 'normal',
      status: 'draft',
      currentNode: 'submitter',
      createdAt: now,
      updatedAt: now,
      approvalTrail: [],
    } as Omit<SealApplication, 'id'>);

    res.status(201).json({
      success: true,
      data: newApplication,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '创建申请失败',
    });
  }
});

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = dataStore.getById('applications', id);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: '申请不存在',
      });
      return;
    }

    const submitAction = updateData.submit === true;
    delete updateData.submit;

    let finalData: Partial<SealApplication> = {
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    if (submitAction && existing.status === 'draft') {
      finalData = {
        ...finalData,
        status: 'pending_dept',
        currentNode: 'dept_head',
      };

      const submitRecord = dataStore.create('approvalRecords', {
        applicationId: id,
        node: 'submitter',
        approverId: existing.applicantId,
        approverName: existing.applicantName,
        action: 'submit',
        opinion: '提交申请',
        timestamp: new Date().toISOString(),
      } as Omit<ApprovalRecord, 'id'>);

      const existingTrail = existing.approvalTrail || [];
      finalData.approvalTrail = [...existingTrail, submitRecord];
    }

    const updated = dataStore.update('applications', id, finalData);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '更新申请失败',
    });
  }
});

export default router;
