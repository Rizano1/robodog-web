/**
 * React Query hooks for CRUD operations on the `object-waypoints` table.
 * Updated for new schema: object_id (FK→objects), parent_id (FK→locations).
 * All mutations invalidate the "waypoints" query key on success.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/utils/supabaseClient";
import type {
    ObjectWaypoint,
    ObjectWaypointInsert,
    ObjectWaypointUpdate,
} from "@/types/database";

const QUERY_KEY = ["waypoints"] as const;

/** Fetch all waypoints ordered by creation date */
export function useGetWaypoints() {
    const supabase = getSupabaseBrowserClient();

    return useQuery<ObjectWaypoint[]>({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("object-waypoints")
                .select("*")
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as ObjectWaypoint[];
        },
    });
}

/** Fetch waypoints for a specific location (parent_id = locationId) */
export function useGetWaypointsByLocation(locationId: number | null) {
    const supabase = getSupabaseBrowserClient();

    return useQuery<ObjectWaypoint[]>({
        queryKey: [...QUERY_KEY, "by-location", locationId],
        enabled: locationId !== null,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("object-waypoints")
                .select("*")
                .eq("parent_id", locationId!)
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as ObjectWaypoint[];
        },
    });
}

/** Create a new waypoint */
export function useCreateWaypoint() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ObjectWaypointInsert) => {
            const { data, error } = await supabase
                .from("object-waypoints")
                .insert(payload)
                .select()
                .single();

            if (error) throw error;
            return data as ObjectWaypoint;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}

/** Update an existing waypoint by ID */
export function useUpdateWaypoint() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            updates,
        }: {
            id: number;
            updates: ObjectWaypointUpdate;
        }) => {
            const { data, error } = await supabase
                .from("object-waypoints")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as ObjectWaypoint;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}

/** Delete a waypoint by ID */
export function useDeleteWaypoint() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase
                .from("object-waypoints")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}
