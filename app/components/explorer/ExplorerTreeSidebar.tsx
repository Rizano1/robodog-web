"use client";

/**
 * Recursive tree sidebar for the Spatial Explorer.
 * Renders Maps → Locations hierarchy with expand/collapse.
 */

import React, { useState } from "react";
import { ChevronRight, MapIcon, MapPin, Loader2 } from "lucide-react";
import { useGetAllLocations } from "@/services/useLocations";
import type { Location } from "@/types/database";

export type ExplorerNode =
    | { type: "location"; data: Location };

interface ExplorerTreeSidebarProps {
    selectedNode: ExplorerNode | null;
    onSelect: (node: ExplorerNode) => void;
}

/** Recursive location tree node */
function LocationTreeNode({
    location,
    allLocations,
    selectedNode,
    onSelect,
    depth,
}: {
    location: Location;
    allLocations: Location[];
    selectedNode: ExplorerNode | null;
    onSelect: (node: ExplorerNode) => void;
    depth: number;
}) {
    const [expanded, setExpanded] = useState(false);
    const children = allLocations.filter((l) => l.parent_id === location.id);
    const hasChildren = children.length > 0;
    const isSelected =
        selectedNode?.type === "location" && selectedNode.data.id === location.id;

    return (
        <div>
            <button
                onClick={() => {
                    onSelect({ type: "location", data: location });
                    if (hasChildren) setExpanded(!expanded);
                }}
                className={`
                    w-full flex items-center gap-1.5 py-1.5 pr-2 text-[12px] rounded-lg transition-colors
                    ${isSelected
                        ? "bg-accent/15 text-accent font-medium"
                        : "text-muted hover:text-foreground hover:bg-surface-hover"
                    }
                `}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
            >
                {hasChildren ? (
                    <ChevronRight
                        size={12}
                        className={`shrink-0 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
                    />
                ) : (
                    <span className="w-3 shrink-0" />
                )}
                <MapPin size={13} className="shrink-0 opacity-60" />
                <span className="truncate">{location.name}</span>
                {location.map_id && (
                    <MapIcon size={12} className="shrink-0 text-accent/60 ml-1" />
                )}
                {location.type && (
                    <span className="ml-auto text-[9px] text-muted/60 font-mono shrink-0">
                        {location.type}
                    </span>
                )}
            </button>

            {expanded && hasChildren && (
                <div>
                    {children.map((child) => (
                        <LocationTreeNode
                            key={child.id}
                            location={child}
                            allLocations={allLocations}
                            selectedNode={selectedNode}
                            onSelect={onSelect}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ExplorerTreeSidebar({ selectedNode, onSelect }: ExplorerTreeSidebarProps) {
    const { data: allLocations = [], isLoading: locsLoading } = useGetAllLocations();

    if (locsLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-muted" />
            </div>
        );
    }

    const rootLocations = allLocations.filter((l) => l.parent_id === null);

    if (rootLocations.length === 0) {
        return (
            <div className="px-3 py-6 text-center">
                <MapPin size={24} className="mx-auto mb-2 text-muted/40" />
                <p className="text-[11px] text-muted">No locations yet</p>
            </div>
        );
    }

    return (
        <div className="py-2 space-y-0.5">
            {rootLocations.map((loc) => (
                <LocationTreeNode
                    key={loc.id}
                    location={loc}
                    allLocations={allLocations}
                    selectedNode={selectedNode}
                    onSelect={onSelect}
                    depth={0}
                />
            ))}
        </div>
    );
}
