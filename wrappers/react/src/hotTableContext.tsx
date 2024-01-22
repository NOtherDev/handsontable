import Handsontable from 'handsontable/base';
import React, {MutableRefObject, PropsWithChildren, useCallback, useMemo, useRef } from 'react';
import { EditorScopeIdentifier, HotEditorCache, HotEditorElement } from './types'
import { createPortal, getOriginalEditorClass, GLOBAL_EDITOR_SCOPE } from './helpers'

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

  /**
   * Create a fresh class to be used as an editor, based on the provided editor React element.
   *
   * @param {React.ReactElement} editorElement React editor component.
   * @param {string|number} [editorColumnScope] The editor scope (column index or a 'global' string). Defaults to
   * 'global'.
   * @returns {Function} A class to be passed to the Handsontable editor settings.
   */
  readonly getEditorClass: (editorElement: HotEditorElement, editorColumnScope?: EditorScopeIdentifier) => typeof Handsontable.editors.BaseEditor;
}

const HotTableContext = React.createContext<HotTableContextImpl>(undefined);


/**
 * Create a class to be passed to the Handsontable's settings.
 *
 * @param {React.ReactElement} editorComponent React editor component.
 * @returns {Function} A class to be passed to the Handsontable editor settings.
 */
function makeEditorClass(editorComponent: React.Component): typeof Handsontable.editors.BaseEditor {
  const customEditorClass = class CustomEditor extends Handsontable.editors.BaseEditor implements Handsontable.editors.BaseEditor {
    editorComponent: React.Component;

    constructor(hotInstance) {
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

    customEditorClass.prototype[propName] = function (...args) {
      return editorComponent[propName].call(editorComponent, ...args);
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

  const getEditorClass = useCallback((editorElement: HotEditorElement, editorColumnScope: EditorScopeIdentifier = GLOBAL_EDITOR_SCOPE): typeof Handsontable.editors.BaseEditor => {
    const editorClass = getOriginalEditorClass(editorElement);
    const cachedComponent = editorCache.current.get(editorClass)?.get(editorColumnScope);

    return makeEditorClass(cachedComponent);
  }, []);

  const contextImpl: HotTableContextImpl = useMemo(() => ({
    componentRendererColumns: componentRendererColumns.current,
    columnsSettings: columnsSettings.current,
    emitColumnSettings: setHotColumnSettings,
    editorCache: editorCache.current,
    getRendererWrapper,
    clearRenderedCellCache,
    portalCacheArray,
    getEditorClass
  }), [setHotColumnSettings]);

  return (
    <HotTableContext.Provider value={contextImpl}>{children}</HotTableContext.Provider>
  );
};

export { HotTableContext, HotTableContextProvider };
