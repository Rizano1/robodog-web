"use client";

/**
 * Dynamic main content area for the Spatial Explorer.
 * Renders different views based on what is selected in the tree:
 *   - Nothing selected → Root-level locations table
 *   - Location selected → Sub-locations + Object waypoints tables
 */

import React, { useState } from "react";
import {
    MapPin,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Target,
    ChevronDown,
    MapIcon,
} from "lucide-react";
import type { ExplorerNode } from "./ExplorerTreeSidebar";
import { useGetRootLocations, useGetSubLocations, useDeleteLocation } from "@/services/useLocations";
import { useGetWaypointsByLocation, useDeleteWaypoint } from "@/services/useWaypoints";
import { useGetObjects } from "@/services/useObjects";
import { useGetMaps } from "@/services/useMaps";
import LocationModal from "./LocationModal";
import ObjectWaypointModal from "./ObjectWaypointModal";
import type { Location, ObjectWaypoint } from "@/types/database";

interface ExplorerMainContentProps {
    selectedNode: ExplorerNode | null;
    onNavigate: (node: ExplorerNode) => void;
}

export default function ExplorerMainContent({ selectedNode, onNavigate }: ExplorerMainContentProps) {
    if (selectedNode?.type === "location") {
        return (
            <LocationView
                location={selectedNode.data}
                onNavigate={onNavigate}
            />
        );
    }

    // --- Nothing selected: show root locations ---
    return <RootLocationsView onNavigate={onNavigate} />;
}

/* ═══════════════════════════════════════════════════════
   Root Locations View — shows top-level locations
   ═══════════════════════════════════════════════════════ */

function RootLocationsView({ onNavigate }: { onNavigate: (node: ExplorerNode) => void }) {
    const { data: locations = [], isLoading } = useGetRootLocations();
    const deleteLocation = useDeleteLocation();
    const { data: maps = [] } = useGetMaps();
    const [modal, setModal] = useState<{ open: boolean; editing: Location | null }>({
        open: false,
        editing: null,
    });

    const getMapName = (mapId: number | null) => maps.find((m) => m.id === mapId)?.name;

    return (
        <div className="h-full flex flex-col gap-3">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-accent" />
                    <h3 className="text-sm font-semibold text-foreground">Root Locations</h3>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
                        {locations.length}
                    </span>
                </div>
                <button
                    onClick={() => setModal({ open: true, editing: null })}
                    className="flex items-center gap-1 rounded-lg bg-accent/10 text-accent px-3 py-1.5 text-xs font-medium hover:bg-accent/20 transition-colors"
                >
                    <Plus size={13} />
                    Add Location
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-muted" />
                </div>
            ) : locations.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-xs text-muted">No root locations yet.</p>
                </div>
            ) : (
                <div className="glass-panel-light flex-1 overflow-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className="px-4 py-2.5 font-semibold text-muted">Name</th>
                                <th className="px-4 py-2.5 font-semibold text-muted">Map</th>
                                <th className="px-4 py-2.5 font-semibold text-muted">Type</th>
                                <th className="px-4 py-2.5 font-semibold text-muted">Arrival X</th>
                                <th className="px-4 py-2.5 font-semibold text-muted">Arrival Y</th>
                                <th className="px-4 py-2.5 font-semibold text-muted">Yaw</th>
                                <th className="px-4 py-2.5 font-semibold text-muted"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {locations.map((loc) => (
                                <tr
                                    key={loc.id}
                                    className="border-b border-border/30 hover:bg-surface-hover/50 transition-colors cursor-pointer group"
                                    onClick={() => onNavigate({ type: "location", data: loc })}
                                >
                                    <td className="px-4 py-2.5 font-medium text-foreground">{loc.name}</td>
                                    <td className="px-4 py-2.5">
                                        {loc.map_id && (
                                            <div className="flex items-center gap-1 text-accent">
                                                <MapIcon size={11} />
                                                <span className="text-[10px] font-medium">{getMapName(loc.map_id) || "Map"}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {loc.type && (
                                            <span className="rounded-full bg-surface-active px-2 py-0.5 text-[10px] font-medium text-foreground/70">
                                                {loc.type}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-muted">{loc.arrival_x}</td>
                                    <td className="px-4 py-2.5 font-mono text-muted">{loc.arrival_y}</td>
                                    <td className="px-4 py-2.5 font-mono text-muted">{loc.arrival_yaw}°</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setModal({ open: true, editing: loc });
                                                }}
                                                className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-surface-active transition-colors text-muted hover:text-foreground"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Delete location "${loc.name}"?`)) {
                                                        deleteLocation.mutate(loc.id);
                                                    }
                                                }}
                                                disabled={deleteLocation.isPending}
                                                className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-danger-soft transition-colors text-muted hover:text-danger disabled:opacity-50"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modal.open && (
                <LocationModal
                    editing={modal.editing}
                    defaults={{ parent_id: null }}
                    onClose={() => setModal({ open: false, editing: null })}
                />
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   Location View — shows sub-locations + object waypoints
   ═══════════════════════════════════════════════════════ */

function LocationView({
    location,
    onNavigate,
}: {
    location: Location;
    onNavigate: (node: ExplorerNode) => void;
}) {
    const { data: subLocations = [], isLoading: subLoading } = useGetSubLocations(location.id);
    const { data: waypoints = [], isLoading: wpLoading } = useGetWaypointsByLocation(location.id);
    const { data: objects = [] } = useGetObjects();
    const { data: maps = [] } = useGetMaps();
    const deleteLocation = useDeleteLocation();
    const deleteWaypoint = useDeleteWaypoint();

    const [locModal, setLocModal] = useState<{ open: boolean; editing: Location | null }>({
        open: false,
        editing: null,
    });
    const [wpModal, setWpModal] = useState<{ open: boolean; editing: ObjectWaypoint | null }>({
        open: false,
        editing: null,
    });

    const [subLocCollapsed, setSubLocCollapsed] = useState(false);
    const [wpCollapsed, setWpCollapsed] = useState(false);

    const getObjectName = (objectId: number) => objects.find((o) => o.id === objectId)?.name ?? `#${objectId}`;
    const getMapName = (mapId: number | null) => maps.find((m) => m.id === mapId)?.name;

    return (
        <div className="h-full flex flex-col gap-4 overflow-auto">
            {/* Context Badge if location has map */}
            {location.map_id && (
                <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 text-xs">
                    <MapIcon size={14} className="text-accent" />
                    <span className="text-muted">Associated Map:</span>
                    <span className="font-semibold text-accent">{getMapName(location.map_id) || "Loading..."}</span>
                </div>
            )}

            {/* ── Sub-Locations Section ── */}
            <div>
                <button
                    onClick={() => setSubLocCollapsed(!subLocCollapsed)}
                    className="flex items-center gap-2 mb-2 group"
                >
                    <ChevronDown
                        size={14}
                        className={`text-muted transition-transform ${subLocCollapsed ? "-rotate-90" : ""}`}
                    />
                    <MapPin size={14} className="text-accent" />
                    <h3 className="text-sm font-semibold text-foreground">Sub-Locations</h3>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
                        {subLocations.length}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setLocModal({ open: true, editing: null });
                        }}
                        className="ml-auto flex items-center gap-1 rounded-lg bg-accent/10 text-accent px-2.5 py-1 text-[11px] font-medium hover:bg-accent/20 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Plus size={11} />
                        Add
                    </button>
                </button>

                {!subLocCollapsed && (
                    <>
                        {subLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 size={16} className="animate-spin text-muted" />
                            </div>
                        ) : subLocations.length === 0 ? (
                            <div className="glass-panel-light px-4 py-4 flex items-center justify-between">
                                <p className="text-xs text-muted">No sub-locations</p>
                                <button
                                    onClick={() => setLocModal({ open: true, editing: null })}
                                    className="flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover transition-colors"
                                >
                                    <Plus size={11} />
                                    Add Sub-Location
                                </button>
                            </div>
                        ) : (
                            <div className="glass-panel-light overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-border text-left">
                                            <th className="px-3 py-2 font-semibold text-muted">Name</th>
                                            <th className="px-3 py-2 font-semibold text-muted">Map</th>
                                            <th className="px-3 py-2 font-semibold text-muted">Type</th>
                                            <th className="px-3 py-2 font-semibold text-muted">X</th>
                                            <th className="px-3 py-2 font-semibold text-muted">Y</th>
                                            <th className="px-3 py-2 font-semibold text-muted">Yaw</th>
                                            <th className="px-3 py-2 font-semibold text-muted"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subLocations.map((sub) => (
                                            <tr
                                                key={sub.id}
                                                className="border-b border-border/30 hover:bg-surface-hover/50 transition-colors cursor-pointer group"
                                                onClick={() => onNavigate({ type: "location", data: sub })}
                                            >
                                                <td className="px-3 py-2 font-medium text-foreground">{sub.name}</td>
                                                <td className="px-3 py-2">
                                                    {sub.map_id && (
                                                        <div className="flex items-center gap-1 text-accent">
                                                            <MapIcon size={10} />
                                                            <span className="text-[10px]">{getMapName(sub.map_id) || "Map"}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {sub.type && (
                                                        <span className="rounded-full bg-surface-active px-2 py-0.5 text-[10px] text-foreground/70">
                                                            {sub.type}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 font-mono text-muted">{sub.arrival_x}</td>
                                                <td className="px-3 py-2 font-mono text-muted">{sub.arrival_y}</td>
                                                <td className="px-3 py-2 font-mono text-muted">{sub.arrival_yaw}°</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLocModal({ open: true, editing: sub });
                                                            }}
                                                            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-surface-active transition-colors text-muted hover:text-foreground"
                                                        >
                                                            <Pencil size={11} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm(`Delete "${sub.name}"?`)) {
                                                                    deleteLocation.mutate(sub.id);
                                                                }
                                                            }}
                                                            disabled={deleteLocation.isPending}
                                                            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-danger-soft transition-colors text-muted hover:text-danger disabled:opacity-50"
                                                        >
                                                            <Trash2 size={11} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Object Waypoints Section ── */}
            <div>
                <button
                    onClick={() => setWpCollapsed(!wpCollapsed)}
                    className="flex items-center gap-2 mb-2 group"
                >
                    <ChevronDown
                        size={14}
                        className={`text-muted transition-transform ${wpCollapsed ? "-rotate-90" : ""}`}
                    />
                    <Target size={14} className="text-success" />
                    <h3 className="text-sm font-semibold text-foreground">Object Waypoints</h3>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
                        {waypoints.length}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setWpModal({ open: true, editing: null });
                        }}
                        className="ml-auto flex items-center gap-1 rounded-lg bg-success/10 text-success px-2.5 py-1 text-[11px] font-medium hover:bg-success/20 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Plus size={11} />
                        Add
                    </button>
                </button>

                {!wpCollapsed && (
                    <>
                        {wpLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 size={16} className="animate-spin text-muted" />
                            </div>
                        ) : waypoints.length === 0 ? (
                            <div className="glass-panel-light px-4 py-4 flex items-center justify-between">
                                <p className="text-xs text-muted">No object waypoints</p>
                                <button
                                    onClick={() => setWpModal({ open: true, editing: null })}
                                    className="flex items-center gap-1 text-[11px] text-success hover:text-success/80 transition-colors"
                                >
                                    <Plus size={11} />
                                    Add Object Waypoint
                                </button>
                            </div>
                        ) : (
                            <div className="glass-panel-light overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-border text-left">
                                            <th className="px-3 py-2 font-semibold text-muted">Name</th>
                                            <th className="px-3 py-2 font-semibold text-muted">Object</th>
                                            <th className="px-3 py-2 font-semibold text-muted">Obj X</th>
                                            <th className="px-3 py-2 font-semibold text-muted">Obj Y</th>
                                            <th className="px-3 py-2 font-semibold text-muted">View</th>
                                            <th className="px-3 py-2 font-semibold text-muted">Camera</th>
                                            <th className="px-3 py-2 font-semibold text-muted"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {waypoints.map((wp) => (
                                            <tr
                                                key={wp.id}
                                                className="border-b border-border/30 hover:bg-surface-hover/50 transition-colors group"
                                            >
                                                <td className="px-3 py-2 font-medium text-foreground">{wp.display_name}</td>
                                                <td className="px-3 py-2">
                                                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                                                        {getObjectName(wp.object_id)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 font-mono text-muted">{wp.obj_x}</td>
                                                <td className="px-3 py-2 font-mono text-muted">{wp.obj_y}</td>
                                                <td className="px-3 py-2 font-mono text-muted text-[10px]">
                                                    {wp.view_x}, {wp.view_y}, {wp.view_yaw}°
                                                </td>
                                                <td className="px-3 py-2 font-mono text-muted text-[10px]">
                                                    P:{wp.camera_pan} T:{wp.camera_tilt} Z:{wp.camera_zoom}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setWpModal({ open: true, editing: wp })}
                                                            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-surface-active transition-colors text-muted hover:text-foreground"
                                                        >
                                                            <Pencil size={11} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`Delete waypoint "${wp.display_name}"?`)) {
                                                                    deleteWaypoint.mutate(wp.id);
                                                                }
                                                            }}
                                                            disabled={deleteWaypoint.isPending}
                                                            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-danger-soft transition-colors text-muted hover:text-danger disabled:opacity-50"
                                                        >
                                                            <Trash2 size={11} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            {locModal.open && (
                <LocationModal
                    editing={locModal.editing}
                    defaults={{ parent_id: location.id }}
                    onClose={() => setLocModal({ open: false, editing: null })}
                />
            )}

            {wpModal.open && (
                <ObjectWaypointModal
                    editing={wpModal.editing}
                    defaults={{ parent_id: location.id }}
                    onClose={() => setWpModal({ open: false, editing: null })}
                />
            )}
        </div>
    );
}
