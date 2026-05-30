import React from 'react';
import { Sparkles } from 'lucide-react';

export function StarryFooter() {
    return (
        <footer className="relative flex justify-center py-12 overflow-hidden">
            <div className="group relative px-10 py-4 bg-tertiary border-2 border-border shadow-pop hover:-rotate-2 hover:scale-105 transition-all duration-300 rounded-full overflow-visible">

                <div className="relative flex items-center gap-4">
                    {/* Left Star */}
                    <Sparkles className="w-6 h-6 text-white animate-pulse" strokeWidth={2.5} />

                    <p className="text-xl font-heading font-extrabold text-foreground uppercase tracking-wider">
                        Made by <span className="text-white bg-accent px-3 py-1 rounded-full border-2 border-border shadow-pop-soft -rotate-3 inline-block">Divyanshi</span>
                    </p>

                    {/* Right Star */}
                    <Sparkles className="w-6 h-6 text-white animate-pulse delay-150" strokeWidth={2.5} />
                </div>
                
                {/* Decorative floating dots */}
                <div className="absolute -top-4 -left-2 w-4 h-4 bg-secondary rounded-full border-2 border-border animate-bounce" />
                <div className="absolute -bottom-2 -right-4 w-6 h-6 bg-quaternary rounded-full border-2 border-border animate-bounce delay-300" />
            </div>
        </footer>
    );
}
