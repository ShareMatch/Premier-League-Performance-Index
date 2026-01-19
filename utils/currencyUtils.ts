/**
 * Formats a number as a currency string with commas and fixed decimal places.
 * Example: 4114.00 -> $4,114.00
 */
export const formatCurrency = (amount: number | string | undefined | null): string => {
    if (amount === undefined || amount === null || amount === "") return "$0.00";

    const num = typeof amount === "string" ? parseFloat(amount) : amount;

    if (isNaN(num)) return "$0.00";

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
};

/**
 * Formats a number with commas and fixed decimal places but without the currency symbol.
 * Example: 4114.00 -> 4,114.00
 */
export const formatNumberWithCommas = (amount: number | string | undefined | null): string => {
    if (amount === undefined || amount === null || amount === "") return "0.00";

    const num = typeof amount === "string" ? parseFloat(amount) : amount;

    if (isNaN(num)) return "0.00";

    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
};
