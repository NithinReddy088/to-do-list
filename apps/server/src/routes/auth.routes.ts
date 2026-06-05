import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { config } from "@/config/configs";
import { authService } from "@/services/auth.service";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(jwt({ name: "jwt", secret: config.jwtSecret }))
  .post(
    "/register",
    async ({ body, jwt, set }) => {
      try {
        const user = await authService.register(body.email, body.password);
        const token = await jwt.sign({ sub: user.id });
        return { token, user: { id: user.id, email: user.email } };
      } catch (e) {
        if (e instanceof Error && e.message === "EMAIL_TAKEN") {
          set.status = 409;
          return { error: { code: "EMAIL_TAKEN", message: "Email already registered" } };
        }
        throw e;
      }
    },
    { body: t.Object({ email: t.String({ format: "email" }), password: t.String({ minLength: 8 }) }) },
  )
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      const user = await authService.verify(body.email, body.password);
      if (!user) {
        set.status = 401;
        return { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } };
      }
      const token = await jwt.sign({ sub: user.id });
      return { token, user: { id: user.id, email: user.email } };
    },
    { body: t.Object({ email: t.String(), password: t.String() }) },
  );
