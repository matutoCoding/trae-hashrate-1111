import { Router, type Request, type Response } from 'express';
import dataStore from '../dataStore.js';
import type { Seal, SealStatus } from '../../shared/types.js';
import { isSealExpired, isSealLocked, isSealUsable } from '../../shared/utils.js';

const router = Router();

const WARNING_DAYS = 30;

router.get('/', (req: Request, res: Response): void => {
  try {
    const { status, sealType } = req.query as {
      status?: SealStatus;
      sealType?: string;
    };

    let seals = dataStore.getAll('seals');

    if (status) {
      seals = seals.filter((s) => s.status === status);
    }
    if (sealType) {
      seals = seals.filter((s) => s.sealType === sealType);
    }

    seals.sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());

    res.json({
      success: true,
      data: seals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取印章列表失败',
    });
  }
});

router.get('/available/:sealType', (req: Request, res: Response): void => {
  try {
    const { sealType } = req.params;
    const seals = dataStore.getAll('seals').filter(
      (s) => s.sealType === decodeURIComponent(sealType) && isSealUsable(s) && !isSealExpired(s),
    );
    seals.sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());
    res.json({
      success: true,
      data: seals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取可用印章失败',
    });
  }
});

router.get('/warnings', (req: Request, res: Response): void => {
  try {
    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + WARNING_DAYS);

    const seals = dataStore.getAll('seals').filter((seal) => {
      const expiryDate = new Date(seal.expiryDate);
      return (
        (expiryDate <= warningDate && expiryDate >= now) ||
        seal.status === 'warning' ||
        seal.status === 'expired'
      );
    });

    seals.sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
    );

    res.json({
      success: true,
      data: seals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取临期印章失败',
    });
  }
});

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const seal = dataStore.getById('seals', id);

    if (!seal) {
      res.status(404).json({
        success: false,
        error: '印章不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: seal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取印章详情失败',
    });
  }
});

router.post('/', (req: Request, res: Response): void => {
  try {
    const {
      batchNumber,
      sealType,
      serialNumber,
      receivedDate,
      expiryDate,
      custodian,
      enableDate,
      remark,
    } = req.body;

    if (!batchNumber || !sealType || !serialNumber || !receivedDate || !expiryDate || !custodian) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段',
      });
      return;
    }

    const now = new Date();
    const expiry = new Date(expiryDate);

    let status: SealStatus = 'stored';
    if (expiry < now) {
      status = 'expired';
    }

    const newSeal = dataStore.create('seals', {
      batchNumber,
      sealType,
      serialNumber,
      receivedDate,
      expiryDate,
      status,
      custodian,
      enableDate,
      remark,
    } as Omit<Seal, 'id'>);

    res.status(201).json({
      success: true,
      data: newSeal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '新增印章失败',
    });
  }
});

router.put('/:id/enable', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const existing = dataStore.getById('seals', id);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: '印章不存在',
      });
      return;
    }

    if (existing.status !== 'stored') {
      res.status(400).json({
        success: false,
        error: '只有入库状态的印章可以启用',
      });
      return;
    }

    if (isSealExpired(existing) || isSealLocked(existing)) {
      res.status(400).json({
        success: false,
        error: '印章已过期或锁定，无法启用',
      });
      return;
    }

    const sameTypeStored = dataStore
      .getAll('seals')
      .filter(
        (s) =>
          s.sealType === existing.sealType &&
          s.status === 'stored' &&
          !isSealExpired(s) &&
          !isSealLocked(s),
      )
      .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());

    if (sameTypeStored.length > 0 && sameTypeStored[0].id !== id) {
      res.status(400).json({
        success: false,
        error: `请先启用同类型更早入库的批次：${sameTypeStored[0].batchNumber}（${sameTypeStored[0].serialNumber}）`,
      });
      return;
    }

    const now = new Date().toISOString();
    const expiry = new Date(existing.expiryDate);
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + WARNING_DAYS);

    let newStatus: SealStatus = 'in_use';
    if (expiry <= warningDate) {
      newStatus = 'warning';
    }

    const updated = dataStore.update('seals', id, {
      status: newStatus,
      enableDate: now,
      updatedAt: now,
    } as Partial<Seal>);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '启用印章失败',
    });
  }
});

router.put('/:id/status', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: SealStatus };

    if (!status) {
      res.status(400).json({
        success: false,
        error: '缺少状态参数',
      });
      return;
    }

    const existing = dataStore.getById('seals', id);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: '印章不存在',
      });
      return;
    }

    const updated = dataStore.update('seals', id, { status });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '更新印章状态失败',
    });
  }
});

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = dataStore.getById('seals', id);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: '印章不存在',
      });
      return;
    }

    const updated = dataStore.update('seals', id, updateData);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '更新印章失败',
    });
  }
});

export default router;
