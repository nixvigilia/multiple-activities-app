"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {createClient} from "@/utils/supabase/server";
import {prisma} from "@/lib/prisma";

const foodPhotoSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
});

export type FoodPhotoActionResult = {
  success: boolean;
  message: string;
};

export type FoodPhoto = {
  id: string;
  name: string;
  url: string;
  size: number | null;
  mime_type: string | null;
  created_at: Date;
  updated_at: Date;
  _count?: {
    reviews: number;
  };
};

// Upload food photo to Supabase Storage
export async function uploadFoodPhoto(
  formData: FormData
): Promise<FoodPhotoActionResult & {data?: FoodPhoto}> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to upload food photos",
    };
  }

  const file = formData.get("file") as File;
  const name = formData.get("name") as string;

  if (!file) {
    return {
      success: false,
      message: "No file provided",
    };
  }

  // Validate file type (images only)
  if (!file.type.startsWith("image/")) {
    return {
      success: false,
      message: "Only image files are allowed",
    };
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      success: false,
      message: "File size must be less than 10MB",
    };
  }

  const nameResult = foodPhotoSchema.safeParse({name: name || file.name});

  if (!nameResult.success) {
    return {
      success: false,
      message: nameResult.error.issues[0]?.message || "Invalid name",
    };
  }

  try {
    // Generate unique file path
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to Supabase Storage (food-review bucket)
    const {error: uploadError} = await supabase.storage
      .from("food-review")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return {
        success: false,
        message: "Failed to upload photo: " + uploadError.message,
      };
    }

    // Get public URL
    const {
      data: {publicUrl},
    } = supabase.storage.from("food-review").getPublicUrl(fileName);

    // Save photo metadata to database
    const foodPhoto = await prisma.foodPhoto.create({
      data: {
        profileId: user.id,
        name: nameResult.data.name,
        url: publicUrl,
        size: file.size,
        mime_type: file.type,
      },
    });

    revalidatePath("/food-review");
    return {
      success: true,
      message: "Food photo uploaded successfully",
      data: foodPhoto,
    };
  } catch (error) {
    console.error("Error uploading food photo:", error);
    return {
      success: false,
      message: "Failed to upload food photo",
    };
  }
}

// Update food photo name
export async function updateFoodPhoto(
  id: string,
  updates: {name?: string}
): Promise<FoodPhotoActionResult> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to update food photos",
    };
  }

  try {
    // Verify the photo belongs to the user
    const foodPhoto = await prisma.foodPhoto.findUnique({
      where: {id},
      select: {profileId: true},
    });

    if (!foodPhoto || foodPhoto.profileId !== user.id) {
      return {
        success: false,
        message:
          "Food photo not found or you don't have permission to update it",
      };
    }

    const updateData: {name?: string} = {};
    if (updates.name !== undefined) {
      const nameResult = z
        .string()
        .min(1, "Name is required")
        .max(255, "Name is too long")
        .safeParse(updates.name);
      if (!nameResult.success) {
        return {
          success: false,
          message: nameResult.error.issues[0]?.message || "Invalid name",
        };
      }
      updateData.name = nameResult.data;
    }

    await prisma.foodPhoto.update({
      where: {id},
      data: updateData,
    });

    revalidatePath("/food-review");
    return {
      success: true,
      message: "Food photo updated successfully",
    };
  } catch (error) {
    console.error("Error updating food photo:", error);
    return {
      success: false,
      message: "Failed to update food photo",
    };
  }
}

// Delete food photo
export async function deleteFoodPhoto(
  id: string
): Promise<FoodPhotoActionResult> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to delete food photos",
    };
  }

  try {
    // Verify the photo belongs to the user
    const foodPhoto = await prisma.foodPhoto.findUnique({
      where: {id},
      select: {profileId: true, url: true},
    });

    if (!foodPhoto || foodPhoto.profileId !== user.id) {
      return {
        success: false,
        message:
          "Food photo not found or you don't have permission to delete it",
      };
    }

    // Extract file path from URL
    // Supabase public URL format: https://[project-ref].supabase.co/storage/v1/object/public/food-review/[path]
    let fileName = "";
    try {
      const urlObj = new URL(foodPhoto.url);
      const pathParts = urlObj.pathname.split("/");
      const bucketIndex = pathParts.indexOf("food-review");
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        fileName = pathParts.slice(bucketIndex + 1).join("/");
      } else {
        fileName = pathParts[pathParts.length - 1];
      }
    } catch {
      const urlParts = foodPhoto.url.split("/");
      const bucketIndex = urlParts.indexOf("food-review");
      if (bucketIndex !== -1) {
        fileName = urlParts.slice(bucketIndex + 1).join("/");
      }
    }

    // Delete from Supabase Storage
    const {error: deleteError} = await supabase.storage
      .from("food-review")
      .remove([fileName]);

    if (deleteError) {
      console.error("Storage delete error:", deleteError);
    }

    // Delete from database (reviews will be cascade deleted)
    await prisma.foodPhoto.delete({
      where: {id},
    });

    revalidatePath("/food-review");
    return {
      success: true,
      message: "Food photo deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting food photo:", error);
    return {
      success: false,
      message: "Failed to delete food photo",
    };
  }
}

// Get food photos with optional search and sort
export async function getFoodPhotos(
  search?: string,
  sortBy: "name" | "created_at" = "created_at",
  sortOrder: "asc" | "desc" = "desc"
) {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {data: [], error: "You must be logged in to view food photos"};
  }

  try {
    const where = {
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      }),
    };

    const foodPhotos = await prisma.foodPhoto.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    return {data: foodPhotos, error: null};
  } catch (error) {
    console.error("Error fetching food photos:", error);
    return {data: [], error: "Failed to load food photos"};
  }
}
