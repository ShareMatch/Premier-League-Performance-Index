import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Missing Supabase credentials. Please check your configuration.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Placeholder for future data fetching functions
export const fetchTeams = async () => {
    // In a real app, this would fetch from Supabase
    // const { data, error } = await supabase.from('teams').select('*');
    // return { data, error };
    return { data: [], error: null };
};

export const getUserBalance = async (userId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single();

    return { data, error };
};
