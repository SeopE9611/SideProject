import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

const createMockAdmin = () =>
  ({
    storage: {
      from: () => ({
        remove: async () => ({ data: null, error: null }),
        upload: async () => ({ data: null, error: null }),
      }),
    },
  }) as unknown as ReturnType<typeof createClient>;

if (!url || !serviceKey) {
  if (!isBuildPhase) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  }
}

export const supabaseAdmin = !url || !serviceKey ? createMockAdmin() : createClient(url, serviceKey, { auth: { persistSession: false } });
