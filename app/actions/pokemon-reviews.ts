"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {createClient} from "@/utils/supabase/server";
import {prisma} from "@/lib/prisma";

const reviewSchema = z.object({
  rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().max(1000, "Comment is too long").optional(),
});

export type PokemonReviewActionResult = {
  success: boolean;
  message: string;
};

export type PokemonReview = {
  id: string;
  pokemonId: string;
  profileId: string;
  rating: number;
  comment: string | null;
  created_at: Date;
  updated_at: Date;
  profile?: {
    id: string;
    full_name: string | null;
    email: string;
  };
};

// Create review
export async function createPokemonReview(
  pokemonId: string,
  formData: FormData
): Promise<PokemonReviewActionResult & {data?: PokemonReview}> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to create reviews",
    };
  }

  const rawData = {
    rating: Number(formData.get("rating")),
    comment: formData.get("comment") as string,
  };

  const result = reviewSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message || "Invalid input",
    };
  }

  try {
    // Verify the Pokemon exists
    const pokemon = await prisma.pokemon.findUnique({
      where: {id: pokemonId},
      select: {id: true},
    });

    if (!pokemon) {
      return {
        success: false,
        message: "Pokemon not found",
      };
    }

    // Check if user already reviewed this Pokemon
    const existingReview = await prisma.pokemonReview.findFirst({
      where: {
        pokemonId,
        profileId: user.id,
      },
    });

    if (existingReview) {
      return {
        success: false,
        message: "You have already reviewed this Pokemon",
      };
    }

    const review = await prisma.pokemonReview.create({
      data: {
        pokemonId,
        profileId: user.id,
        rating: result.data.rating,
        comment: result.data.comment || null,
      },
      include: {
        profile: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    revalidatePath("/pokemon-review");
    return {
      success: true,
      message: "Review created successfully",
      data: review,
    };
  } catch (error) {
    console.error("Error creating review:", error);
    return {
      success: false,
      message: "Failed to create review",
    };
  }
}

// Update review
export async function updatePokemonReview(
  id: string,
  updates: {rating?: number; comment?: string}
): Promise<PokemonReviewActionResult> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to update reviews",
    };
  }

  try {
    // Verify the review belongs to the user
    const review = await prisma.pokemonReview.findUnique({
      where: {id},
      select: {profileId: true},
    });

    if (!review || review.profileId !== user.id) {
      return {
        success: false,
        message: "Review not found or you don't have permission to update it",
      };
    }

    const updateData: {rating?: number; comment?: string | null} = {};
    if (updates.rating !== undefined) {
      const ratingResult = z
        .number()
        .min(1, "Rating must be at least 1")
        .max(5, "Rating must be at most 5")
        .safeParse(updates.rating);
      if (!ratingResult.success) {
        return {
          success: false,
          message: ratingResult.error.issues[0]?.message || "Invalid rating",
        };
      }
      updateData.rating = ratingResult.data;
    }
    if (updates.comment !== undefined) {
      const commentResult = z
        .string()
        .max(1000, "Comment is too long")
        .optional()
        .safeParse(updates.comment);
      if (!commentResult.success) {
        return {
          success: false,
          message: commentResult.error.issues[0]?.message || "Invalid comment",
        };
      }
      updateData.comment = commentResult.data || null;
    }

    await prisma.pokemonReview.update({
      where: {id},
      data: updateData,
    });

    revalidatePath("/pokemon-review");
    return {
      success: true,
      message: "Review updated successfully",
    };
  } catch (error) {
    console.error("Error updating review:", error);
    return {
      success: false,
      message: "Failed to update review",
    };
  }
}

// Delete review
export async function deletePokemonReview(id: string): Promise<PokemonReviewActionResult> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to delete reviews",
    };
  }

  try {
    // Verify the review belongs to the user
    const review = await prisma.pokemonReview.findUnique({
      where: {id},
      select: {profileId: true},
    });

    if (!review || review.profileId !== user.id) {
      return {
        success: false,
        message: "Review not found or you don't have permission to delete it",
      };
    }

    await prisma.pokemonReview.delete({
      where: {id},
    });

    revalidatePath("/pokemon-review");
    return {
      success: true,
      message: "Review deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting review:", error);
    return {
      success: false,
      message: "Failed to delete review",
    };
  }
}

// Get reviews for a Pokemon
export async function getPokemonReviews(pokemonId: string) {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {data: [], error: "You must be logged in to view reviews"};
  }

  try {
    const reviews = await prisma.pokemonReview.findMany({
      where: {
        pokemonId,
      },
      orderBy: {
        created_at: "desc",
      },
      include: {
        profile: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    return {data: reviews, error: null};
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return {data: [], error: "Failed to load reviews"};
  }
}

