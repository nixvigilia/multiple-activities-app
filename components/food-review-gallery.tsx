"use client";

import {useEffect, useState, useTransition, useRef} from "react";
import {useOptimistic} from "react";
import {
  uploadFoodPhoto,
  updateFoodPhoto,
  deleteFoodPhoto,
  getFoodPhotos,
  type FoodPhoto,
} from "@/app/actions/food-photos";
import {
  createReview,
  updateReview,
  deleteReview,
  getReviews,
  type Review,
} from "@/app/actions/reviews";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card} from "@/components/ui/card";
import {Textarea} from "@/components/ui/textarea";
import {toast} from "sonner";
import {
  Upload,
  Trash2,
  Edit,
  X,
  Check,
  Search,
  Image as ImageIcon,
  Star,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";

type FoodReviewGalleryProps = {
  initialFoodPhotos: FoodPhoto[];
};

type SortOption = "name" | "created_at";
type SortOrder = "asc" | "desc";

export function FoodReviewGallery({initialFoodPhotos}: FoodReviewGalleryProps) {
  const [foodPhotos, setFoodPhotos] = useState<FoodPhoto[]>(initialFoodPhotos);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [showReviewForm, setShowReviewForm] = useState<Record<string, boolean>>(
    {}
  );
  const [reviewRating, setReviewRating] = useState<Record<string, number>>({});
  const [reviewComment, setReviewComment] = useState<Record<string, string>>(
    {}
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Optimistic updates for better UX
  const [optimisticFoodPhotos, setOptimisticFoodPhotos] = useOptimistic(
    foodPhotos,
    (currentPhotos, action: {type: string; photo?: FoodPhoto; id?: string}) => {
      switch (action.type) {
        case "add":
          if (!action.photo) return currentPhotos;
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

  async function loadFoodPhotos() {
    try {
      const result = await getFoodPhotos(
        searchQuery || undefined,
        sortBy,
        sortOrder
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        const uniquePhotos = result.data.filter(
          (photo, index, self) =>
            index === self.findIndex((p) => p.id === photo.id)
        );
        setFoodPhotos(uniquePhotos);
      }
    } catch {
      toast.error("Failed to load food photos");
    }
  }

  useEffect(() => {
    loadFoodPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sortBy, sortOrder]);

  async function loadReviews(foodPhotoId: string) {
    try {
      const result = await getReviews(foodPhotoId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setReviews((prev) => ({...prev, [foodPhotoId]: result.data}));
      }
    } catch {
      toast.error("Failed to load reviews");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);

    try {
      const result = await uploadFoodPhoto(formData);
      if (result.success && result.data) {
        toast.success(result.message);
        startTransition(() => {
          setOptimisticFoodPhotos({type: "add", photo: result.data});
        });
        await loadFoodPhotos();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to upload food photo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      setOptimisticFoodPhotos({type: "delete", id});
      const result = await deleteFoodPhoto(id);
      if (result.success) {
        toast.success(result.message);
        await loadFoodPhotos();
      } else {
        toast.error(result.message);
        await loadFoodPhotos();
      }
    });
  }

  function handleStartEdit(photo: FoodPhoto) {
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
      const result = await updateFoodPhoto(id, {name: editName.trim()});
      if (result.success) {
        toast.success(result.message);
        setEditId(null);
        setEditName("");
        await loadFoodPhotos();
      } else {
        toast.error(result.message);
      }
    });
  }

  async function handleToggleExpand(photoId: string) {
    if (expandedPhotoId === photoId) {
      setExpandedPhotoId(null);
    } else {
      setExpandedPhotoId(photoId);
      if (!reviews[photoId]) {
        await loadReviews(photoId);
      }
    }
  }

  async function handleSubmitReview(foodPhotoId: string) {
    const rating = reviewRating[foodPhotoId];
    const comment = reviewComment[foodPhotoId] || "";

    if (!rating || rating < 1 || rating > 5) {
      toast.error("Please select a rating (1-5 stars)");
      return;
    }

    const formData = new FormData();
    formData.append("rating", rating.toString());
    formData.append("comment", comment);

    try {
      const result = await createReview(foodPhotoId, formData);
      if (result.success) {
        toast.success(result.message);
        setShowReviewForm((prev) => ({...prev, [foodPhotoId]: false}));
        setReviewRating((prev) => ({...prev, [foodPhotoId]: 0}));
        setReviewComment((prev) => ({...prev, [foodPhotoId]: ""}));
        await loadReviews(foodPhotoId);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to submit review");
    }
  }

  async function handleDeleteReview(reviewId: string, foodPhotoId: string) {
    try {
      const result = await deleteReview(reviewId);
      if (result.success) {
        toast.success(result.message);
        await loadReviews(foodPhotoId);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to delete review");
    }
  }

  const uniquePhotos = optimisticFoodPhotos.filter(
    (photo, index, self) => index === self.findIndex((p) => p.id === photo.id)
  );

  return (
    <div className="space-y-4">
      {/* Upload and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by food name..."
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
          {uploading ? "Uploading..." : "Upload Food Photo"}
        </Button>
      </div>

      {/* Food Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {uniquePhotos.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>
              {searchQuery
                ? "No food photos found matching your search"
                : "No food photos yet. Upload one to get started!"}
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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span>{photo._count?.reviews || 0} reviews</span>
                    </div>
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
                        onClick={() => handleToggleExpand(photo.id)}
                        disabled={isPending}
                        className="h-8 w-8 flex-1"
                      >
                        <MessageSquare className="h-4 w-4" />
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

              {/* Reviews Section */}
              {expandedPhotoId === photo.id && (
                <div className="border-t p-3 space-y-3 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Reviews</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowReviewForm((prev) => ({
                          ...prev,
                          [photo.id]: !prev[photo.id],
                        }));
                      }}
                    >
                      Add Review
                    </Button>
                  </div>

                  {/* Review Form */}
                  {showReviewForm[photo.id] && (
                    <Card className="p-3 space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setReviewRating((prev) => ({
                                ...prev,
                                [photo.id]: star,
                              }))
                            }
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-5 w-5 ${
                                (reviewRating[photo.id] || 0) >= star
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <Textarea
                        placeholder="Write your review..."
                        value={reviewComment[photo.id] || ""}
                        onChange={(e) =>
                          setReviewComment((prev) => ({
                            ...prev,
                            [photo.id]: e.target.value,
                          }))
                        }
                        className="text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReview(photo.id)}
                        >
                          Submit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowReviewForm((prev) => ({
                              ...prev,
                              [photo.id]: false,
                            }));
                            setReviewRating((prev) => ({
                              ...prev,
                              [photo.id]: 0,
                            }));
                            setReviewComment((prev) => ({
                              ...prev,
                              [photo.id]: "",
                            }));
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* Reviews List */}
                  <div className="space-y-2">
                    {reviews[photo.id]?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No reviews yet. Be the first to review!
                      </p>
                    ) : (
                      reviews[photo.id]?.map((review) => (
                        <Card key={review.id} className="p-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-3 w-3 ${
                                        review.rating >= star
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {review.profile?.full_name ||
                                    review.profile?.email}
                                </span>
                              </div>
                              {review.comment && (
                                <p className="text-xs text-muted-foreground">
                                  {review.comment}
                                </p>
                              )}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                handleDeleteReview(review.id, photo.id)
                              }
                              className="h-6 w-6"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {uniquePhotos.length > 0 && (
        <div className="text-sm text-muted-foreground pt-2 border-t text-center">
          <p>
            {uniquePhotos.length} food photo
            {uniquePhotos.length !== 1 ? "s" : ""}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>
      )}
    </div>
  );
}
