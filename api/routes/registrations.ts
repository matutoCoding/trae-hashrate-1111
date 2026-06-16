import { Router, type Request, type Response } from 'express';
import dataStore from '../dataStore.js';
import type { SealRegistration } from '../../shared/types.js';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  try {
    const { applicationId, sealId, registrarId } = req.query as {
      applicationId?: string;
      sealId?: string;
      registrarId?: string;
    };

    let registrations = dataStore.getAll('registrations');

    if (applicationId) {
      registrations = registrations.filter((r) => r.applicationId === applicationId);
    }
    if (sealId) {
      registrations = registrations.filter((r) => r.sealId === sealId);
    }
    if (registrarId) {
      registrations = registrations.filter((r) => r.registrarId === registrarId);
    }

    registrations.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    res.json({
      success: true,
      data: registrations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取登记列表失败',
    });
  }
});

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const registration = dataStore.getById('registrations', id);

    if (!registration) {
      res.status(404).json({
        success: false,
        error: '登记记录不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: registration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取登记详情失败',
    });
  }
});

router.post('/', (req: Request, res: Response): void => {
  try {
    const {
      applicationId,
      sealId,
      registrarId,
      registrarName,
      registrant,
      registrantDepartment,
      usageTime,
      photoEvidence,
      remark,
    } = req.body;

    if (
      !applicationId ||
      !sealId ||
      !registrarId ||
      !registrarName ||
      !registrant ||
      !registrantDepartment ||
      !usageTime
    ) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段',
      });
      return;
    }

    const application = dataStore.getById('applications', applicationId);
    if (!application) {
      res.status(404).json({
        success: false,
        error: '关联的用印申请不存在',
      });
      return;
    }

    const seal = dataStore.getById('seals', sealId);
    if (!seal) {
      res.status(404).json({
        success: false,
        error: '关联的印章不存在',
      });
      return;
    }

    const now = new Date().toISOString();

    const newRegistration = dataStore.create('registrations', {
      applicationId,
      sealId,
      registrarId,
      registrarName,
      registrant,
      registrantDepartment,
      usageTime,
      photoEvidence,
      remark,
      createdAt: now,
    } as Omit<SealRegistration, 'id'>);

    dataStore.update('applications', applicationId, {
      status: 'registered',
      updatedAt: now,
    });

    res.status(201).json({
      success: true,
      data: newRegistration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '创建用印登记失败',
    });
  }
});

export default router;
