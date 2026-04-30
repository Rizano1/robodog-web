/**
 * React Query hooks for Captured Gallery management via Supabase Storage.
 * Interacts with the `captured` folder inside the `robotics-prata` storage bucket.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/utils/supabaseClient";

export interface CapturedImage {
    name: string;
    url: string;
    size: number;
    created_at: string;
    type: string;
}

const BUCKET = "robotics-prata";
const FOLDER = "captured";
const QUERY_KEY = ["captured-gallery"] as const;

/** Fetch all images from the captured/ folder in the robotics-prata bucket */
export function useGetCapturedGallery() {
    const supabase = getSupabaseBrowserClient();

    return useQuery<CapturedImage[]>({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const { data, error } = await supabase.storage.from(BUCKET).list(FOLDER, {
                limit: 200,
                sortBy: { column: "created_at", order: "desc" },
            });
            if (error) throw error;

            return (data ?? [])
                .filter((f) => f.name !== ".emptyFolderPlaceholder" && f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i))
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
                        type: file.metadata?.mimetype ?? "image/jpeg",
                    };
                });
        },
    });
}

/** Delete an image from the captured/ folder in the robotics-prata bucket */
export function useDeleteCapturedImage() {
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
