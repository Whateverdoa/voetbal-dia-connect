"use client";

import { useMutation } from "convex/react";
import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface PlayerPhotoUploadProps {
  playerId: Id<"players">;
  photoUrl?: string | null;
  onDone?: (message: string) => void;
}

export function PlayerPhotoUpload({
  playerId,
  photoUrl,
  onDone,
}: PlayerPhotoUploadProps) {
  const generateUploadUrl = useMutation(api.playerPhotos.generateUploadUrl);
  const setPlayerPhoto = useMutation(api.playerPhotos.setPlayerPhoto);
  const clearPlayerPhoto = useMutation(api.playerPhotos.clearPlayerPhoto);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const postUrl = await generateUploadUrl({});
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Upload mislukt");
      const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
      await setPlayerPhoto({ playerId, storageId });
      onDone?.("Foto opgeslagen");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload mislukt";
      onDone?.(`Fout: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className="w-8 h-8 rounded-full object-cover border"
        />
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        title="Foto uploaden"
        onClick={() => inputRef.current?.click()}
        className="p-2 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-50"
      >
        <ImagePlus size={18} />
      </button>
      {photoUrl ? (
        <button
          type="button"
          disabled={busy}
          title="Foto verwijderen"
          onClick={async () => {
            setBusy(true);
            try {
              await clearPlayerPhoto({ playerId });
              onDone?.("Foto verwijderd");
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Verwijderen mislukt";
              onDone?.(`Fout: ${message}`);
            } finally {
              setBusy(false);
            }
          }}
          className="p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
        >
          <Trash2 size={18} />
        </button>
      ) : null}
    </div>
  );
}
