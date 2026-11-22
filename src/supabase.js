
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmlnnlaegplpxufhmxaw.supabase.co';

const supabaseKey = 'sb_publishable_aVk7OxWPYgvshiS1HbT-Hg_TncSmHTT';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
