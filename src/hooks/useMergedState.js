import { useCallback, useState } from 'react';

/**
 * Object-shaped component state with partial updates.
 *
 * setState accepts either an object with changed fields or a function
 * (prevState) => changes. New fields are merged into the current state;
 * all other fields are kept.
 *
 * @param {object | (() => object)} initialState initial state
 * @returns {[object, (patch: object | ((prev: object) => object)) => void]}
 */
export default function useMergedState(initialState) {
  const [state, setFullState] = useState(initialState);

  const setState = useCallback((patch) => {
    setFullState((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }, []);

  return [state, setState];
}
