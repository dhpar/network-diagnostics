export interface FilterTabOption<T extends string> {
    value: T;
    label: string;
    count?: number;
    activeClassName?: string;
}

interface IFilterTabsProps<T extends string> {
    options: FilterTabOption<T>[];
    value: T;
    onChange: (value: T) => void;
    ariaLabel?: string;
    className?: string;
}

const FilterTabs = function <T extends string>({
    options,
    value,
    onChange,
    ariaLabel,
    className,
}: IFilterTabsProps<T>) {
    return (
        <div role="tablist" aria-label={ariaLabel} className={`flex flex-wrap gap-2 ${className ?? ''}`}>
            {options.map(({value, activeClassName, label, count}) => {
                const isActive = value === value;
                return (
                    <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            isActive && activeClassName ? 
                                'bg-blue-600 border-blue-500 text-white' : 
                                'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-gray-100'
                        }`}
                    >
                        {label}
                        {count !== undefined && (
                            <span className="ml-1.5 text-xs opacity-80">            
                                ({count})
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default FilterTabs;