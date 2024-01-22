import React, { PropsWithChildren, useRef } from 'react';

interface HotTableContextImpl {
  componentRendererColumns: Map<number | 'global', boolean>;
}

const HotTableContext = React.createContext<HotTableContextImpl>(undefined);

const HotTableContextProvider: React.FC<PropsWithChildren> = ({ children }) => {
  /**
   * Map with column indexes (or a string = 'global') as keys, and booleans as values. Each key represents a component-based editor
   * declared for the used column index, or a global one, if the key is the `global` string.
   *
   * @private
   * @type {Map}
   */
  const componentRendererColumns = useRef<Map<number | 'global', boolean>>(new Map());

  const contextImpl: HotTableContextImpl = {
    componentRendererColumns: componentRendererColumns.current,
  };

  return (
    <HotTableContext.Provider value={contextImpl}>{children}</HotTableContext.Provider>
  );
};

export { HotTableContext, HotTableContextProvider };
