/**
 * Pre-defined launch profiles for different robot environments.
 * ROS 1 (Noetic) version.
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
    simulation: {
        label: "Simulation (Nav)",
        description: "Launch Gazebo simulation with navigation stack",
        command: [
            "cd ~/Documents/robodog-sim",
            "source devel/setup.bash",
            "roslaunch champ_config gazebo.launch &",
            "sleep 5",
            "roslaunch champ_config navigate.launch",
        ].join("\n"),
        // killCommand: "(pkill -f 'champ_config' 2>/dev/null; pkill -f 'gazebo' 2>/dev/null; pkill -f 'move_base' 2>/dev/null; pkill -f 'navigate.launch' 2>/dev/null) || true",
        killCommand: "",

    },

    slam: {
        label: "Simulation (SLAM)",
        description: "Launch Gazebo simulation with SLAM mapping",
        command: [
            "cd ~/Documents/robodog-sim",
            "source devel/setup.bash",
            "roslaunch champ_config gazebo.launch &",
            "sleep 5",
            "roslaunch champ_config slam.launch",
        ].join("\n"),
        // killCommand: "(pkill -f 'champ_config' 2>/dev/null; pkill -f 'gazebo' 2>/dev/null; pkill -f 'slam.launch' 2>/dev/null) || true",
        killCommand: "",

    },

    realRobot: {
        label: "Real Robot",
        description: "SSH into the physical robot and start ROS nodes",
        background: true,
        rosbridgeUrl: "ws://10.7.101.231:9090",
        command: [
            // "sshpass -p \"'\" ssh -f -n -o StrictHostKeyChecking=no ysc@10.7.101.231 './start_ano.sh'",
        ].join("\n"),
        killCommand: [
            // "sshpass -p \"'\" ssh -o StrictHostKeyChecking=no ysc@10.7.101.231 'bash -lc \"./stop_ano.sh\"' || true",
        ].join("; "),
    },
};

/** Default profile key */
export const DEFAULT_PROFILE = "simulation";

/** Get list of profile entries for UI dropdowns */
export const getProfileList = () =>
    Object.entries(LAUNCH_PROFILES).map(([key, profile]) => ({
        key,
        ...profile,
    }));

/** Get the default launch command string */
export const getDefaultLaunchCommand = () =>
    LAUNCH_PROFILES[DEFAULT_PROFILE].command;
