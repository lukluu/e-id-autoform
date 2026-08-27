/**
 * Layanan Database Utama Terintegrasi Neon Serverless PostgreSQL Cloud (Prisma ORM)
 * dengan Sinkronisasi & Fallback Otomatis ke IndexedDB / LocalStorage
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

const DB_NAME = "eIdBlowfishDB";
const DB_VERSION = 1;
const LOCAL_STORAGE_KTP_KEY = "eid_encrypted_ktp_backup";
const LOCAL_STORAGE_USERS_KEY = "eid_users_backup";
const LOCAL_STORAGE_SETTINGS_KEY = "eid_app_settings_backup";

class DatabaseService {
  private idb: IDBDatabase | null = null;
  private isRemoteDbActive = true;
  private dbStatus: DatabaseStatus = {
    driver: "neon_postgres",
    connected: false,
    database: "neondb",
    host: "ep-withered-salad-az5r7iqs-pooler.c-3.ap-southeast-1.aws.neon.tech",
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

  /**
   * Cek konektivitas live ke server Neon PostgreSQL via API Backend
   */
  public async checkDatabaseConnection(): Promise<DatabaseStatus> {
    if (typeof window === "undefined") return this.dbStatus;

    try {
      const res = await fetch("/api/db/status", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (res.ok) {
        const data = await res.json();
        this.isRemoteDbActive = data.connected === true;
        this.dbStatus = {
          driver: "neon_postgres",
          connected: data.connected === true,
          database: data.database || "neondb",
          host: data.host || "ep-withered-salad-az5r7iqs-pooler.c-3.ap-southeast-1.aws.neon.tech",
          error: data.error,
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
  // USER OPERATIONS
  // ----------------------------------------------------------------

  public async getUserByEmail(email: string): Promise<UserRecord | null> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Coba Neon PostgreSQL
    if (this.isRemoteDbActive) {
      try {
        const res = await fetch("/api/db/user-get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            this.saveUserLocalStorage(data.user);
            return data.user;
          }
          // Jika server aktif dan user tidak ditemukan di database Neon,
          // hapus cache lokal agar tidak terjadi login hantu (ghost account)
          this.removeUserLocalStorage(cleanEmail);
          return null;
        }
      } catch {
        // Fallback jika network error
      }
    }

    // 2. Fallback Local Storage
    return this.getUserByEmailLocalStorage(cleanEmail);
  }

  public async getUserByUsername(username: string): Promise<UserRecord | null> {
    const cleanUsername = username.trim().toLowerCase();

    if (this.isRemoteDbActive) {
      try {
        const res = await fetch("/api/db/user-get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: cleanUsername }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            this.saveUserLocalStorage(data.user);
            return data.user;
          }
          return null;
        }
      } catch {
        // Fallback
      }
    }

    const list = this.getAllUsersLocalStorage();
    return list.find((u) => u.username?.toLowerCase() === cleanUsername) || null;
  }

  public async createUser(user: UserRecord): Promise<void> {
    user.email = user.email.trim().toLowerCase();
    if (user.username) {
      user.username = user.username.trim().toLowerCase();
    }

    // 1. Coba Neon PostgreSQL
    if (this.isRemoteDbActive) {
      try {
        await fetch("/api/db/user-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user }),
        });
      } catch {
        // Fallback
      }
    }

    // 2. Fallback Local Storage & IndexedDB
    this.saveUserLocalStorage(user);
    await this.initIndexedDb();
    if (this.idb && this.idb.objectStoreNames.contains("users")) {
      try {
        const tx = this.idb.transaction("users", "readwrite");
        tx.objectStore("users").put(user);
      } catch {
        // ignore
      }
    }
  }

  public async updateUserPassword(email: string, newPasswordHash: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Coba Neon PostgreSQL
    if (this.isRemoteDbActive) {
      try {
        const res = await fetch("/api/db/user-update-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, passwordHash: newPasswordHash }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const user = this.getUserByEmailLocalStorage(cleanEmail);
            if (user) {
              user.password = newPasswordHash;
              user.passwordHash = newPasswordHash;
              user.updatedAt = new Date().toISOString();
              this.saveUserLocalStorage(user);
            }
            return true;
          }
        }
      } catch {
        // Fallback
      }
    }

    // 2. Fallback Local Storage
    const user = this.getUserByEmailLocalStorage(cleanEmail);
    if (!user) return false;
    user.password = newPasswordHash;
    user.passwordHash = newPasswordHash;
    user.updatedAt = new Date().toISOString();
    this.saveUserLocalStorage(user);
    return true;
  }

  public async updateUserProfile(
    userData: Partial<UserRecord> & { email: string }
  ): Promise<UserRecord | null> {
    const cleanEmail = userData.email.trim().toLowerCase();

    // 1. Coba Neon PostgreSQL
    if (this.isRemoteDbActive) {
      try {
        const res = await fetch("/api/db/user-update-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: { ...userData, email: cleanEmail } }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            this.saveUserLocalStorage(data.user);
            return data.user;
          }
        }
      } catch {
        // Fallback
      }
    }

    // 2. Fallback Local Storage
    const user = this.getUserByEmailLocalStorage(cleanEmail);
    if (user) {
      if (userData.name) user.name = userData.name;
      if (userData.username !== undefined) user.username = userData.username;
      if (userData.phone !== undefined) user.phone = userData.phone;
      if (userData.address !== undefined) user.address = userData.address;
      if (userData.avatar !== undefined) user.avatar = userData.avatar;
      user.updatedAt = new Date().toISOString();
      this.saveUserLocalStorage(user);
      return user;
    }
    return null;
  }

  // ----------------------------------------------------------------
  // ENCRYPTED KTP OPERATIONS
  // ----------------------------------------------------------------

  public async saveEncryptedKtp(record: EncryptedKtpRecord): Promise<void> {
    // 1. Coba Neon PostgreSQL
    if (this.isRemoteDbActive) {
      try {
        await fetch("/api/db/ktp-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ record }),
        });
      } catch {
        // Fallback
      }
    }

    // 2. Fallback Local Storage & IndexedDB
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
        // ignore
      }
    }
  }

  public async getAllEncryptedKtp(): Promise<EncryptedKtpRecord[]> {
    if (this.isRemoteDbActive) {
      try {
        const res = await fetch("/api/db/ktp-list", {
          method: "GET",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.records)) {
            localStorage.setItem(LOCAL_STORAGE_KTP_KEY, JSON.stringify(data.records));
            return data.records;
          }
        }
      } catch {
        // Fallback
      }
    }

    return this.getEncryptedKtpLocalStorage();
  }

  public async deleteEncryptedKtp(id: string): Promise<boolean> {
    if (this.isRemoteDbActive) {
      try {
        const res = await fetch("/api/db/ktp-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            this.deleteEncryptedKtpLocalStorage(id);
            return true;
          }
        }
      } catch {
        // Fallback
      }
    }

    this.deleteEncryptedKtpLocalStorage(id);
    return true;
  }

  private deleteEncryptedKtpLocalStorage(id: string): void {
    const list = this.getEncryptedKtpLocalStorage().filter((r) => r.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KTP_KEY, JSON.stringify(list));
  }

  // ----------------------------------------------------------------
  // RECOVERY CODE OPERATIONS
  // ----------------------------------------------------------------

  public async saveRecoveryCode(record: RecoveryCodeRecord): Promise<void> {
    if (this.isRemoteDbActive) {
      try {
        await fetch("/api/db/recovery-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ record }),
        });
      } catch {
        // Fallback
      }
    }

    const all = this.getRecoveryCodesLocalStorage();
    all.push(record);
    localStorage.setItem("eid_recovery_codes_backup", JSON.stringify(all));
  }

  public async verifyRecoveryCode(
    email: string,
    code: string,
    type: "PASSWORD_RESET" | "KEY_RECOVERY"
  ): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();

    if (this.isRemoteDbActive) {
      try {
        const res = await fetch("/api/db/recovery-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, code, type }),
        });
        if (res.ok) {
          const data = await res.json();
          return Boolean(data.valid);
        }
      } catch {
        // Fallback
      }
    }

    const all = this.getRecoveryCodesLocalStorage();
    const now = new Date().getTime();
    const item = all.find(
      (r) =>
        r.email === cleanEmail &&
        r.code === code &&
        r.type === type &&
        !r.used &&
        new Date(r.expiresAt).getTime() > now
    );

    if (!item) return false;
    item.used = true;
    localStorage.setItem("eid_recovery_codes_backup", JSON.stringify(all));
    return true;
  }

  // ----------------------------------------------------------------
  // EXPORT & IMPORT DATABASE BACKUP
  // ----------------------------------------------------------------

  public async exportDatabaseToJson(): Promise<string> {
    const ktpRecords = await this.getAllEncryptedKtp();
    const users = this.getAllUsersLocalStorage();

    const exportData = {
      version: 1,
      driver: this.isRemoteDbActive ? "neon_postgres" : "indexeddb",
      exportDate: new Date().toISOString(),
      system: "Blowfish KTP Security System with Neon PostgreSQL",
      counts: {
        users: users.length,
        encryptedKtp: ktpRecords.length,
      },
      data: {
        users,
        encryptedKtp: ktpRecords,
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  public async importDatabaseFromJson(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) {
        return { success: false, message: "Format file JSON backup tidak valid." };
      }

      if (Array.isArray(parsed.data.users)) {
        for (const u of parsed.data.users) {
          await this.createUser(u);
        }
      }

      if (Array.isArray(parsed.data.encryptedKtp)) {
        for (const k of parsed.data.encryptedKtp) {
          await this.saveEncryptedKtp(k);
        }
      }

      return {
        success: true,
        message: `Berhasil memulihkan ${parsed.data.encryptedKtp?.length || 0} data KTP dan ${parsed.data.users?.length || 0} akun pengguna ke database.`,
      };
    } catch (err) {
      return { success: false, message: "Gagal memproses file JSON: " + (err as Error).message };
    }
  }

  // ----------------------------------------------------------------
  // LOCAL STORAGE HELPERS
  // ----------------------------------------------------------------

  private getAllUsersLocalStorage(): UserRecord[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private getUserByEmailLocalStorage(email: string): UserRecord | null {
    const list = this.getAllUsersLocalStorage();
    return list.find((u) => u.email === email) || null;
  }

  private saveUserLocalStorage(user: UserRecord): void {
    try {
      const list = this.getAllUsersLocalStorage();
      const idx = list.findIndex((u) => u.id === user.id || u.email === user.email);
      if (idx >= 0) list[idx] = user;
      else list.push(user);
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  private removeUserLocalStorage(email: string): void {
    if (typeof window === "undefined") return;
    try {
      const users = this.getAllUsersLocalStorage().filter((u) => u.email.toLowerCase() !== email.toLowerCase());
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
    } catch {
      // ignore
    }
  }

  private getEncryptedKtpLocalStorage(): EncryptedKtpRecord[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KTP_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private getRecoveryCodesLocalStorage(): RecoveryCodeRecord[] {
    try {
      const raw = localStorage.getItem("eid_recovery_codes_backup");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Reset dan bersihkan seluruh isi database Neon PostgreSQL, IndexedDB, dan LocalStorage
   */
  public async clearEntireDatabase(): Promise<void> {
    // 1. Reset Neon PostgreSQL via backend
    if (this.isRemoteDbActive) {
      try {
        await fetch("/api/db/reset-database", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.warn("Gagal reset Neon PostgreSQL:", err);
      }
    }

    // 2. Clear LocalStorage & Session
    try {
      localStorage.removeItem(LOCAL_STORAGE_KTP_KEY);
      localStorage.removeItem(LOCAL_STORAGE_USERS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_SETTINGS_KEY);
      localStorage.removeItem("eid_recovery_codes_backup");
      localStorage.removeItem("eid_auth_session");
      sessionStorage.clear();
    } catch {
      // ignore
    }

    // 3. Clear IndexedDB
    await this.initIndexedDb();
    if (this.idb) {
      try {
        const stores = ["encrypted_ktp", "users", "recovery_codes"];
        const tx = this.idb.transaction(stores, "readwrite");
        for (const store of stores) {
          if (this.idb.objectStoreNames.contains(store)) {
            tx.objectStore(store).clear();
          }
        }
      } catch {
        // ignore
      }
    }
  }
}

export function hashPasswordSimple(password: string): string {
  let hash = 0x811c9dc5;
  const str = `BLOWFISH_APP_SALT_${password}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash ^ str.charCodeAt(i)) >>> 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return "h_" + hash.toString(16).padStart(8, "0");
}

export const dbService = new DatabaseService();
