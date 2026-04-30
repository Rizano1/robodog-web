/**
 * React Query hooks for Map Gallery management via Supabase Storage.
 * Interacts with the `map` folder inside the `robotics-prata` storage bucket.
 * Maps come in pairs: .pgm (image) + .yaml (metadata).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/utils/supabaseClient";

export interface SavedMap {
    /** Base name without extension (e.g. "office_floor1") */
    name: string;
    /** Public URL for the .pgm file */
    pgmUrl: string;
    /** Public URL for the .yaml file */
    yamlUrl: string;
    /** File size of the .pgm in bytes */
    size: number;
    /** ISO timestamp of when the map was saved */
    created_at: string;
    /** Whether both .pgm and .yaml exist */
    hasYaml: boolean;
}

const BUCKET = "robotics-prata";
const FOLDER = "map";
const QUERY_KEY = ["map-gallery"] as const;

/** Fetch all map files from the map/ folder, group by base name */
export function useGetSavedMaps() {
    const supabase = getSupabaseBrowserClient();

    return useQuery<SavedMap[]>({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const { data, error } = await supabase.storage.from(BUCKET).list(FOLDER, {
                limit: 200,
                sortBy: { column: "created_at", order: "desc" },
            });
            if (error) throw error;

            // Group files by base name (strip extension)
            const fileMap = new Map<string, {
                pgm?: typeof data[0];
                yaml?: typeof data[0];
            }>();

            for (const file of (data ?? [])) {
                if (file.name === ".emptyFolderPlaceholder") continue;

                const baseName = file.name.replace(/\.(pgm|yaml|yml)$/i, "");
                const ext = file.name.split(".").pop()?.toLowerCase();

                if (!fileMap.has(baseName)) {
                    fileMap.set(baseName, {});
                }
                const entry = fileMap.get(baseName)!;

                if (ext === "pgm") entry.pgm = file;
                else if (ext === "yaml" || ext === "yml") entry.yaml = file;
            }

            // Convert to SavedMap array — only include entries with at least a .pgm
            const maps: SavedMap[] = [];
            for (const [baseName, files] of fileMap.entries()) {
                if (!files.pgm) continue;

                const pgmPath = `${FOLDER}/${files.pgm.name}`;
                const { data: pgmUrlData } = supabase.storage
                    .from(BUCKET)
                    .getPublicUrl(pgmPath);

                let yamlUrl = "";
                if (files.yaml) {
                    const yamlPath = `${FOLDER}/${files.yaml.name}`;
                    const { data: yamlUrlData } = supabase.storage
                        .from(BUCKET)
                        .getPublicUrl(yamlPath);
                    yamlUrl = yamlUrlData.publicUrl;
                }

                maps.push({
                    name: baseName,
                    pgmUrl: pgmUrlData.publicUrl,
                    yamlUrl,
                    size: files.pgm.metadata?.size ?? 0,
                    created_at: files.pgm.created_at ?? "",
                    hasYaml: !!files.yaml,
                });
            }

            return maps;
        },
    });
}

/** Delete a saved map (both .pgm and .yaml) */
export function useDeleteSavedMap() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (baseName: string) => {
            // Try to delete both files
            const filesToDelete = [
                `${FOLDER}/${baseName}.pgm`,
                `${FOLDER}/${baseName}.yaml`,
            ];

            const { error } = await supabase.storage
                .from(BUCKET)
                .remove(filesToDelete);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}
