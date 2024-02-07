import Handsontable from 'handsontable/base';
import React from 'react';
import BaseEditorComponent from './baseEditorComponent'

/**
 * Type of the editor component's ReactElement.
 */
export type HotEditorElement = React.ReactElement<HotEditorProps, any>;

/**
 * Type of the identifier under which the cached editor components are stored.
 */
export type EditorScopeIdentifier = 'global' | number;

/**
 * Type of the cache map for the Handsontable editor components.
 */
export type HotEditorCache = Map<EditorScopeIdentifier, React.Component>;

/**
 * Interface for the props of the component-based renderers.
 */
export interface HotRendererProps {
  instance: Handsontable.Core,
  TD: HTMLTableCellElement,
  row: number,
  col: number,
  prop: string | number,
  value: any,
  cellProperties: Handsontable.CellProperties
}

/**
 * Interface for the props of the component-based editors.
 */
export interface HotEditorProps {
  id?: string,
  className?: string,
  style?: React.CSSProperties,

  _editorColumnScope?: EditorScopeIdentifier,
  _emitEditorInstance?: (editor: BaseEditorComponent, column: EditorScopeIdentifier) => void,
}

/**
 * Helper type to expose GridSettings/ColumnSettings props with native renderers/editors separately
 *  from component-based render prop.
 */
type ReplaceRenderersEditors<T extends Pick<Handsontable.GridSettings, 'renderer' | 'editor'>> = Omit<T, 'renderer' | 'editor'> & {
  hotRenderer?: T['renderer'],
  renderer?: React.ComponentType<HotRendererProps>,
  hotEditor?: T['editor'],
  editor?: React.ComponentType<HotEditorProps>,
}

/**
 * Interface for the `prop` of the HotTable component - extending the default Handsontable settings with additional,
 * component-related properties.
 */
export interface HotTableProps extends ReplaceRenderersEditors<Handsontable.GridSettings> {
  id?: string,
  className?: string,
  style?: React.CSSProperties,
  children?: React.ReactNode
}

/**
 * Properties related to the HotColumn architecture.
 */
export interface HotColumnProps extends ReplaceRenderersEditors<Handsontable.ColumnSettings> {
  children?: React.ReactNode;
}
