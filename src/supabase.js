
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmlnnlaegplpxufhmxaw.supabase.co';

const supabaseKey = 'PASTE_YOUR_PUBLISHABLE_KEY_HERE';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
