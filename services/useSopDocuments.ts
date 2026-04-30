/**
 * React Query hooks for SOP document management via Supabase Storage.
 * Interacts with the `sop` folder inside the `robotic-prata` storage bucket.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/utils/supabaseClient";
import type { SopDocument } from "@/types/database";

const BUCKET = "robotics-prata";
const FOLDER = "sop";
const QUERY_KEY = ["sop-documents"] as const;

/** Fetch all files from the sop/ folder in the robotic-prata bucket */
export function useGetSopDocuments() {
    const supabase = getSupabaseBrowserClient();

    return useQuery<SopDocument[]>({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const { data, error } = await supabase.storage.from(BUCKET).list(FOLDER, {
                limit: 200,
                sortBy: { column: "created_at", order: "desc" },
            });
            console.log(data);
            if (error) throw error;

            // Map Supabase FileObject to our SopDocument interface
            return (data ?? [])
                .filter((f) => f.name !== ".emptyFolderPlaceholder")
                .map((file) => {
                    const filePath = `${FOLDER}/${file.name}`;
                    const { data: urlData } = supabase.storage
                        .from(BUCKET)
                        .getPublicUrl(filePath);

                    return {
                        name: file.name,
                        url: urlData.publicUrl,
                        size: file.metadata?.size ?? 0,
                        created_at: file.created_at ?? "",
                        type: file.metadata?.mimetype ?? "application/octet-stream",
                    } satisfies SopDocument;
                });
        },
    });
}

/** Upload a file to the sop/ folder in the robotic-prata bucket */
export function useUploadSopDocument() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (file: File) => {
            // Use a timestamped name to avoid collisions
            const fileName = `${FOLDER}/${Date.now()}_${file.name}`;

            const { error } = await supabase.storage
                .from(BUCKET)
                .upload(fileName, file, {
                    cacheControl: "3600",
                    upsert: false,
                });

            if (error) throw error;
            return fileName;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}

/** Delete a file from the sop/ folder in the robotic-prata bucket */
export function useDeleteSopDocument() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (fileName: string) => {
            const filePath = fileName.startsWith(FOLDER)
                ? fileName
                : `${FOLDER}/${fileName}`;
            const { error } = await supabase.storage
                .from(BUCKET)
                .remove([filePath]);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}

