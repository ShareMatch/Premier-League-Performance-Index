import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase credentials. Please check your .env file.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);

// Placeholder for future data fetching functions
export const fetchTeams = async () => {
    // In a real app, this would fetch from Supabase
    // const { data, error } = await supabase.from('teams').select('*');
    // return { data, error };
    return { data: [], error: null };
};
