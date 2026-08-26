export const valueToColor = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'bg-gray-500';
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-blue-500';
    if (value >= 40) return 'bg-amber-500';
    return 'bg-red-500';
};

export const valueToTextColor = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'text-gray-500';
    switch(true) {
        case (value >= 80): return 'text-green-500';
        case (value >= 60): return 'text-blue-500';
        case (value >= 40): return 'text-amber-500';
        default: return 'text-red-500';
    }
}