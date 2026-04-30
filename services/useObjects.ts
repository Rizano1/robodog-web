/**
 * React Query hooks for CRUD operations on the `objects` table.
 * All mutations invalidate the "objects" query key on success.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/utils/supabaseClient";
import type {
    ObjectRecord,
    ObjectRecordInsert,
    ObjectRecordUpdate,
} from "@/types/database";

const QUERY_KEY = ["objects"] as const;

/** Fetch all objects ordered by creation date */
export function useGetObjects() {
    const supabase = getSupabaseBrowserClient();

    return useQuery<ObjectRecord[]>({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("objects")
                .select("*")
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as ObjectRecord[];
        },
    });
}

/** Create a new object */
export function useCreateObject() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ObjectRecordInsert) => {
            const { data, error } = await supabase
                .from("objects")
                .insert(payload)
                .select()
                .single();

            if (error) throw error;
            return data as ObjectRecord;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}

/** Update an existing object by ID */
export function useUpdateObject() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            updates,
        }: {
            id: number;
            updates: ObjectRecordUpdate;
        }) => {
            const { data, error } = await supabase
                .from("objects")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as ObjectRecord;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}

/** Delete an object by ID */
export function useDeleteObject() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase
                .from("objects")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}
