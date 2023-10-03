import { Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { Role } from '@prisma/client';

declare module 'next-auth' {
  interface User {
    id: string;
    name: string;
    email: string;
    image: string;
    role: Role;
  }

  interface Session {
    user: User;
  }

  interface JWT {
    id: string;
    role: Role;
  }
}
