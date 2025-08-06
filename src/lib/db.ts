import { PrismaClient } from '@prisma/client';
import { checkEnvVars } from './env-check';

// Check environment variables (but don't fail if missing during build)
checkEnvVars();

export const db = new PrismaClient(); 