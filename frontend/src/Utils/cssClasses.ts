export const valueToPropertyColor = (value?: number | null, property: string = 'text'): string =>  {
    if (value === null || value === undefined) 
        return property === 'bg'? 'bg-gray-500' : 'text-gray-500';

    switch(true) {
        case (value >= 80): 
            return property === 'bg'? 'bg-mint-500' : 'text-mint-500';
        case (value >= 60): 
            return property === 'bg'? 'bg-indigo-600' : 'text-indigo-600';
        case (value >= 40): 
            return property === 'bg'? 'bg-amber-500' : 'text-amber-500' ;
        case (value < 40): 
            return property === 'bg'? 'bg-red-500' : 'text-red-500';
        default: 
            return property === 'bg'? 'bg-gray-500' : 'text-gray-500';
    }
};
