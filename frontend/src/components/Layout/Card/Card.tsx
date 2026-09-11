import type { FunctionComponent, ReactNode } from 'react';

interface ICard {
    children: ReactNode;
    className?: string;
    cardTitle?: string;
}

const Card: FunctionComponent<ICard> = ({children, className, cardTitle}) => {
  return <div className={`rounded-lg p-6 w-full border bg-gray-800 border-gray-700 ${className? className : null}`}>
    {cardTitle? <h2>{cardTitle}</h2> : null}
    {children}
  </div>;
};

export default Card;
