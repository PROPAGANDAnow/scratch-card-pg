// Migrated to Prisma - real-time subscriptions need to be reimplemented
// For Neon PostgreSQL, consider using database triggers with webhooks or polling
// This is a placeholder that does nothing for now

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const subscribeToTable = (
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (payload: any) => void,
  userWallet?: string
) => {
  // TODO: Implement real-time subscriptions for Neon PostgreSQL
  // For now, return a dummy unsubscribe function
  console.warn(`Real-time subscription to ${table} not implemented yet. Migrating from Supabase to Prisma/Neon.`);
  return {
    unsubscribe: () => {
      // No-op
    }
  };
};

// Export a dummy supabase client for compatibility
export const supabase = null;
