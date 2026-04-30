"use client";

/**
 * Recursive tree sidebar for the Spatial Explorer.
 * Renders Maps → Locations hierarchy with expand/collapse.
 */

import React, { useState } from "react";
import { ChevronRight, MapIcon, MapPin, Loader2 } from "lucide-react";
import { useGetMaps } from "@/services/useMaps";
import { useGetAllLocations } from "@/services/useLocations";
import type { MapRecord, Location } from "@/types/database";

export type ExplorerNode =
    | { type: "map"; data: MapRecord }
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
    const { data: maps = [], isLoading: mapsLoading } = useGetMaps();
    const { data: allLocations = [], isLoading: locsLoading } = useGetAllLocations();
    const [expandedMaps, setExpandedMaps] = useState<Set<number>>(new Set());

    const isLoading = mapsLoading || locsLoading;

    const toggleMap = (mapId: number) => {
        setExpandedMaps((prev) => {
            const next = new Set(prev);
            if (next.has(mapId)) next.delete(mapId);
            else next.add(mapId);
            return next;
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-muted" />
            </div>
        );
    }

    if (maps.length === 0) {
        return (
            <div className="px-3 py-6 text-center">
                <MapIcon size={24} className="mx-auto mb-2 text-muted/40" />
                <p className="text-[11px] text-muted">No maps yet</p>
            </div>
        );
    }

    return (
        <div className="py-2 space-y-0.5">
            {maps.map((map) => {
                const isMapSelected =
                    selectedNode?.type === "map" && selectedNode.data.id === map.id;
                const isExpanded = expandedMaps.has(map.id);
                const topLocations = allLocations.filter(
                    (l) => l.map_id === map.id && l.parent_id === null,
                );
                const hasChildren = topLocations.length > 0;

                return (
                    <div key={map.id}>
                        <button
                            onClick={() => {
                                onSelect({ type: "map", data: map });
                                toggleMap(map.id);
                            }}
                            className={`
                                w-full flex items-center gap-1.5 px-3 py-2 text-[12px] rounded-lg transition-colors
                                ${isMapSelected
                                    ? "bg-accent/15 text-accent font-medium"
                                    : "text-foreground/80 hover:text-foreground hover:bg-surface-hover"
                                }
                            `}
                        >
                            {hasChildren ? (
                                <ChevronRight
                                    size={12}
                                    className={`shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                />
                            ) : (
                                <span className="w-3 shrink-0" />
                            )}
                            <MapIcon size={14} className="shrink-0 text-accent/60" />
                            <span className="truncate font-medium">{map.name}</span>
                        </button>

                        {isExpanded && (
                            <div>
                                {topLocations.map((loc) => (
                                    <LocationTreeNode
                                        key={loc.id}
                                        location={loc}
                                        allLocations={allLocations}
                                        selectedNode={selectedNode}
                                        onSelect={onSelect}
                                        depth={1}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
