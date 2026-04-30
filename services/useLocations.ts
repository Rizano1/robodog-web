/**
 * React Query hooks for CRUD operations on the `locations` table.
 * Supports the self-referential hierarchy (parent_id → locations.id).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/utils/supabaseClient";
import type {
    Location,
    LocationInsert,
    LocationUpdate,
} from "@/types/database";

const QUERY_KEY = ["locations"] as const;

/** Fetch ALL locations (used by the tree sidebar to build the full tree) */
export function useGetAllLocations() {
    const supabase = getSupabaseBrowserClient();

    return useQuery<Location[]>({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("locations")
                .select("*")
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as Location[];
        },
    });
}

/** Fetch top-level locations for a specific map (parent_id is null) */
export function useGetLocationsByMap(mapId: number | null) {
    const supabase = getSupabaseBrowserClient();

    return useQuery<Location[]>({
        queryKey: [...QUERY_KEY, "by-map", mapId],
        enabled: mapId !== null,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("locations")
                .select("*")
                .eq("map_id", mapId!)
                .is("parent_id", null)
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as Location[];
        },
    });
}

/** Fetch child locations under a specific parent location */
export function useGetSubLocations(parentId: number | null) {
    const supabase = getSupabaseBrowserClient();

    return useQuery<Location[]>({
        queryKey: [...QUERY_KEY, "children", parentId],
        enabled: parentId !== null,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("locations")
                .select("*")
                .eq("parent_id", parentId!)
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as Location[];
        },
    });
}

/** Create a new location */
export function useCreateLocation() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: LocationInsert) => {
            const { data, error } = await supabase
                .from("locations")
                .insert(payload)
                .select()
                .single();

            if (error) throw error;
            return data as Location;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}

/** Update an existing location by ID */
export function useUpdateLocation() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            updates,
        }: {
            id: number;
            updates: LocationUpdate;
        }) => {
            const { data, error } = await supabase
                .from("locations")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as Location;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}

/** Delete a location by ID */
export function useDeleteLocation() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase
                .from("locations")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}
