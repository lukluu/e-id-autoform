import { dbService, hashPasswordSimple, type UserRecord } from "./dbService";
import { emailService } from "./emailService";

type AuthListener = (user: UserRecord | null) => void;

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  username?: string;
  phone?: string;
  address?: string;
}

class AuthService {
  private currentUser: UserRecord | null = null;
  private listeners: Set<AuthListener> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("eid_auth_session");
        if (raw) {
          this.currentUser = JSON.parse(raw) as UserRecord;
        }
      } catch {
        this.currentUser = null;
      }
    }
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    if (typeof window !== "undefined") {
      if (this.currentUser) {
        localStorage.setItem("eid_auth_session", JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem("eid_auth_session");
      }
    }
    this.listeners.forEach((l) => l(this.currentUser));
  }

  public getCurrentUser(): UserRecord | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.currentUser);
  }

  /**
   * Validasi apakah sesi user saat ini masih valid di database Neon PostgreSQL.
   * Jika akun telah dihapus dari database, otomatis logout dan hapus sesi browser.
   */
  public async validateSession(): Promise<UserRecord | null> {
    if (!this.currentUser) return null;

    try {
      const userInDb = await dbService.getUserByEmail(this.currentUser.email);
      if (!userInDb) {
        this.logout();
        return null;
      }
      this.currentUser = userInDb;
      this.notify();
      return userInDb;
    } catch {
      return this.currentUser;
    }
  }

  /**
   * Login pengguna dengan Email atau Username
   */
  public async login(
    identifier: string,
    password: string,
  ): Promise<{ success: boolean; error?: string; user?: UserRecord }> {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      return { success: false, error: "Email atau username wajib diisi." };
    }

    const user = await dbService.getUserByIdentifier(cleanId);

    if (!user) {
      return { success: false, error: "Akun dengan email/username tersebut tidak ditemukan di database." };
    }

    const hashedInput = hashPasswordSimple(password);
    const storedHash = user.password || user.passwordHash;
    if (storedHash !== hashedInput) {
      return { success: false, error: "Kata sandi yang dimasukkan salah." };
    }

    this.currentUser = user;
    this.notify();

    return { success: true, user };
  }

  /**
   * Pendaftaran akun baru
   * Field Wajib:
   * - name: Nama lengkap (VARCHAR 100)
   * - email: Email user (VARCHAR 100)
   * - password: Password minimal 6 karakter (VARCHAR 255)
   * Field Opsional:
   * - username: Username (VARCHAR 50)
   * - phone: Nomor HP (VARCHAR 20)
   * - address: Alamat (TEXT)
   */
  public async register(
    payloadOrName: string | RegisterPayload,
    email?: string,
    password?: string,
  ): Promise<{ success: boolean; error?: string; user?: UserRecord }> {
    let name = "";
    let cleanEmail = "";
    let rawPassword = "";
    let username: string | undefined = undefined;
    let phone: string | undefined = undefined;
    let address: string | undefined = undefined;

    if (typeof payloadOrName === "object") {
      name = payloadOrName.name || "";
      cleanEmail = (payloadOrName.email || "").trim().toLowerCase();
      rawPassword = payloadOrName.password || "";
      username = payloadOrName.username?.trim();
      phone = payloadOrName.phone?.trim();
      address = payloadOrName.address?.trim();
    } else {
      name = payloadOrName || "";
      cleanEmail = (email || "").trim().toLowerCase();
      rawPassword = password || "";
    }

    // Validasi Field Wajib
    if (!name.trim()) {
      return { success: false, error: "Nama lengkap wajib diisi." };
    }
    if (name.length > 100) {
      return { success: false, error: "Nama lengkap maksimal 100 karakter." };
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Format email tidak valid." };
    }
    if (cleanEmail.length > 100) {
      return { success: false, error: "Email maksimal 100 karakter." };
    }

    if (rawPassword.length < 6) {
      return { success: false, error: "Kata sandi minimal 6 karakter." };
    }
    if (rawPassword.length > 255) {
      return { success: false, error: "Kata sandi terlalu panjang (maksimal 255 karakter)." };
    }

    // Cek Duplikasi Email
    const existingEmail = await dbService.getUserByEmail(cleanEmail);
    if (existingEmail) {
      return { success: false, error: "Email sudah terdaftar. Silakan login atau reset kata sandi." };
    }

    // Cek Duplikasi Username jika diisi
    if (username) {
      if (username.length > 50) {
        return { success: false, error: "Username maksimal 50 karakter." };
      }
      const existingUsername = await dbService.getUserByUsername(username);
      if (existingUsername) {
        return { success: false, error: "Username sudah digunakan oleh pengguna lain." };
      }
    }

    const newUser: UserRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : "usr_" + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      username: username ? username.toLowerCase() : null,
      password: hashPasswordSimple(rawPassword),
      passwordHash: hashPasswordSimple(rawPassword),
      phone: phone || null,
      address: address || null,
      role: "user",
      avatar: null,
      emailVerifiedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dbService.createUser(newUser);
    this.currentUser = newUser;
    this.notify();

    return { success: true, user: newUser };
  }

  public logout(): void {
    this.currentUser = null;
    this.notify();
  }

  public async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string; code?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await dbService.getUserByEmail(cleanEmail);

    if (!user) {
      return { success: false, error: "Akun dengan email tersebut tidak terdaftar di database." };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await dbService.saveRecoveryCode({
      id: crypto.randomUUID ? crypto.randomUUID() : "code_" + Date.now(),
      type: "PASSWORD_RESET",
      email: cleanEmail,
      code,
      createdAt: new Date().toISOString(),
      expiresAt,
      used: false,
    });

    await emailService.sendPasswordResetEmail(cleanEmail, code);

    return { success: true, code };
  }

  public async confirmPasswordReset(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (newPassword.length < 6) {
      return { success: false, error: "Kata sandi baru minimal 6 karakter." };
    }

    const verified = await dbService.verifyRecoveryCode(cleanEmail, code, "PASSWORD_RESET");
    if (!verified) {
      return { success: false, error: "Kode verifikasi salah atau sudah kedaluarsa (berlaku 15 menit)." };
    }

    const updated = await dbService.updateUserPassword(cleanEmail, hashPasswordSimple(newPassword));
    if (!updated) {
      return { success: false, error: "Gagal memperbarui kata sandi." };
    }

    return { success: true };
  }
}

export const authService = new AuthService();
