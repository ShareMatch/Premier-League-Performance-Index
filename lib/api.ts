import { supabase } from './supabase';

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface Wallet {
    id: string;
    balance: number; // Stored as cents in DB
    reserved_cents: number;
    available_cents: number;
    currency: string;
}

export interface Position {
    id: string;
    asset_id: string;
    asset_name: string;
    quantity: number;
    average_buy_price: number;
    current_value?: number;
}

export const fetchWallet = async (userId: string) => {
    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) throw error;

    return {
        ...data,
        balance: data.balance / 100,
        reserved: data.reserved_cents / 100,
        available: (data.balance - data.reserved_cents) / 100
    };
};

export const fetchPortfolio = async (userId: string) => {
    const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId);

    if (error) throw error;
    return data as Position[];
};

export const placeTrade = async (
    userId: string,
    assetId: string,
    assetName: string,
    direction: 'buy' | 'sell',
    price: number,
    quantity: number
) => {
    const totalCost = price * quantity;

    const { data, error } = await supabase.rpc('place_trade', {
        p_user_id: userId,
        p_asset_id: assetId,
        p_asset_name: assetName,
        p_direction: direction,
        p_price: price,
        p_quantity: quantity,
        p_total_cost: totalCost
    });

    if (error) throw error;
    return data;
};

export const subscribeToWallet = (userId: string, callback: (wallet: any) => void) => {
    return supabase
        .channel('wallet-changes')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'wallets',
                filter: `user_id=eq.${userId}`
            },
            (payload) => {
                const data = payload.new as any;
                callback({
                    ...data,
                    balance: data.balance / 100,
                    reserved: data.reserved_cents / 100,
                    available: (data.balance - data.reserved_cents) / 100
                });
            }
        )
        .subscribe();
};

export const subscribeToPortfolio = (userId: string, callback: () => void) => {
    return supabase
        .channel('portfolio-changes')
        .on(
            'postgres_changes',
            {
                event: '*', // Listen for INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'positions',
                filter: `user_id=eq.${userId}`
            },
            () => {
                callback();
            }
        )
        .subscribe();
};

export const fetchAssets = async () => {
    const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('id', { ascending: true });

    if (error) throw error;
    return data;
};

export const subscribeToAssets = (callback: () => void) => {
    return supabase
        .channel('assets-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'assets'
            },
            () => {
                callback();
            }
        )
        .subscribe();
};
