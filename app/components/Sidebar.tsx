"use client";

/**
 * Persistent left sidebar with navigation tabs.
 * Uses GSAP for smooth active-indicator animation.
 * Collapsible on mobile via hamburger toggle.
 */

import React, { useRef, useEffect, useState } from "react";
import { Camera, FileText, Clock, Menu, X, Dog, Image, Map, Scan, Compass, Box } from "lucide-react";
import gsap from "gsap";
import { useApp } from "@/app/context/AppContext";

const tabs = [
    { icon: Camera, label: "Inspection Hub" },
    { icon: Scan, label: "SLAM Mapping" },
    { icon: Compass, label: "Spatial Explorer" },
    { icon: Box, label: "Objects" },
    { icon: FileText, label: "SOP Documents" },
    { icon: Image, label: "Captured Gallery" },
    { icon: Map, label: "Map Gallery" },
    { icon: Clock, label: "History" },
];

export default function Sidebar() {
    const { activePage, setActivePage } = useApp();
    const indicatorRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [mobileOpen, setMobileOpen] = useState(false);

    /** Animate the sliding indicator to the active tab */
    useEffect(() => {
        const target = tabRefs.current[activePage];
        const indicator = indicatorRef.current;
        if (target && indicator) {
            gsap.to(indicator, {
                y: target.offsetTop,
                height: target.offsetHeight,
                duration: 0.35,
                ease: "power3.out",
            });
        }
    }, [activePage]);

    const handleTabClick = (index: number) => {
        setActivePage(index);
        setMobileOpen(false);
    };

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-border lg:hidden transition-colors hover:bg-surface-hover"
                aria-label="Toggle navigation"
            >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Backdrop for mobile */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 z-40 flex h-screen w-[220px] flex-col
          border-r border-border bg-[#111113]/90 backdrop-blur-2xl
          transition-transform duration-300 ease-out
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
            >
                {/* Brand header */}
                <div className="flex items-center gap-3 px-5 py-6 border-b border-border">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent">
                        <Dog size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-foreground leading-tight">RoboDog</h1>
                        <p className="text-[11px] text-muted leading-tight">Inspection AI</p>
                    </div>
                </div>

                {/* Navigation tabs */}
                <nav className="relative flex flex-col gap-1 px-3 py-4 flex-1">
                    {/* Sliding indicator */}
                    <div
                        ref={indicatorRef}
                        className="absolute left-3 right-3 top-0 rounded-xl bg-surface-active pointer-events-none"
                        style={{ height: 44 }}
                    />

                    {tabs.map((tab, i) => (
                        <button
                            key={tab.label}
                            ref={(el) => { tabRefs.current[i] = el; }}
                            onClick={() => handleTabClick(i)}
                            className={`
                relative z-10 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-colors duration-200
                ${activePage === i ? "text-foreground" : "text-muted hover:text-foreground/70"}
              `}
                        >
                            <tab.icon size={18} strokeWidth={1.8} />
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-border">
                    <p className="text-[11px] text-muted">v0.1.0 — Web</p>
                </div>
            </aside>
        </>
    );
}
