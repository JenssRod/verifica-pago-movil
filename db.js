require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan las credenciales de Supabase en las variables de entorno.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;