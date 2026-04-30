/**
 * React Query hooks for CRUD operations on the `maps` table.
 * This is for the DB-level map metadata (not Supabase Storage map files).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/utils/supabaseClient";
import type {
    MapRecord,
    MapRecordInsert,
    MapRecordUpdate,
} from "@/types/database";

const QUERY_KEY = ["maps"] as const;

/** Fetch all maps ordered by creation date */
export function useGetMaps() {
    const supabase = getSupabaseBrowserClient();

    return useQuery<MapRecord[]>({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("maps")
                .select("*")
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as MapRecord[];
        },
    });
}

/** Create a new map */
export function useCreateMap() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: MapRecordInsert) => {
            const { data, error } = await supabase
                .from("maps")
                .insert(payload)
                .select()
                .single();

            if (error) throw error;
            return data as MapRecord;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}

/** Update an existing map by ID */
export function useUpdateMap() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            updates,
        }: {
            id: number;
            updates: MapRecordUpdate;
        }) => {
            const { data, error } = await supabase
                .from("maps")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as MapRecord;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}

/** Delete a map by ID */
export function useDeleteMap() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase
                .from("maps")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}
