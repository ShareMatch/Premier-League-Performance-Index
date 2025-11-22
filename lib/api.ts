import { supabase } from './supabase';

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface Wallet {
    id: string;
    balance: number; // Stored as cents in DB, but we might want to convert to dollars here or keep consistent
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

    // Calculate available if not returned (though it is generated in DB)
    // DB returns cents. Let's convert to dollars for the app?
    // Or keep cents and format in UI?
    // User's existing app uses dollars (e.g. 8486.07).
    // Let's convert cents to dollars for the frontend.

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
        import { supabase } from './supabase';

        export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

        export interface Wallet {
        id: string;
        balance: number; // Stored as cents in DB, but we might want to convert to dollars here or keep consistent
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

        // Calculate available if not returned (though it is generated in DB)
        // DB returns cents. Let's convert to dollars for the app?
        // Or keep cents and format in UI?
        // User's existing app uses dollars (e.g. 8486.07).
        // Let's convert cents to dollars for the frontend.

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

    export const subscribeToWallet = (userId: string, callback: (wallet: Wallet) => void) => {
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
                    // For portfolio, it's easier to just refetch the whole list when something changes
                    // rather than trying to patch the array locally from the payload
                    callback();
                }
            )
            .subscribe();
    };
