import Handsontable from 'handsontable/base';
import React, { PropsWithChildren, useCallback, useMemo, useRef } from 'react';
import { HotEditorCache } from './types'

interface HotTableContextImpl {
  /**
   * Map with column indexes (or a string = 'global') as keys, and booleans as values. Each key represents a component-based editor
   * declared for the used column index, or a global one, if the key is the `global` string.
   */
  readonly componentRendererColumns: Map<number | 'global', boolean>;

  /**
   * Array of object containing the column settings.
   */
  readonly columnsSettings: Handsontable.ColumnSettings[];

  /**
   * Sets the column settings based on information received from HotColumn.
   *
   * @param {HotTableProps} columnSettings Column settings object.
   * @param {Number} columnIndex Column index.
   */
  readonly emitColumnSettings: (columnSettings: Handsontable.ColumnSettings, columnIndex: number) => void;

  /**
   * Editor cache.
   */
  readonly editorCache: HotEditorCache;
}

const HotTableContext = React.createContext<HotTableContextImpl>(undefined);

const HotTableContextProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const columnsSettings = useRef<Handsontable.ColumnSettings[]>([]);

  const setHotColumnSettings = useCallback((columnSettings: Handsontable.ColumnSettings, columnIndex: number) => {
    columnsSettings.current[columnIndex] = columnSettings;
  }, [])

  const componentRendererColumns = useRef<Map<number | 'global', boolean>>(new Map());

  const editorCache = useRef<HotEditorCache>(new Map());

  const contextImpl: HotTableContextImpl = useMemo(() => ({
    componentRendererColumns: componentRendererColumns.current,
    columnsSettings: columnsSettings.current,
    emitColumnSettings: setHotColumnSettings,
    editorCache: editorCache.current,
  }), [setHotColumnSettings]);

  return (
    <HotTableContext.Provider value={contextImpl}>{children}</HotTableContext.Provider>
  );
};

export { HotTableContext, HotTableContextProvider };
