

export const valueToPropertyColor = (value?: number | null, property: string = 'text'): string =>  {
    if (value === null || value === undefined) 
        return property === 'bg'? 'bg-gray-500' : 'text-gray-500';

    switch(true) {
        case (value >= 80): 
            return property === 'bg'? 'bg-green-500' : 'text-green-500';
        case (value >= 60): 
            return property === 'bg'? 'bg-blue-600' : 'text-blue-600';
        case (value >= 40): 
            return property === 'bg'? 'bg-amber-500' : 'text-amber-500' ;
        case (value < 40): 
            return property === 'bg'? 'bg-red-500' : 'text-red-500';
        default: 
            return property === 'bg'? 'bg-gray-500' : 'text-gray-500';
    }
};
