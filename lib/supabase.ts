import { createClient } from '@supabase/supabase-js';

// TODO: Revert to import.meta.env once .env loading issue is resolved
const supabaseUrl = 'https://nilquprumeipoiljsezt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbHF1cHJ1bWVpcG9pbGpzZXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTQwMjQsImV4cCI6MjA3Mzk5MDAyNH0.Z1lCDDRvCgUBdYdzzZjahl44A2waYhbqc1rFDV0n20U';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase credentials. Please check your .env file.');
}

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
);

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
