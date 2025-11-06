"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {createClient} from "@/utils/supabase/server";
import {prisma} from "@/lib/prisma";

const reviewSchema = z.object({
  rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().max(1000, "Comment is too long").optional(),
});

export type ReviewActionResult = {
  success: boolean;
  message: string;
};

export type Review = {
  id: string;
  foodPhotoId: string;
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
export async function createReview(
  foodPhotoId: string,
  formData: FormData
): Promise<ReviewActionResult & {data?: Review}> {
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
    // Verify the food photo exists
    const foodPhoto = await prisma.foodPhoto.findUnique({
      where: {id: foodPhotoId},
      select: {id: true},
    });

    if (!foodPhoto) {
      return {
        success: false,
        message: "Food photo not found",
      };
    }

    // Check if user already reviewed this photo
    const existingReview = await prisma.review.findFirst({
      where: {
        foodPhotoId,
        profileId: user.id,
      },
    });

    if (existingReview) {
      return {
        success: false,
        message: "You have already reviewed this food photo",
      };
    }

    const review = await prisma.review.create({
      data: {
        foodPhotoId,
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

    revalidatePath("/food-review");
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
export async function updateReview(
  id: string,
  updates: {rating?: number; comment?: string}
): Promise<ReviewActionResult> {
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
    const review = await prisma.review.findUnique({
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

    await prisma.review.update({
      where: {id},
      data: updateData,
    });

    revalidatePath("/food-review");
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
export async function deleteReview(id: string): Promise<ReviewActionResult> {
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
    const review = await prisma.review.findUnique({
      where: {id},
      select: {profileId: true},
    });

    if (!review || review.profileId !== user.id) {
      return {
        success: false,
        message: "Review not found or you don't have permission to delete it",
      };
    }

    await prisma.review.delete({
      where: {id},
    });

    revalidatePath("/food-review");
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

// Get reviews for a food photo
export async function getReviews(foodPhotoId: string) {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {data: [], error: "You must be logged in to view reviews"};
  }

  try {
    const reviews = await prisma.review.findMany({
      where: {
        foodPhotoId,
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

