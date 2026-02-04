'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Building2, User, Layers } from 'lucide-react';

export type FocusMode = 'all' | 'company' | 'personal';

interface FocusToggleProps {
    value: FocusMode;
    onChange: (value: FocusMode) => void;
}

export function FocusToggle({ value, onChange }: FocusToggleProps) {
    return (
        <div className="flex items-center p-1 bg-muted/50 rounded-full border shadow-sm">
            <ToggleItem
                isActive={value === 'all'}
                onClick={() => onChange('all')}
                icon={<Layers className="w-4 h-4" />}
                label="Todo"
            />
            <ToggleItem
                isActive={value === 'company'}
                onClick={() => onChange('company')}
                icon={<Building2 className="w-4 h-4" />}
                label="Empresa"
            />
            <ToggleItem
                isActive={value === 'personal'}
                onClick={() => onChange('personal')}
                icon={<User className="w-4 h-4" />}
                label="Personal"
            />
        </div>
    );
}

function ToggleItem({
    isActive,
    onClick,
    icon,
    label,
}: {
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'relative flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-colors z-10',
                isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
        >
            {isActive && (
                <motion.div
                    layoutId="focus-toggle-bubble"
                    className="absolute inset-0 bg-primary rounded-full -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
            )}
            <span className="relative z-10 flex items-center gap-2">
                {icon}
                {label}
            </span>
        </button>
    );
}
