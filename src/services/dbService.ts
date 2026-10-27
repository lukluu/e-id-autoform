/**
 * Layanan Database Utama Terintegrasi Neon Serverless PostgreSQL Cloud (Prisma ORM)
 * dengan cache lokal (IndexedDB/LocalStorage) untuk mode offline.
 *
 * Prinsip:
 * - Semua request API menyertakan Bearer token (HMAC) dari server.
 * - Operasi tulis TIDAK lagi menghasilkan "sukses palsu": kegagalan server
 *   dilempar sebagai error agar UI bisa memberi tahu pengguna.
 * - Data KTP selalu di-scope ke pemiliknya oleh server.
 */

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  password?: string;
  passwordHash?: string;
  phone?: string | null;
  address?: string | null;
  role?: string;
  avatar?: string | null;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EncryptedKtpRecord {
  id: string;
  userId?: string | undefined;
  provinsi: string;
  kabupatenKota: string;
  nik: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  golonganDarah: string;
  alamat: string;
  rt: string;
  rw: string;
  kelurahanDesa: string;
  kecamatan: string;
  agama: string;
  statusPerkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
  berlakuHingga: string;
  iv: string;
  keyChecksum: string;
  keyHint?: string | undefined;
  displayNama?: string | undefined;
  createdAt: string;
}

export interface RecoveryCodeRecord {
  id: string;
  type: "PASSWORD_RESET" | "KEY_RECOVERY";
  email: string;
  code: string;
  payload?: Record<string, unknown> | undefined;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface DatabaseStatus {
  driver: "neon_postgres" | "neon" | "mysql" | "indexeddb";
  connected: boolean;
  database: string;
  host: string;
  error?: string;
}

export interface AuthResult {
  token: string;
  expiresAt: string;
  user: UserRecord;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string | undefined;

  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const DB_NAME = "eIdBlowfishDB";
const DB_VERSION = 1;
const LOCAL_STORAGE_KTP_KEY = "eid_encrypted_ktp_backup";
const LOCAL_STORAGE_USERS_KEY = "eid_users_backup";
const LOCAL_STORAGE_SETTINGS_KEY = "eid_app_settings_backup";
const AUTH_TOKEN_KEY = "eid_auth_token";

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

class DatabaseService {
  private idb: IDBDatabase | null = null;
  private isRemoteDbActive = true;
  private dbStatus: DatabaseStatus = {
    driver: "neon_postgres",
    connected: false,
    database: "neondb",
    host: "neon.tech",
  };
  private statusListeners: Set<(s: DatabaseStatus) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      void this.checkDatabaseConnection();
    }
  }

  public subscribeStatus(listener: (s: DatabaseStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.dbStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatus(): void {
    const copy = { ...this.dbStatus };
    this.statusListeners.forEach((l) => l(copy));
  }

  // ----------------------------------------------------------------
  // AUTH TOKEN & API TRANSPORT
  // ----------------------------------------------------------------

  public getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  public setAuthToken(token: string | null): void {
    if (typeof window === "undefined") return;
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  private async apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const token = this.getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let response: Response;
    try {
      response = await fetch(path, { ...init, headers });
    } catch {
      throw new ApiError(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
        0,
        "NETWORK_ERROR",
      );
    }

    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        this.setAuthToken(null);
      }
      const payload = data as ApiErrorPayload | null;
      throw new ApiError(
        payload?.error?.message || `Permintaan gagal (HTTP ${response.status}).`,
        response.status,
        payload?.error?.code,
      );
    }

    return data as T;
  }

  // ----------------------------------------------------------------
  // CONNECTION STATUS
  // ----------------------------------------------------------------

  public async checkDatabaseConnection(): Promise<DatabaseStatus> {
    if (typeof window === "undefined") return this.dbStatus;

    try {
      const res = await fetch("/api/db/status", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (res.ok) {
        const data = (await res.json()) as {
          connected?: boolean;
          database?: string;
          host?: string;
          error?: string;
        };
        this.isRemoteDbActive = data.connected === true;
        this.dbStatus = {
          driver: "neon_postgres",
          connected: data.connected === true,
          database: data.database || "neondb",
          host: data.host || "neon.tech",
          ...(data.error ? { error: data.error } : {}),
        };
      } else {
        this.isRemoteDbActive = false;
        this.dbStatus = {
          driver: "indexeddb",
          connected: false,
          database: "eIdBlowfishDB (Offline Fallback)",
          host: "localhost (Browser IDB)",
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }
    } catch (err) {
      this.isRemoteDbActive = false;
      this.dbStatus = {
        driver: "indexeddb",
        connected: false,
        database: "eIdBlowfishDB (Offline Fallback)",
        host: "localhost (Browser IDB)",
        error: (err as Error).message,
      };
    }

    this.notifyStatus();
    return this.dbStatus;
  }

  public getStatus(): DatabaseStatus {
    return this.dbStatus;
  }

  public isRemoteActive(): boolean {
    return this.isRemoteDbActive;
  }

  // ----------------------------------------------------------------
  // AUTH OPERATIONS (SERVER-SIDE)
  // ----------------------------------------------------------------

  public async login(identifier: string, password: string): Promise<AuthResult> {
    const data = await this.apiFetch<AuthResult>("/api/db/auth-login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    this.setAuthToken(data.token);
    this.saveUserLocalStorage(data.user);
    return data;
  }

  public async register(payload: {
    name: string;
    email: string;
    password: string;
    username?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
  }): Promise<AuthResult> {
    const data = await this.apiFetch<AuthResult>("/api/db/auth-register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    this.setAuthToken(data.token);
    this.saveUserLocalStorage(data.user);
    return data;
  }

  public async requestPasswordReset(
    email: string,
  ): Promise<{ success: boolean; message?: string; emailSent?: boolean }> {
    return this.apiFetch("/api/db/auth-forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  public async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await this.apiFetch("/api/db/auth-reset-password", {
      method: "POST",
      body: JSON.stringify({ email, code, newPassword }),
    });
  }

  public async getCurrentUserFromServer(): Promise<UserRecord | null> {
    if (!this.getAuthToken()) return null;
    try {
      const data = await this.apiFetch<{ user: UserRecord }>("/api/db/auth-me", {
        method: "GET",
      });
      this.saveUserLocalStorage(data.user);
      return data.user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return null;
      }
      throw err;
    }
  }

  public async updateUserProfile(
    userData: {
      name?: string | undefined;
      username?: string | null | undefined;
      phone?: string | null | undefined;
      address?: string | null | undefined;
      avatar?: string | null | undefined;
    },
  ): Promise<UserRecord | null> {
    const data = await this.apiFetch<{ user: UserRecord }>("/api/db/user-update-profile", {
      method: "POST",
      body: JSON.stringify({ user: userData }),
    });
    this.saveUserLocalStorage(data.user);
    return data.user;
  }

  public async updateUserPassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.apiFetch("/api/db/user-update-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // ----------------------------------------------------------------
  // INDEXED DB INITIALIZATION
  // ----------------------------------------------------------------

  private async initIndexedDb(): Promise<IDBDatabase> {
    if (this.idb) return this.idb;
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return {} as IDBDatabase;
    }

    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains("encrypted_ktp")) {
          const ktpStore = db.createObjectStore("encrypted_ktp", { keyPath: "id" });
          ktpStore.createIndex("userId", "userId", { unique: false });
          ktpStore.createIndex("createdAt", "createdAt", { unique: false });
        }

        if (!db.objectStoreNames.contains("users")) {
          const userStore = db.createObjectStore("users", { keyPath: "id" });
          userStore.createIndex("email", "email", { unique: true });
          userStore.createIndex("username", "username", { unique: false });
        }

        if (!db.objectStoreNames.contains("recovery_codes")) {
          const codeStore = db.createObjectStore("recovery_codes", { keyPath: "id" });
          codeStore.createIndex("email", "email", { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.idb = (event.target as IDBOpenDBRequest).result;
        resolve(this.idb);
      };

      request.onerror = () => resolve({} as IDBDatabase);
    });
  }

  // ----------------------------------------------------------------
  // ENCRYPTED KTP OPERATIONS (SERVER-FIRST, OWNER-SCOPED)
  // ----------------------------------------------------------------

  public async saveEncryptedKtp(record: EncryptedKtpRecord): Promise<void> {
    if (this.isRemoteDbActive) {
      await this.apiFetch("/api/db/ktp-save", {
        method: "POST",
        body: JSON.stringify({ record }),
      });
    }
    await this.saveEncryptedKtpLocal(record);
  }

  public async getAllEncryptedKtp(): Promise<EncryptedKtpRecord[]> {
    if (this.isRemoteDbActive) {
      const data = await this.apiFetch<{ records?: EncryptedKtpRecord[] }>("/api/db/ktp-list", {
        method: "GET",
      });
      const records = Array.isArray(data.records) ? data.records : [];
      localStorage.setItem(LOCAL_STORAGE_KTP_KEY, JSON.stringify(records));
      return records;
    }

    return this.getEncryptedKtpLocalStorage();
  }

  public async deleteEncryptedKtp(id: string): Promise<boolean> {
    if (this.isRemoteDbActive) {
      await this.apiFetch("/api/db/ktp-delete", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
    }

    this.deleteEncryptedKtpLocalStorage(id);
    return true;
  }

  public async deleteAllMyEncryptedKtp(): Promise<number> {
    let deleted = 0;

    if (this.isRemoteDbActive) {
      const data = await this.apiFetch<{ deleted?: number }>("/api/db/ktp-delete-all", {
        method: "POST",
        body: JSON.stringify({}),
      });
      deleted = typeof data.deleted === "number" ? data.deleted : 0;
    } else {
      deleted = this.getEncryptedKtpLocalStorage().length;
    }

    await this.clearLocalKtpCache();
    return deleted;
  }

  private async saveEncryptedKtpLocal(record: EncryptedKtpRecord): Promise<void> {
    const all = this.getEncryptedKtpLocalStorage();
    const idx = all.findIndex((r) => r.id === record.id);
    if (idx >= 0) all[idx] = record;
    else all.unshift(record);
    localStorage.setItem(LOCAL_STORAGE_KTP_KEY, JSON.stringify(all));

    await this.initIndexedDb();
    if (this.idb && this.idb.objectStoreNames.contains("encrypted_ktp")) {
      try {
        const tx = this.idb.transaction("encrypted_ktp", "readwrite");
        tx.objectStore("encrypted_ktp").put(record);
      } catch {
        // ignore cache errors
      }
    }
  }

  private deleteEncryptedKtpLocalStorage(id: string): void {
    const list = this.getEncryptedKtpLocalStorage().filter((r) => r.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KTP_KEY, JSON.stringify(list));
  }

  /**
   * Hapus cache KTP lokal (localStorage + IndexedDB).
   * Dipanggil saat logout/login agar data user sebelumnya tidak tampil ke user lain.
   */
  public async clearLocalKtpCache(): Promise<void> {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KTP_KEY);
    } catch {
      // ignore
    }

    await this.initIndexedDb();
    if (this.idb && this.idb.objectStoreNames.contains("encrypted_ktp")) {
      try {
        const tx = this.idb.transaction("encrypted_ktp", "readwrite");
        tx.objectStore("encrypted_ktp").clear();
      } catch {
        // ignore
      }
    }
  }

  // ----------------------------------------------------------------
  // KEY RECOVERY (SERVER-SIDE OTP)
  // ----------------------------------------------------------------

  public async requestKeyRecovery(
    recordId: string,
  ): Promise<{ success: boolean; message?: string; emailSent?: boolean }> {
    return this.apiFetch("/api/db/key-recovery-request", {
      method: "POST",
      body: JSON.stringify({ recordId }),
    });
  }

  public async recoverKey(recordId: string, code: string): Promise<string> {
    const data = await this.apiFetch<{ keyHint?: string }>("/api/db/key-recovery", {
      method: "POST",
      body: JSON.stringify({ recordId, code }),
    });
    if (!data.keyHint) {
      throw new ApiError("Kunci rahasia tidak ditemukan untuk dokumen ini.", 404, "NOT_FOUND");
    }
    return data.keyHint;
  }

  // ----------------------------------------------------------------
  // EXPORT & IMPORT DATABASE BACKUP (KTP SENDIRI SAJA)
  // ----------------------------------------------------------------

  public async exportDatabaseToJson(): Promise<string> {
    const ktpRecords = await this.getAllEncryptedKtp();

    const exportData = {
      version: 2,
      driver: this.isRemoteDbActive ? "neon_postgres" : "indexeddb",
      exportDate: new Date().toISOString(),
      system: "Blowfish KTP Security System",
      counts: {
        encryptedKtp: ktpRecords.length,
      },
      data: {
        encryptedKtp: ktpRecords,
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  public async importDatabaseFromJson(
    jsonString: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonString) as {
        data?: { encryptedKtp?: unknown };
      };
      const records = parsed.data?.encryptedKtp;

      if (!Array.isArray(records)) {
        return {
          success: false,
          message: "Format file JSON backup tidak valid (data.encryptedKtp tidak ditemukan).",
        };
      }

      let imported = 0;
      let skipped = 0;

      for (const item of records) {
        if (!item || typeof item !== "object") {
          skipped += 1;
          continue;
        }
        const raw = item as Partial<EncryptedKtpRecord>;
        if (
          typeof raw.id !== "string" ||
          typeof raw.iv !== "string" ||
          typeof raw.keyChecksum !== "string"
        ) {
          skipped += 1;
          continue;
        }

        try {
          await this.saveEncryptedKtp({
            ...(raw as EncryptedKtpRecord),
            userId: undefined,
          });
          imported += 1;
        } catch {
          skipped += 1;
        }
      }

      return {
        success: imported > 0,
        message:
          imported > 0
            ? `Berhasil memulihkan ${imported} data KTP${skipped > 0 ? ` (${skipped} dilewati)` : ""}.`
            : "Tidak ada data KTP valid yang dapat dipulihkan dari file tersebut.",
      };
    } catch (err) {
      return { success: false, message: "Gagal memproses file JSON: " + (err as Error).message };
    }
  }

  // ----------------------------------------------------------------
  // LOCAL STORAGE HELPERS
  // ----------------------------------------------------------------

  private saveUserLocalStorage(user: UserRecord): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      const list = raw ? (JSON.parse(raw) as UserRecord[]) : [];
      const idx = list.findIndex((u) => u.id === user.id || u.email === user.email);
      if (idx >= 0) list[idx] = user;
      else list.push(user);
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  private getEncryptedKtpLocalStorage(): EncryptedKtpRecord[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KTP_KEY);
      return raw ? (JSON.parse(raw) as EncryptedKtpRecord[]) : [];
    } catch {
      return [];
    }
  }

  /**
   * Bersihkan seluruh cache lokal (KTP, user, settings) dan hapus token.
   * Data di server TIDAK dihapus oleh fungsi ini.
   */
  public async clearLocalCaches(): Promise<void> {
    this.setAuthToken(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KTP_KEY);
      localStorage.removeItem(LOCAL_STORAGE_USERS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_SETTINGS_KEY);
      sessionStorage.clear();
    } catch {
      // ignore
    }

    await this.initIndexedDb();
    if (this.idb) {
      try {
        const stores = ["encrypted_ktp", "users", "recovery_codes"];
        const available = stores.filter((store) => this.idb?.objectStoreNames.contains(store));
        if (available.length > 0) {
          const tx = this.idb.transaction(available, "readwrite");
          for (const store of available) {
            tx.objectStore(store).clear();
          }
        }
      } catch {
        // ignore
      }
    }
  }
}

export const dbService = new DatabaseService();
