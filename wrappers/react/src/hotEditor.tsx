import React from 'react';
import Handsontable from 'handsontable/base';
import { HotEditorHooks } from './types';
import { superBound } from "./helpers";

/**
 * Create a class to be passed to the Handsontable's settings.
 *
 * @param {HotEditorHooks} hooks Component-based editor overridden hooks object.
 * @param {React.RefObject} instanceRef Reference to Handsontable-native custom editor class instance.
 * @returns {Function} A class to be passed to the Handsontable editor settings.
 */
export function makeEditorClass(hooks: HotEditorHooks, instanceRef: React.MutableRefObject<Handsontable.editors.BaseEditor>): typeof Handsontable.editors.BaseEditor {
  return class CustomEditor extends Handsontable.editors.BaseEditor implements Handsontable.editors.BaseEditor {
    constructor(hotInstance: Handsontable.Core) {
      super(hotInstance);
      instanceRef.current = this;

      Object.getOwnPropertyNames(Handsontable.editors.BaseEditor.prototype).forEach(propName => {
        if (propName === 'constructor' || !hooks) {
          return;
        }

        const baseMethod = Handsontable.editors.BaseEditor.prototype[propName];
        CustomEditor.prototype[propName] = function (...args) {
          if (hooks[propName]) {
            return hooks[propName].call(this, ...args);
          } else {
            return baseMethod.call(this, ...args);
          }
        }.bind(this);
      });
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
  }
}

/**
 * Context to provide Handsontable-native custom editor class instance to overridden hooks object.
 */
const EditorContext = React.createContext<React.RefObject<Handsontable.editors.BaseEditor>>(undefined);

interface EditorContextProviderProps {
  classInstanceRef: React.RefObject<Handsontable.editors.BaseEditor>
  children: React.ReactNode
}

/**
 * Provider of the context that exposes Handsontable-native editor instance for custom editor components.
 *
 * @param {React.RefObject} classInstanceRef  Reference to Handsontable-native editor instance.
 */
export const EditorContextProvider: React.FC<EditorContextProviderProps> = ({ classInstanceRef, children }) => {
  return <EditorContext.Provider value={classInstanceRef}>
    {children}
  </EditorContext.Provider>
}

/**
 * Helper function that wraps React.ForwardRef for ease of creating custom component-based editors.
 *
 * @param {Function} render The editor component function.
 */
export function hotEditor<P>(render: React.ForwardRefRenderFunction<HotEditorHooks, P>) {
  return React.forwardRef<HotEditorHooks, P>(render);
}

/**
 * Hook that allows encapsulating custom behaviours of component-based editor by customizing passed ref with overridden hooks object.
 *
 * @param {React.Ref} ref Reference for component-based editor overridden hooks object.
 * @param {Function} overriddenHooks Function that provides the overrides specific for the custom editor.
 *  It gets an object that emulates super calls to BaseEditor methods, if needed.
 * @param {React.DependencyList} deps Overridden hooks object React dependency list.
 * @returns {React.RefObject} Reference to Handsontable-native editor instance.
 */
export function useHotEditorHooks(ref: React.Ref<HotEditorHooks>, overriddenHooks?: (superBoundEditorInstanceProvider: () => Handsontable.editors.BaseEditor) => HotEditorHooks, deps?: React.DependencyList): React.RefObject<Handsontable.editors.BaseEditor> {
  const hotCustomEditorInstanceRef = React.useContext(EditorContext);
  const superBoundEditorInstance = () => superBound(hotCustomEditorInstanceRef.current);
  React.useImperativeHandle(ref, () => overriddenHooks?.(superBoundEditorInstance) || {}, deps);
  return hotCustomEditorInstanceRef;
}
