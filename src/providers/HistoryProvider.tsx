'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface HistoryContextType {
    addToHistory: (label: string, undoFn: () => Promise<void> | void) => void;
    undo: () => Promise<void>;
    canUndo: boolean;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

interface HistoryItem {
    label: string;
    undoFn: () => Promise<void> | void;
    timestamp: number;
}

export function HistoryProvider({ children }: { children: React.ReactNode }) {
    const [historyStack, setHistoryStack] = useState<HistoryItem[]>([]);

    const addToHistory = useCallback((label: string, undoFn: () => Promise<void> | void) => {
        const newItem: HistoryItem = {
            label,
            undoFn,
            timestamp: Date.now(),
        };

        setHistoryStack((prev) => [...prev.slice(-19), newItem]); // Keep last 20 actions

        // Optional: Show immediate "Undo" toast
        // toast.success(label, {
        //     action: {
        //         label: 'Deshacer',
        //         onClick: async () => {
        //             await undoFn();
        //             setHistoryStack((prev) => prev.filter((item) => item !== newItem));
        //             toast.info('Acción deshecha');
        //         },
        //     },
        //     duration: 4000,
        // });
    }, []);

    const undo = useCallback(async () => {
        setHistoryStack((prev) => {
            if (prev.length === 0) return prev;

            const newItemStack = [...prev];
            const itemToUndo = newItemStack.pop();

            if (itemToUndo) {
                // Execute undo function
                // Note: We execute it but we don't await inside the state setter.
                // We should handle async outside, but setter is sync.
                // We'll execute it immediately.
                itemToUndo.undoFn();
                toast.info(`Deshecho: ${itemToUndo.label}`);
            }

            return newItemStack;
        });
    }, []);

    // Global Keyboard Listener (Ctrl+Z)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo]);

    // Derived state for button UI if needed
    const canUndo = historyStack.length > 0;

    return (
        <HistoryContext.Provider value={{ addToHistory, undo, canUndo }}>
            {children}
        </HistoryContext.Provider>
    );
}

export function useHistory() {
    const context = useContext(HistoryContext);
    if (context === undefined) {
        throw new Error('useHistory must be used within a HistoryProvider');
    }
    return context;
}
