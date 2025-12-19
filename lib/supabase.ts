import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Missing Supabase credentials. Please check your configuration.');
}

// Configure Supabase client with proper headers to avoid 406 errors
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    global: {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
    },
});

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
