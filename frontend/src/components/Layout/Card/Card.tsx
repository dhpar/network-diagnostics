import type { FunctionComponent, ReactNode } from 'react';

interface ICard {
    children: ReactNode;
}

const Card: FunctionComponent<ICard> = ({children}) => {
  return <div className="rounded-lg p-6 w-full border bg-gray-800 border-gray-700">
    {children}
  </div>;
};

export default Card;
