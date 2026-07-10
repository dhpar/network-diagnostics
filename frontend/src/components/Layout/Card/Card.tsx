import type { FunctionComponent, ReactNode } from 'react';

interface ICard {
    children: ReactNode;
}

const Card: FunctionComponent<ICard> = ({children}) => {
  return <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
    {children}
  </div>;
};

export default Card;
