import React from 'react';
import { Sparkles } from 'lucide-react';

export function StarryFooter() {
    return (
        <footer className="relative flex justify-center py-12 overflow-hidden">
            <div className="group relative px-8 py-3 bg-slate-900/5 hover:bg-slate-900/10 transition-all duration-500 rounded-full backdrop-blur-sm border border-white/20 shadow-xl overflow-hidden">

                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <div className="relative flex items-center gap-3">
                    {/* Left Star */}
                    <Sparkles className="w-4 h-4 text-yellow-500 animate-[spin_3s_linear_infinite] opacity-70" />

                    <p className="text-base font-medium bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:from-indigo-500 group-hover:via-purple-500 group-hover:to-pink-500 transition-all duration-300">
                        Made by <span className="font-bold">Aditya</span>
                    </p>

                    {/* Right Star */}
                    <Sparkles className="w-4 h-4 text-yellow-500 animate-[spin_3s_linear_infinite_reverse] opacity-70" />
                </div>

                {/* Floating particles/stars */}
                <div className="absolute -top-1 left-1/4 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100" />
                <div className="absolute bottom-1 right-1/4 w-1 h-1 bg-purple-400 rounded-full animate-ping opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-300" />
            </div>
        </footer>
    );
}
