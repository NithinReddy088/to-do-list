import { userRepo } from "@/repos/user.repo";

export const authService = {
  async register(email: string, password: string) {
    const existing = await userRepo.findByEmail(email);
    if (existing) throw new Error("EMAIL_TAKEN");
    const passwordHash = await Bun.password.hash(password); // argon2id by default
    return userRepo.create({ email, passwordHash });
  },

  async verify(email: string, password: string) {
    const user = await userRepo.findByEmail(email);
    if (!user) return null;
    const ok = await Bun.password.verify(password, user.passwordHash);
    return ok ? user : null;
  },
};
