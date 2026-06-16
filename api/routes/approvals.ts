import { Router, type Request, type Response } from 'express';
import dataStore from '../dataStore.js';
import type { ApprovalRecord, ApplicationStatus, ApprovalNode, SealApplication } from '../../shared/types.js';
import { getPreviousNode, canApproveNode } from '../../shared/utils.js';

const router = Router();

router.get('/pending', (req: Request, res: Response): void => {
  try {
    const { approverId, node } = req.query as {
      approverId?: string;
      node?: ApprovalNode;
    };

    let applications = dataStore
      .getAll('applications')
      .filter(
        (app) =>
          app.status === 'pending_dept' || app.status === 'pending_leader',
      );

    if (node) {
      applications = applications.filter((app) => app.currentNode === node);
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
      error: '获取待审批列表失败',
    });
  }
});

router.post('/:id/approve', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { approverId, approverName, opinion, node } = req.body as {
      approverId?: string;
      approverName?: string;
      opinion?: string;
      node?: ApprovalNode;
    };

    if (!approverId || !approverName || !node) {
      res.status(400).json({
        success: false,
        error: '缺少审批人信息或审批节点',
      });
      return;
    }

    const application = dataStore.getById('applications', id) as SealApplication | undefined;
    if (!application) {
      res.status(404).json({
        success: false,
        error: '申请不存在',
      });
      return;
    }

    if (!canApproveNode(application.status, application.currentNode, node)) {
      res.status(400).json({
        success: false,
        error: `当前申请状态为"${application.status}"，节点为"${application.currentNode}"，无法以"${node}"身份审批`,
      });
      return;
    }

    const now = new Date().toISOString();

    const approvalRecord = dataStore.create('approvalRecords', {
      applicationId: id,
      node,
      approverId,
      approverName,
      action: 'approve',
      opinion: opinion || '同意',
      timestamp: now,
    } as Omit<ApprovalRecord, 'id'>);

    let newStatus: ApplicationStatus = application.status;
    let newNode: ApprovalNode = application.currentNode;

    if (node === 'dept_head') {
      newStatus = 'pending_leader';
      newNode = 'leader';
    } else if (node === 'leader') {
      newStatus = 'approved';
      newNode = 'leader';
    }

    const existingTrail = application.approvalTrail || [];
    const updated = dataStore.update('applications', id, {
      status: newStatus,
      currentNode: newNode,
      updatedAt: now,
      approvalTrail: [...existingTrail, approvalRecord],
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '审批通过失败',
    });
  }
});

router.post('/:id/reject', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { approverId, approverName, opinion, node } = req.body as {
      approverId?: string;
      approverName?: string;
      opinion?: string;
      node?: ApprovalNode;
    };

    if (!approverId || !approverName || !node) {
      res.status(400).json({
        success: false,
        error: '缺少审批人信息或审批节点',
      });
      return;
    }

    const application = dataStore.getById('applications', id) as SealApplication | undefined;
    if (!application) {
      res.status(404).json({
        success: false,
        error: '申请不存在',
      });
      return;
    }

    if (!canApproveNode(application.status, application.currentNode, node)) {
      res.status(400).json({
        success: false,
        error: `当前申请状态为"${application.status}"，节点为"${application.currentNode}"，无法以"${node}"身份驳回`,
      });
      return;
    }

    const now = new Date().toISOString();

    const approvalRecord = dataStore.create('approvalRecords', {
      applicationId: id,
      node,
      approverId,
      approverName,
      action: 'reject',
      opinion: opinion || '驳回',
      timestamp: now,
    } as Omit<ApprovalRecord, 'id'>);

    const previousNode = getPreviousNode(node as ApprovalNode);

    let newStatus: ApplicationStatus;
    if (node === 'leader') {
      newStatus = 'pending_dept';
    } else if (node === 'dept_head') {
      newStatus = 'rejected';
    } else {
      newStatus = 'rejected';
    }

    const existingTrail = application.approvalTrail || [];
    const updated = dataStore.update('applications', id, {
      status: newStatus,
      currentNode: previousNode,
      updatedAt: now,
      approvalTrail: [...existingTrail, approvalRecord],
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '审批驳回失败',
    });
  }
});

export default router;
