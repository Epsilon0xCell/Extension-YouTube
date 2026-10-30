// Add type definitions for globals provided by SillyTavern
// This file must be a module for the declare global block below to be a
// valid global augmentation; without the export, TypeScript rejected it
// (TS2669) and every SillyTavern and toastr reference failed to resolve.
export {};

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
