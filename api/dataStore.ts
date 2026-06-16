import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  User,
  SealApplication,
  Seal,
  SealRegistration,
  ApprovalRecord,
} from '../shared/types.js';
import {
  mockUsers,
  mockApplications,
  mockSeals,
  mockRegistrations,
  mockApprovalRecords,
} from '../shared/mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '.data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

interface Database {
  users: User[];
  applications: SealApplication[];
  seals: Seal[];
  registrations: SealRegistration[];
  approvalRecords: ApprovalRecord[];
}

const defaultDatabase: Database = {
  users: [...mockUsers],
  applications: [...mockApplications],
  seals: [...mockSeals],
  registrations: [...mockRegistrations],
  approvalRecords: [...mockApprovalRecords],
};

class DataStore {
  private db: Database;

  constructor() {
    this.db = this.load();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): Database {
    try {
      this.ensureDataDir();
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data) as Database;
      }
    } catch (error) {
      console.error('Failed to load data from file, using default mock data:', error);
    }
    return JSON.parse(JSON.stringify(defaultDatabase));
  }

  private save(): void {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save data to file:', error);
    }
  }

  reset(): void {
    this.db = JSON.parse(JSON.stringify(defaultDatabase));
    this.save();
  }

  generateId(prefix: string): string {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  getAll<T extends keyof Database>(entity: T): Database[T] {
    return [...this.db[entity]] as Database[T];
  }

  getById<T extends keyof Database>(
    entity: T,
    id: string,
  ): Database[T][number] | undefined {
    return this.db[entity].find((item) => (item as { id: string }).id === id) as
      | Database[T][number]
      | undefined;
  }

  find<T extends keyof Database>(
    entity: T,
    predicate: (item: Database[T][number]) => boolean,
  ): Database[T][number][] {
    return this.db[entity].filter(predicate) as Database[T][number][];
  }

  findOne<T extends keyof Database>(
    entity: T,
    predicate: (item: Database[T][number]) => boolean,
  ): Database[T][number] | undefined {
    return this.db[entity].find(predicate) as Database[T][number] | undefined;
  }

  create<T extends keyof Database>(
    entity: T,
    data: Omit<Database[T][number], 'id'>,
  ): Database[T][number] {
    const idFieldMap: Record<string, string> = {
      users: 'u',
      applications: 'app',
      seals: 's',
      registrations: 'reg',
      approvalRecords: 'ar',
    };
    const prefix = idFieldMap[entity] || 'item';
    const newItem = {
      ...(data as unknown as Record<string, unknown>),
      id: this.generateId(prefix),
    } as unknown as Database[T][number];
    (this.db[entity] as unknown as Database[T][number][]).push(newItem);
    this.save();
    return newItem;
  }

  update<T extends keyof Database>(
    entity: T,
    id: string,
    data: Partial<Database[T][number]>,
  ): Database[T][number] | undefined {
    const index = this.db[entity].findIndex(
      (item) => (item as { id: string }).id === id,
    );
    if (index === -1) return undefined;
    const updated = {
      ...(this.db[entity][index] as unknown as Record<string, unknown>),
      ...(data as unknown as Record<string, unknown>),
    } as unknown as Database[T][number];
    (this.db[entity] as unknown as Database[T][number][])[index] = updated;
    this.save();
    return updated;
  }

  delete<T extends keyof Database>(entity: T, id: string): boolean {
    const index = this.db[entity].findIndex(
      (item) => (item as { id: string }).id === id,
    );
    if (index === -1) return false;
    (this.db[entity] as Database[T][number][]).splice(index, 1);
    this.save();
    return true;
  }
}

const dataStore = new DataStore();

export default dataStore;
export { DataStore };
export type { Database };
