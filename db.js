const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qfpzwepkwcqosqqebuod.supabase.co';
const SUPABASE_KEY = 'sb_publishable_H2eIdRb8Ds4SGt9osIfhNA_Bcb23EQC';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase;