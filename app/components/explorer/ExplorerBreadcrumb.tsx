"use client";

/**
 * Breadcrumb navigation for the Spatial Explorer.
 * Shows the full path: Maps > [Map Name] > [Location] > [Sub-location] …
 * Each segment is clickable to navigate back.
 */

import React from "react";
import { ChevronRight, MapPin } from "lucide-react";
import type { ExplorerNode } from "./ExplorerTreeSidebar";
import type { Location } from "@/types/database";

interface ExplorerBreadcrumbProps {
    selectedNode: ExplorerNode | null;
    allLocations: Location[];
    onNavigate: (node: ExplorerNode | null) => void;
}

export default function ExplorerBreadcrumb({
    selectedNode,
    allLocations,
    onNavigate,
}: ExplorerBreadcrumbProps) {
    /** Build breadcrumb segments from leaf to root */
    const buildCrumbs = (): Array<{ label: string; node: ExplorerNode | null; icon: "location" | "home" }> => {
        const crumbs: Array<{ label: string; node: ExplorerNode | null; icon: "location" | "home" }> = [
            { label: "Explorer", node: null, icon: "home" },
        ];

        if (!selectedNode) return crumbs;

        // For a location, walk up the parent chain
        const location = selectedNode.data as Location;
        const locationChain: Location[] = [];
        let current: Location | undefined = location;

        while (current) {
            locationChain.unshift(current);
            current = allLocations.find((l) => l.id === current!.parent_id);
        }

        // Add each location in the chain
        for (const loc of locationChain) {
            crumbs.push({
                label: loc.name,
                node: { type: "location", data: loc },
                icon: "location",
            });
        }

        return crumbs;
    };

    const crumbs = buildCrumbs();

    return (
        <nav className="flex items-center gap-1 text-xs overflow-x-auto">
            {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;

                return (
                    <React.Fragment key={i}>
                        {i > 0 && (
                            <ChevronRight size={12} className="text-muted/40 shrink-0" />
                        )}
                        <button
                            onClick={() => onNavigate(crumb.node)}
                            disabled={isLast}
                            className={`
                                flex items-center gap-1 px-1.5 py-1 rounded-md whitespace-nowrap transition-colors
                                ${isLast
                                    ? "text-foreground font-medium cursor-default"
                                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                                }
                            `}
                        >
                            {crumb.icon === "location" && <MapPin size={12} className="shrink-0 opacity-60" />}
                            {crumb.label}
                        </button>
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
