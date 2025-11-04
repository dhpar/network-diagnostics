import type { FunctionComponent, ReactNode } from "react";
interface Itab {
    children: ReactNode;
}    

export const Tab: FunctionComponent<Itab> = ({children}) => {
    return <div className="space-y-6">
            {children}
        </div>
}