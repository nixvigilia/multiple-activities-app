"use client";

import {useEffect, useState, useTransition, useRef} from "react";
import {useOptimistic} from "react";
import {
  uploadPhoto,
  updatePhoto,
  deletePhoto,
  getPhotos,
  type Photo,
} from "@/app/actions/photos";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card} from "@/components/ui/card";
import {toast} from "sonner";
import {
  Upload,
  Trash2,
  Edit,
  X,
  Check,
  Search,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";

type PhotoListProps = {
  initialPhotos: Photo[];
};

type SortOption = "name" | "created_at";
type SortOrder = "asc" | "desc";

export function PhotoGallery({initialPhotos}: PhotoListProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Optimistic updates for better UX
  const [optimisticPhotos, setOptimisticPhotos] = useOptimistic(
    photos,
    (currentPhotos, action: {type: string; photo?: Photo; id?: string}) => {
      switch (action.type) {
        case "add":
          if (!action.photo) return currentPhotos;
          // Check if photo already exists to prevent duplicates
          const exists = currentPhotos.some((p) => p.id === action.photo!.id);
          return exists ? currentPhotos : [action.photo, ...currentPhotos];
        case "delete":
          return currentPhotos.filter((photo) => photo.id !== action.id);
        case "update":
          return currentPhotos.map((photo) =>
            photo.id === action.id && action.photo ? action.photo : photo
          );
        default:
          return currentPhotos;
      }
    }
  );

  async function loadPhotos() {
    try {
      const result = await getPhotos(
        searchQuery || undefined,
        sortBy,
        sortOrder
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        // Remove duplicates by ID before setting photos
        const uniquePhotos = result.data.filter(
          (photo, index, self) =>
            index === self.findIndex((p) => p.id === photo.id)
        );
        setPhotos(uniquePhotos);
      }
    } catch {
      toast.error("Failed to load photos");
    }
  }

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sortBy, sortOrder]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);

    try {
      const result = await uploadPhoto(formData);
      if (result.success && result.data) {
        toast.success(result.message);
        startTransition(() => {
          setOptimisticPhotos({type: "add", photo: result.data});
        });
        await loadPhotos();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      setOptimisticPhotos({type: "delete", id});
      const result = await deletePhoto(id);
      if (result.success) {
        toast.success(result.message);
        await loadPhotos();
      } else {
        toast.error(result.message);
        await loadPhotos(); // Reload to get correct state
      }
    });
  }

  function handleStartEdit(photo: Photo) {
    setEditId(photo.id);
    setEditName(photo.name);
  }

  function handleCancelEdit() {
    setEditId(null);
    setEditName("");
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    startTransition(async () => {
      const result = await updatePhoto(id, {name: editName.trim()});
      if (result.success) {
        toast.success(result.message);
        setEditId(null);
        setEditName("");
        await loadPhotos();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Upload and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by photo name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              disabled={isPending}
            />
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            disabled={isPending}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="created_at">Upload Date</option>
            <option value="name">Name</option>
          </select>
          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            disabled={isPending}
            className="min-w-[100px]"
          >
            {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
          </Button>
        </div>

        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading || isPending}
          className="hidden"
        />
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || isPending}
          className="w-full sm:w-auto"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload Photo"}
        </Button>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {(() => {
          // Remove duplicates by ID to prevent React key warnings
          const uniquePhotos = optimisticPhotos.filter(
            (photo, index, self) =>
              index === self.findIndex((p) => p.id === photo.id)
          );
          return uniquePhotos.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {searchQuery
                  ? "No photos found matching your search"
                  : "No photos yet. Upload one to get started!"}
              </p>
            </div>
          ) : (
            uniquePhotos.map((photo) => (
              <Card
                key={photo.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-square bg-muted">
                  <Image
                    src={photo.url}
                    alt={photo.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </div>
                <div className="p-3 space-y-2">
                  {editId === photo.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveEdit(photo.id);
                          } else if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                        className="flex-1 text-sm"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSaveEdit(photo.id)}
                        disabled={isPending}
                        className="h-8 w-8"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isPending}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p
                        className="text-sm font-medium truncate cursor-pointer hover:text-primary"
                        onClick={() => handleStartEdit(photo)}
                        title={photo.name}
                      >
                        {photo.name}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartEdit(photo)}
                          disabled={isPending}
                          className="h-8 w-8 flex-1"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(photo.id)}
                          disabled={isPending}
                          className="h-8 w-8 flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))
          );
        })()}
      </div>

      {optimisticPhotos.length > 0 && (
        <div className="text-sm text-muted-foreground pt-2 border-t text-center">
          <p>
            {optimisticPhotos.length} photo
            {optimisticPhotos.length !== 1 ? "s" : ""}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>
      )}
    </div>
  );
}
