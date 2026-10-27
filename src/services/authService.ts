import { dbService, ApiError, type UserRecord } from "./dbService";

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

  /** Terapkan data user terbaru (mis. setelah update profil) ke state global. */
  public applyUser(user: UserRecord | null): void {
    if (!user) return;
    this.currentUser = user;
    this.notify();
  }

  public isAuthenticated(): boolean {
    return Boolean(this.currentUser);
  }

  /**
   * Validasi sesi ke server.
   * - 401 / token tidak ada  -> logout (sesi memang tidak valid).
   * - error jaringan/server -> pertahankan sesi, tapi pemanggil tidak boleh
   *   membaca data vault yang mungkin sudah basi.
   */
  public async validateSession(): Promise<UserRecord | null> {
    if (!this.currentUser) return null;

    if (!dbService.getAuthToken()) {
      this.logout();
      return null;
    }

    try {
      const user = await dbService.getCurrentUserFromServer();
      if (!user) {
        this.logout();
        return null;
      }
      this.currentUser = user;
      this.notify();
      return user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        this.logout();
        return null;
      }
      console.warn("[AUTH] Validasi sesi gagal sementara:", (err as Error).message);
      return this.currentUser;
    }
  }

  /**
   * Login pengguna dengan Email atau Username (diverifikasi di server).
   */
  public async login(
    identifier: string,
    password: string,
  ): Promise<{ success: boolean; error?: string; user?: UserRecord }> {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      return { success: false, error: "Email atau username wajib diisi." };
    }
    if (!password) {
      return { success: false, error: "Kata sandi wajib diisi." };
    }

    try {
      const result = await dbService.login(cleanId, password);
      this.currentUser = result.user;
      await dbService.clearLocalKtpCache();
      this.notify();
      return { success: true, user: result.user };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message || "Gagal login. Silakan coba lagi.",
      };
    }
  }

  /**
   * Pendaftaran akun baru.
   * Validasi utama dilakukan di server; validasi di sini hanya untuk UX.
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

    try {
      const result = await dbService.register({
        name: name.trim(),
        email: cleanEmail,
        password: rawPassword,
        username: username || undefined,
        phone: phone || undefined,
        address: address || undefined,
      });
      this.currentUser = result.user;
      await dbService.clearLocalKtpCache();
      this.notify();
      return { success: true, user: result.user };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message || "Gagal mendaftarkan akun. Silakan coba lagi.",
      };
    }
  }

  public logout(): void {
    this.currentUser = null;
    dbService.setAuthToken(null);
    void dbService.clearLocalKtpCache();
    this.notify();
  }

  public async requestPasswordReset(
    email: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: "Email wajib diisi." };
    }

    try {
      const result = await dbService.requestPasswordReset(cleanEmail);
      return {
        success: true,
        message:
          result.message ||
          "Jika email tersebut terdaftar, kode verifikasi telah dikirim. Periksa kotak masuk Anda.",
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message || "Gagal mengirim kode verifikasi.",
      };
    }
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
    if (!code.trim()) {
      return { success: false, error: "Kode verifikasi wajib diisi." };
    }

    try {
      await dbService.resetPassword(cleanEmail, code.trim(), newPassword);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message || "Kode verifikasi salah atau sudah kedaluwarsa.",
      };
    }
  }
}

export const authService = new AuthService();
