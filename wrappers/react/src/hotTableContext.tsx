import Handsontable from 'handsontable/base';
import React, { PropsWithChildren, useCallback, useMemo, useRef } from 'react';
import { EditorScopeIdentifier, HotRendererProps } from './types'
import { createPortal, GLOBAL_EDITOR_SCOPE } from './helpers'
import { RenderersPortalManager } from './renderersPortalManager'

export interface HotTableContextImpl {
  /**
   * Map with column indexes (or a string = 'global') as keys, and booleans as values. Each key represents a component-based editor
   * declared for the used column index, or a global one, if the key is the `global` string.
   */
  readonly componentRendererColumns: Map<EditorScopeIdentifier, boolean>;

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
   * Return a renderer wrapper function for the provided renderer component.
   *
   * @param {React.ComponentType<HotRendererProps>} Renderer React renderer component.
   * @returns {Handsontable.renderers.Base} The Handsontable rendering function.
   */
  readonly getRendererWrapper: (Renderer: React.ComponentType<HotRendererProps>) => typeof Handsontable.renderers.BaseRenderer;

  /**
   * Clears rendered cells cache.
   */
  readonly clearRenderedCellCache: () => void;

  /**
   * Set the renderers portal manager ref.
   *
   * @param {RenderersPortalManager} pmComponent The PortalManager component.
   */
  readonly setRenderersPortalManagerRef: (pmComponent: RenderersPortalManager) => void;

  /**
   * Puts cell portals into portal manager and purges portals cache.
   */
  readonly pushCellPortalsIntoPortalManager: () => void;
}

const HotTableContext = React.createContext<HotTableContextImpl | undefined>(undefined);

/**
 * Create a class to be passed to the Handsontable's settings.
 *
 * @param {React.RefObject} editorComponentRef React editor component ref. // TODO.
 * @returns {Function} A class to be passed to the Handsontable editor settings.
 */
export function makeEditorClass(editorComponentRef: React.RefObject<any>): typeof Handsontable.editors.BaseEditor { // TODO move away // TODO type
  const customEditorClass = class CustomEditor extends Handsontable.editors.BaseEditor implements Handsontable.editors.BaseEditor {
    editorComponentRef: React.RefObject<any>; // TODO type

    constructor(hotInstance: Handsontable.Core) {
      super(hotInstance);

      // (editorComponent as any).hotCustomEditorInstance = this;

      this.editorComponentRef = editorComponentRef;
    }

    focus() {
    }

    getValue() {
    }

    setValue() {
    }

    open() {
    }

    close() {
    }
  };

  // Fill with the rest of the BaseEditor methods
  Object.getOwnPropertyNames(Handsontable.editors.BaseEditor.prototype).forEach(propName => {
    if (propName === 'constructor') {
      return;
    }

    const baseMethod = customEditorClass.prototype[propName] ?? (() => undefined);

    customEditorClass.prototype[propName] = function (...args: unknown[]) {
      if (editorComponentRef.current?.[propName]) {
        return editorComponentRef.current[propName].call(editorComponentRef.current, ...args);
      } else {
        return baseMethod.call(editorComponentRef.current, ...args);
      }
    }
  });

  return customEditorClass;
}

const HotTableContextProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const columnsSettings = useRef<Handsontable.ColumnSettings[]>([]);

  const setHotColumnSettings = useCallback((columnSettings: Handsontable.ColumnSettings, columnIndex: number) => {
    columnsSettings.current[columnIndex] = columnSettings;
  }, [])

  const componentRendererColumns = useRef<Map<number | 'global', boolean>>(new Map());
  const renderedCellCache = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const clearRenderedCellCache = useCallback(() => renderedCellCache.current.clear(), []);
  const portalCacheArray = useRef<React.ReactPortal[]>([]);

  const getRendererWrapper = useCallback((Renderer: React.ComponentType<HotRendererProps>): typeof Handsontable.renderers.BaseRenderer => {
    return function (instance, TD, row, col, prop, value, cellProperties) {
      const rowColKey = `${row}-${col}`
      if (renderedCellCache.current.has(rowColKey)) {
        TD.innerHTML = renderedCellCache.current.get(rowColKey)!.innerHTML;
      }

      if (TD && !TD.getAttribute('ghost-table')) {
        const rendererElement = (
            <Renderer instance={instance}
                      TD={TD}
                      row={row}
                      col={col}
                      prop={prop}
                      value={value}
                      cellProperties={cellProperties}/>
        );

        const {portal, portalContainer} = createPortal(rendererElement, `${rowColKey}-${Math.random()}`, TD.ownerDocument);

        while (TD.firstChild) {
          TD.removeChild(TD.firstChild);
        }

        TD.appendChild(portalContainer);

        portalCacheArray.current.push(portal);
      }

      renderedCellCache.current.set(rowColKey, TD);

      return TD;
    };
  }, []);

  const renderersPortalManager = useRef<RenderersPortalManager | null>(null);

  const setRenderersPortalManagerRef = useCallback((pmComponent: RenderersPortalManager) => {
    renderersPortalManager.current = pmComponent;
  }, []);

  const pushCellPortalsIntoPortalManager = useCallback(() => {
    renderersPortalManager.current!.setState({
      portals: [...portalCacheArray.current]
    }, () => {
      portalCacheArray.current = [];
    });
  }, []);

  const contextImpl: HotTableContextImpl = useMemo(() => ({
    componentRendererColumns: componentRendererColumns.current,
    columnsSettings: columnsSettings.current,
    emitColumnSettings: setHotColumnSettings,
    getRendererWrapper,
    clearRenderedCellCache,
    setRenderersPortalManagerRef,
    pushCellPortalsIntoPortalManager
  }), [setHotColumnSettings, getRendererWrapper, clearRenderedCellCache, setRenderersPortalManagerRef]);

  return (
    <HotTableContext.Provider value={contextImpl}>{children}</HotTableContext.Provider>
  );
};

export { HotTableContext, HotTableContextProvider };
