import type { FunctionComponent, ReactNode } from 'react';

interface ICard {
    children: ReactNode;
    className?: string
}

const Card: FunctionComponent<ICard> = ({children, className}) => {
  return <div className={`rounded-lg p-6 w-full border bg-gray-800 border-gray-700 ${className}`}>
    {children}
  </div>;
};

export default Card;
