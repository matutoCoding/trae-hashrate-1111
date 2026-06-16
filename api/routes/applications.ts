import { Router, type Request, type Response } from 'express';
import dataStore from '../dataStore.js';
import type { SealApplication, ApplicationStatus, ApprovalRecord, ApprovalNode } from '../../shared/types.js';
import { canSubmitApplication } from '../../shared/utils.js';

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
      submit,
    } = req.body;

    if (!applicantId || !applicantName || !sealType || !reason || !documentName) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段',
      });
      return;
    }

    const now = new Date().toISOString();
    const submitAction = submit === true;

    let initialStatus: ApplicationStatus = submitAction ? 'pending_dept' : 'draft';
    const initialNode: ApprovalNode = submitAction ? 'dept_head' : 'submitter';
    const approvalTrail: ApprovalRecord[] = [];

    if (submitAction) {
      const submitRecord = dataStore.create('approvalRecords', {
        applicationId: '',
        node: 'submitter',
        approverId: applicantId,
        approverName: applicantName,
        action: 'submit',
        opinion: '提交申请',
        timestamp: now,
      } as Omit<ApprovalRecord, 'id'>) as ApprovalRecord;
      approvalTrail.push(submitRecord);
    }

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
      status: initialStatus,
      currentNode: initialNode,
      createdAt: now,
      updatedAt: now,
      approvalTrail,
    } as Omit<SealApplication, 'id'>);

    if (submitAction && approvalTrail.length > 0) {
      approvalTrail[0].applicationId = newApplication.id;
      dataStore.update('approvalRecords', approvalTrail[0].id, { applicationId: newApplication.id });
      const updatedApp = dataStore.getById('applications', newApplication.id);
      if (updatedApp) {
        (updatedApp as SealApplication).approvalTrail = approvalTrail;
      }
    }

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

    const now = new Date().toISOString();
    let finalData: Partial<SealApplication> = {
      ...(existing as SealApplication),
      ...updateData,
      updatedAt: now,
    } as SealApplication;

    if (submitAction && canSubmitApplication(existing.status, existing.currentNode)) {
      finalData.status = 'pending_dept';
      finalData.currentNode = 'dept_head';

      const submitRecord = dataStore.create('approvalRecords', {
        applicationId: id,
        node: 'submitter',
        approverId: existing.applicantId,
        approverName: existing.applicantName,
        action: 'submit',
        opinion: '提交申请',
        timestamp: now,
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
