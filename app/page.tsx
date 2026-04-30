"use client";

/**
 * Root page — acts as a client-side router.
 * Wraps everything with QueryProvider (React Query) and AppProvider (UI state).
 * Renders the persistent Sidebar, TelemetryBar, and the currently active page.
 *
 * Page index mapping (must match Sidebar tab order):
 *   0 = Inspection Hub
 *   1 = SLAM Mapping
 *   2 = Spatial Explorer
 *   3 = Objects
 *   4 = SOP Documents
 *   5 = Captured Gallery
 *   6 = Map Gallery
 *   7 = History
 */

import React from "react";
import { AppProvider, useApp } from "@/app/context/AppContext";
import QueryProvider from "@/app/providers/QueryProvider";
import Sidebar from "@/app/components/Sidebar";
import TelemetryBar from "@/app/components/TelemetryBar";
import InspectionHub from "@/app/components/pages/InspectionHub";
import SlamMapping from "@/app/components/pages/SlamMapping";
import SpatialExplorer from "@/app/components/pages/SpatialExplorer";
import ObjectsManager from "@/app/components/pages/ObjectsManager";
import SOPDocuments from "@/app/components/pages/SOPDocuments";
import CapturedGallery from "@/app/components/pages/CapturedGallery";
import MapGallery from "@/app/components/pages/MapGallery";
import SessionHistory from "@/app/components/pages/SessionHistory";

/** Map page index to component — must match Sidebar tab order */
const pages = [
  InspectionHub,
  SlamMapping,
  SpatialExplorer,
  ObjectsManager,
  SOPDocuments,
  CapturedGallery,
  MapGallery,
  SessionHistory,
];

function Dashboard() {
  const { activePage } = useApp();
  const ActivePage = pages[activePage] ?? InspectionHub;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left sidebar */}
      <Sidebar />

      {/* Main content area — offset by sidebar width on desktop */}
      <main className="flex flex-col flex-1 lg:ml-[220px] overflow-hidden">
        {/* Telemetry bar */}
        <div className="p-3 pb-0">
          <TelemetryBar />
        </div>

        {/* Active page */}
        <div className="flex-1 p-3 overflow-auto">
          <ActivePage />
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <QueryProvider>
      <AppProvider>
        <Dashboard />
      </AppProvider>
    </QueryProvider>
  );
}
