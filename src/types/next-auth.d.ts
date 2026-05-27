import { Role } from "@/generated/prisma/client";
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
  }
}
