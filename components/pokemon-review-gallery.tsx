"use client";

import {useEffect, useState, useTransition} from "react";
import {useOptimistic} from "react";
import {
  searchPokemon,
  getPokemonWithReviews,
  type Pokemon,
} from "@/app/actions/pokemon";
import {
  createPokemonReview,
  deletePokemonReview,
  getPokemonReviews,
  type PokemonReview,
} from "@/app/actions/pokemon-reviews";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card} from "@/components/ui/card";
import {Textarea} from "@/components/ui/textarea";
import {toast} from "sonner";
import {
  Search,
  Star,
  MessageSquare,
  Trash2,
  Loader2,
  Sparkles,
} from "lucide-react";
import Image from "next/image";

type PokemonReviewGalleryProps = {
  initialPokemon: Pokemon[];
};

type SortOption = "name" | "created_at";
type SortOrder = "asc" | "desc";

export function PokemonReviewGallery({
  initialPokemon,
}: PokemonReviewGalleryProps) {
  const [pokemon, setPokemon] = useState<Pokemon[]>(initialPokemon);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [expandedPokemonId, setExpandedPokemonId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, PokemonReview[]>>({});
  const [showReviewForm, setShowReviewForm] = useState<Record<string, boolean>>(
    {}
  );
  const [reviewRating, setReviewRating] = useState<Record<string, number>>({});
  const [reviewComment, setReviewComment] = useState<Record<string, string>>(
    {}
  );

  // Optimistic updates for better UX
  const [optimisticPokemon, setOptimisticPokemon] = useOptimistic(
    pokemon,
    (currentPokemon, action: {type: string; pokemon?: Pokemon; id?: string}) => {
      switch (action.type) {
        case "add":
          if (!action.pokemon) return currentPokemon;
          const exists = currentPokemon.some((p) => p.id === action.pokemon!.id);
          return exists ? currentPokemon : [action.pokemon, ...currentPokemon];
        case "update":
          return currentPokemon.map((p) =>
            p.id === action.id && action.pokemon ? action.pokemon : p
          );
        default:
          return currentPokemon;
      }
    }
  );

  async function loadPokemon() {
    try {
      const result = await getPokemonWithReviews(sortBy, sortOrder);
      if (result.error) {
        toast.error(result.error);
      } else {
        const uniquePokemon = result.data.filter(
          (p, index, self) => index === self.findIndex((pok) => pok.id === p.id)
        );
        setPokemon(uniquePokemon);
      }
    } catch {
      toast.error("Failed to load Pokemon");
    }
  }

  useEffect(() => {
    loadPokemon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder]);

  async function handleSearch() {
    if (!searchQuery.trim()) {
      toast.error("Please enter a Pokemon name");
      return;
    }

    setSearching(true);
    try {
      const result = await searchPokemon(searchQuery.trim());
      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        toast.success(`Found ${result.data.name}!`);
        startTransition(() => {
          setOptimisticPokemon({type: "add", pokemon: result.data!});
        });
        await loadPokemon();
        setSearchQuery("");
      }
    } catch {
      toast.error("Failed to search Pokemon");
    } finally {
      setSearching(false);
    }
  }

  async function loadReviews(pokemonId: string) {
    try {
      const result = await getPokemonReviews(pokemonId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setReviews((prev) => ({...prev, [pokemonId]: result.data}));
      }
    } catch {
      toast.error("Failed to load reviews");
    }
  }

  async function handleToggleExpand(pokemonId: string) {
    if (expandedPokemonId === pokemonId) {
      setExpandedPokemonId(null);
    } else {
      setExpandedPokemonId(pokemonId);
      if (!reviews[pokemonId]) {
        await loadReviews(pokemonId);
      }
    }
  }

  async function handleSubmitReview(pokemonId: string) {
    const rating = reviewRating[pokemonId];
    const comment = reviewComment[pokemonId] || "";

    if (!rating || rating < 1 || rating > 5) {
      toast.error("Please select a rating (1-5 stars)");
      return;
    }

    const formData = new FormData();
    formData.append("rating", rating.toString());
    formData.append("comment", comment);

    try {
      const result = await createPokemonReview(pokemonId, formData);
      if (result.success) {
        toast.success(result.message);
        setShowReviewForm((prev) => ({...prev, [pokemonId]: false}));
        setReviewRating((prev) => ({...prev, [pokemonId]: 0}));
        setReviewComment((prev) => ({...prev, [pokemonId]: ""}));
        await loadReviews(pokemonId);
        await loadPokemon(); // Refresh to update review count
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to submit review");
    }
  }

  async function handleDeleteReview(reviewId: string, pokemonId: string) {
    try {
      const result = await deletePokemonReview(reviewId);
      if (result.success) {
        toast.success(result.message);
        await loadReviews(pokemonId);
        await loadPokemon(); // Refresh to update review count
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to delete review");
    }
  }

  const uniquePokemon = optimisticPokemon.filter(
    (p, index, self) => index === self.findIndex((pok) => pok.id === p.id)
  );

  return (
    <div className="space-y-4">
      {/* Search and Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search Pokemon by name (e.g., pikachu, charizard)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="pl-9"
              disabled={searching || isPending}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={searching || isPending || !searchQuery.trim()}
          >
            {searching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </Button>
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            disabled={isPending}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="created_at">Review Date</option>
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
      </div>

      {/* Pokemon Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {uniquePokemon.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No Pokemon found. Search for a Pokemon to get started!</p>
            <p className="text-xs mt-2">
              Try searching for: pikachu, charizard, bulbasaur, squirtle
            </p>
          </div>
        ) : (
          uniquePokemon.map((p) => (
            <Card
              key={p.id}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-square bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                {p.image_url ? (
                  <Image
                    src={p.image_url}
                    alt={p.name}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Sparkles className="h-12 w-12 text-muted-foreground opacity-50" />
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <h3 className="text-sm font-bold capitalize">{p.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.types.map((type) => (
                      <span
                        key={type}
                        className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  <span>{p._count?.reviews || 0} reviews</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleExpand(p.id)}
                  disabled={isPending}
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {expandedPokemonId === p.id ? "Hide Reviews" : "View Reviews"}
                </Button>
              </div>

              {/* Reviews Section */}
              {expandedPokemonId === p.id && (
                <div className="border-t p-3 space-y-3 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Reviews</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowReviewForm((prev) => ({
                          ...prev,
                          [p.id]: !prev[p.id],
                        }));
                      }}
                    >
                      Add Review
                    </Button>
                  </div>

                  {/* Review Form */}
                  {showReviewForm[p.id] && (
                    <Card className="p-3 space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setReviewRating((prev) => ({
                                ...prev,
                                [p.id]: star,
                              }))
                            }
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-5 w-5 ${
                                (reviewRating[p.id] || 0) >= star
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <Textarea
                        placeholder="Write your review..."
                        value={reviewComment[p.id] || ""}
                        onChange={(e) =>
                          setReviewComment((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        className="text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReview(p.id)}
                        >
                          Submit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowReviewForm((prev) => ({
                              ...prev,
                              [p.id]: false,
                            }));
                            setReviewRating((prev) => ({...prev, [p.id]: 0}));
                            setReviewComment((prev) => ({
                              ...prev,
                              [p.id]: "",
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
                    {reviews[p.id]?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No reviews yet. Be the first to review!
                      </p>
                    ) : (
                      reviews[p.id]?.map((review) => (
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
                                handleDeleteReview(review.id, p.id)
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

      {uniquePokemon.length > 0 && (
        <div className="text-sm text-muted-foreground pt-2 border-t text-center">
          <p>
            {uniquePokemon.length} Pokemon
            {uniquePokemon.length !== 1 ? "" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

