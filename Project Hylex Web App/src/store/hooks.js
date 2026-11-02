import { useContext } from 'react';
import { HylexContext, HylexDispatch } from './context';

export const useHylex = () => useContext(HylexContext);
export const useDispatch = () => useContext(HylexDispatch);
