import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  address: z.string(),
  fid: z.number().optional(),
  created_at: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;