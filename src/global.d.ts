// Add type definitions for globals provided by SillyTavern
// This file must be a module for the declare global block below to be a
// valid global augmentation; without the export, TypeScript rejected it
// (TS2669) and every SillyTavern and toastr reference failed to resolve.
export {};

// I wrote these declarations by hand against the parts of the
// SillyTavern context this extension actually touches. They are a
// floor, not the real API: a method I have not used is not declared,
// and registerFunctionTool takes unknown because the real signature
// expects a tool shape defined inside SillyTavern, which this project
// cannot import.
interface SillyTavernContext {
    getContext: () => {
        t: (str: TemplateStringsArray | string) => string;
        saveSettingsDebounced: () => void;
        extensionSettings: object;
        registerFunctionTool: (tool: unknown) => void;
        unregisterFunctionTool: (name: string) => void;
        setExtensionPrompt: (id: string, text: string, position: number, depth: number, scan?: boolean, role?: number) => void;
        substituteParamsExtended: (template: string, params: Record<string, string>) => string;
    };
}

interface ToastrOptions {
    timeOut?: number;
}

interface Toastr {
    error: (message: string, title?: string, options?: ToastrOptions) => void;
    success: (message: string, title?: string, options?: ToastrOptions) => void;
    warning: (message: string, title?: string, options?: ToastrOptions) => void;
    info: (message: string, title?: string, options?: ToastrOptions) => void;
}

declare global {
    const SillyTavern: SillyTavernContext;
    const toastr: Toastr;
}
