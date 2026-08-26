import type { FunctionComponent } from "react";

export const SecurityBadge: FunctionComponent<{ encryption?: string | null }> = ({ encryption }) => {
    const open = !encryption || /none|open/i.test(encryption);
    const className = open
        ? 'bg-red-600/20 text-red-300 border-red-500'
        : /wep/i.test(encryption)
            ? 'bg-amber-600/20 text-amber-300 border-amber-500'
            : 'bg-green-600/20 text-green-300 border-green-500';
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
            {open ? 'Open' : encryption}
        </span>
    );
};