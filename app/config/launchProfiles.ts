/**
 * Pre-defined launch profiles for the robot environment.
 * ROS 1 (Noetic) version — on-robot branch (no simulation).
 *
 * In the web app, shell commands are executed via the Next.js API route
 * `/api/shell` (Node.js server-side), replicating Electron's IPC mechanism.
 */

export interface LaunchProfile {
    label: string;
    /** Shell command to start this profile */
    command: string;
    /** Shell command to kill all processes from this profile */
    killCommand: string;
    /** If true, run command in the background without waiting for completion */
    background?: boolean;
    /** rosbridge URL override (if different from .env default) */
    rosbridgeUrl?: string;
    /** Descriptive text for the UI */
    description: string;
}

export const LAUNCH_PROFILES: Record<string, LaunchProfile> = {
    realRobot: {
        label: "Real Robot",
        description: "Start ROS nodes on the physical robot",
        background: true,
        command: [
            "bash ~/start_nav.sh"
        ].join("\n"),
        killCommand: [
            "bash ~/stop_nav.sh"
        ].join("; "),
    },

    slam: {
        label: "SLAM Mapping",
        description: "Launch SLAM mapping on the real robot",
        background: true,
        command: [
            // "bash ~/start_ano.sh"
        ].join("\n"),
        killCommand: [
            // "bash ~/stop_ano.sh"
        ].join("; "),
    },
};

/** Default profile key */
export const DEFAULT_PROFILE = "realRobot";

/** Get list of profile entries for UI dropdowns */
export const getProfileList = () =>
    Object.entries(LAUNCH_PROFILES).map(([key, profile]) => ({
        key,
        ...profile,
    }));

/** Get the default launch command string */
export const getDefaultLaunchCommand = () =>
    LAUNCH_PROFILES[DEFAULT_PROFILE].command;
