import Handsontable from 'handsontable/base';
import React, {MutableRefObject, PropsWithChildren, useCallback, useMemo, useRef } from 'react';
import { HotEditorCache } from './types'
import {createPortal} from './helpers'

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

  /**
   * Return a renderer wrapper function for the provided renderer component.
   *
   * @param {React.ReactElement} rendererElement React renderer component.
   * @returns {Handsontable.renderers.Base} The Handsontable rendering function.
   */
  readonly getRendererWrapper: (rendererNode: React.ReactElement) => typeof Handsontable.renderers.BaseRenderer;

  /**
   * Clears rendered cells cache.
   */
  readonly clearRenderedCellCache: () => void;

  /**
   * Array containing the portals cached to be rendered in bulk after Handsontable's render cycle.
   */
  readonly portalCacheArray: MutableRefObject<React.ReactPortal[]>;
}

const HotTableContext = React.createContext<HotTableContextImpl>(undefined);

const HotTableContextProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const columnsSettings = useRef<Handsontable.ColumnSettings[]>([]);

  const setHotColumnSettings = useCallback((columnSettings: Handsontable.ColumnSettings, columnIndex: number) => {
    columnsSettings.current[columnIndex] = columnSettings;
  }, [])

  const componentRendererColumns = useRef<Map<number | 'global', boolean>>(new Map());

  const editorCache = useRef<HotEditorCache>(new Map());

  const renderedCellCache = useRef<Map<string, HTMLTableCellElement>>(new Map());

  const clearRenderedCellCache = useCallback(() => renderedCellCache.current.clear(), []);

  const portalCacheArray = useRef<React.ReactPortal[]>([]);

  const getRendererWrapper = useCallback((rendererElement: React.ReactElement): typeof Handsontable.renderers.BaseRenderer => {
    return function (instance, TD, row, col, prop, value, cellProperties) {
      if (renderedCellCache.current.has(`${row}-${col}`)) {
        TD.innerHTML = renderedCellCache.current.get(`${row}-${col}`).innerHTML;
      }

      if (TD && !TD.getAttribute('ghost-table')) {

        const {portal, portalContainer} = createPortal(rendererElement, {
          TD,
          row,
          col,
          prop,
          value,
          cellProperties,
          isRenderer: true
        }, TD.ownerDocument);

        while (TD.firstChild) {
          TD.removeChild(TD.firstChild);
        }

        TD.appendChild(portalContainer);

        portalCacheArray.current.push(portal);
      }

      renderedCellCache.current.set(`${row}-${col}`, TD);

      return TD;
    };
  }, []);

  const contextImpl: HotTableContextImpl = useMemo(() => ({
    componentRendererColumns: componentRendererColumns.current,
    columnsSettings: columnsSettings.current,
    emitColumnSettings: setHotColumnSettings,
    editorCache: editorCache.current,
    getRendererWrapper,
    clearRenderedCellCache,
    portalCacheArray,
  }), [setHotColumnSettings]);

  return (
    <HotTableContext.Provider value={contextImpl}>{children}</HotTableContext.Provider>
  );
};

export { HotTableContext, HotTableContextProvider };
