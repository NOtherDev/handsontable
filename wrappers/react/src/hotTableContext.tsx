import Handsontable from 'handsontable/base';
import React, { PropsWithChildren, useCallback, useMemo, useRef } from 'react';
import { EditorScopeIdentifier, HotEditorCache, HotEditorElement, RendererProps } from './types'
import { createPortal, getOriginalEditorClass, GLOBAL_EDITOR_SCOPE } from './helpers'
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
   * Editor cache.
   */
  readonly editorCache: HotEditorCache;

  /**
   * Return a renderer wrapper function for the provided renderer component.
   *
   * @param {React.ComponentType<RendererProps>} Renderer React renderer component.
   * @returns {Handsontable.renderers.Base} The Handsontable rendering function.
   */
  readonly getRendererWrapper: (Renderer: React.ComponentType<RendererProps>) => typeof Handsontable.renderers.BaseRenderer;

  /**
   * Clears rendered cells cache.
   */
  readonly clearRenderedCellCache: () => void;

  /**
   * Create a fresh class to be used as an editor, based on the provided editor React element.
   *
   * @param {React.ReactElement} editorElement React editor component.
   * @param {string|number} [editorColumnScope] The editor scope (column index or a 'global' string). Defaults to
   * 'global'.
   * @returns {Function} A class to be passed to the Handsontable editor settings.
   */
  readonly getEditorClass: (editorElement: HotEditorElement, editorColumnScope?: EditorScopeIdentifier) => typeof Handsontable.editors.BaseEditor | undefined;

  /**
   * Set the renderers portal manager ref.
   *
   * @param {React.ReactComponent} pmComponent The PortalManager component.
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
 * @param {React.ReactElement} editorComponent React editor component.
 * @returns {Function} A class to be passed to the Handsontable editor settings.
 */
function makeEditorClass(editorComponent: React.Component): typeof Handsontable.editors.BaseEditor {
  const customEditorClass = class CustomEditor extends Handsontable.editors.BaseEditor implements Handsontable.editors.BaseEditor {
    editorComponent: React.Component;

    constructor(hotInstance: Handsontable.Core) {
      super(hotInstance);

      (editorComponent as any).hotCustomEditorInstance = this;

      this.editorComponent = editorComponent;
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

    (customEditorClass as any).prototype[propName] = function (...args: any[]) {
      return (editorComponent as any)[propName].call(editorComponent, ...args);
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
  const editorCache = useRef<HotEditorCache>(new Map());
  const renderedCellCache = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const clearRenderedCellCache = useCallback(() => renderedCellCache.current.clear(), []);
  const portalCacheArray = useRef<React.ReactPortal[]>([]);

  const getRendererWrapper = useCallback((Renderer: React.ComponentType<RendererProps>): typeof Handsontable.renderers.BaseRenderer => {
    return function (instance, td, row, column, prop, value, cellProperties) {
      const rowColKey = `${row}-${column}`
      if (renderedCellCache.current.has(rowColKey)) {
        td.innerHTML = renderedCellCache.current.get(rowColKey)!.innerHTML;
      }

      if (td && !td.getAttribute('ghost-table')) {
        const rendererElement = (
            <Renderer instance={instance}
                      td={td}
                      row={row}
                      column={column}
                      prop={prop}
                      value={value}
                      cellProperties={cellProperties}/>
        );

        const {portal, portalContainer} = createPortal(rendererElement, `${rowColKey}-${Math.random()}`, td.ownerDocument);

        while (td.firstChild) {
          td.removeChild(td.firstChild);
        }

        td.appendChild(portalContainer);

        portalCacheArray.current.push(portal);
      }

      renderedCellCache.current.set(rowColKey, td);

      return td;
    };
  }, []);

  const getEditorClass = useCallback((editorElement: HotEditorElement, editorColumnScope: EditorScopeIdentifier = GLOBAL_EDITOR_SCOPE): typeof Handsontable.editors.BaseEditor | undefined => {
    const editorClass = getOriginalEditorClass(editorElement);
    const cachedComponent = editorCache.current.get(editorClass)?.get(editorColumnScope);

    if (cachedComponent) {
      return makeEditorClass(cachedComponent);
    }
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
    editorCache: editorCache.current,
    getRendererWrapper,
    clearRenderedCellCache,
    getEditorClass,
    setRenderersPortalManagerRef,
    pushCellPortalsIntoPortalManager
  }), [setHotColumnSettings, getRendererWrapper, clearRenderedCellCache, getEditorClass, setRenderersPortalManagerRef]);

  return (
    <HotTableContext.Provider value={contextImpl}>{children}</HotTableContext.Provider>
  );
};

export { HotTableContext, HotTableContextProvider };
