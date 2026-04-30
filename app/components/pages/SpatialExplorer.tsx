"use client";

/**
 * Spatial Explorer page — Tree sidebar + dynamic content.
 * Maps → Locations → Sub-locations → Object Waypoints hierarchy.
 */

import React, { useState } from "react";
import { Compass } from "lucide-react";
import ExplorerTreeSidebar, { type ExplorerNode } from "@/app/components/explorer/ExplorerTreeSidebar";
import ExplorerBreadcrumb from "@/app/components/explorer/ExplorerBreadcrumb";
import ExplorerMainContent from "@/app/components/explorer/ExplorerMainContent";
import { useGetMaps } from "@/services/useMaps";
import { useGetAllLocations } from "@/services/useLocations";

export default function SpatialExplorer() {
    const [selectedNode, setSelectedNode] = useState<ExplorerNode | null>(null);
    const { data: allMaps = [] } = useGetMaps();
    const { data: allLocations = [] } = useGetAllLocations();

    const handleNavigate = (node: ExplorerNode | null) => {
        setSelectedNode(node);
    };

    return (
        <div className="h-full flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Compass size={20} className="text-accent" />
                <h2 className="text-lg font-semibold text-foreground">Spatial Explorer</h2>
            </div>

            {/* Breadcrumb */}
            <ExplorerBreadcrumb
                selectedNode={selectedNode}
                allLocations={allLocations}
                allMaps={allMaps}
                onNavigate={handleNavigate}
            />

            {/* Two-panel layout: sidebar + content */}
            <div className="flex-1 flex gap-3 min-h-0">
                {/* Tree sidebar */}
                <div className="w-[260px] shrink-0 glass-panel overflow-y-auto">
                    <ExplorerTreeSidebar
                        selectedNode={selectedNode}
                        onSelect={setSelectedNode}
                    />
                </div>

                {/* Main content */}
                <div className="flex-1 glass-panel p-4 overflow-auto">
                    <ExplorerMainContent
                        selectedNode={selectedNode}
                        onNavigate={(node) => setSelectedNode(node)}
                    />
                </div>
            </div>
        </div>
    );
}
