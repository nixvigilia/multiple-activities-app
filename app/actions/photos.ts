"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {createClient} from "@/utils/supabase/server";
import {prisma} from "@/lib/prisma";

const photoSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
});

export type PhotoActionResult = {
  success: boolean;
  message: string;
};

export type Photo = {
  id: string;
  name: string;
  url: string;
  size: number | null;
  mime_type: string | null;
  created_at: Date;
  updated_at: Date;
};

// Upload photo to Supabase Storage
export async function uploadPhoto(
  formData: FormData
): Promise<PhotoActionResult & {data?: Photo}> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to upload photos",
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

  const nameResult = photoSchema.safeParse({name: name || file.name});

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

    // Upload to Supabase Storage
    const {error: uploadError} = await supabase.storage
      .from("scic")
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
    } = supabase.storage.from("scic").getPublicUrl(fileName);

    // Save photo metadata to database
    const photo = await prisma.photo.create({
      data: {
        profileId: user.id,
        name: nameResult.data.name,
        url: publicUrl,
        size: file.size,
        mime_type: file.type,
      },
    });

    revalidatePath("/photos");
    return {
      success: true,
      message: "Photo uploaded successfully",
      data: photo,
    };
  } catch (error) {
    console.error("Error uploading photo:", error);
    return {
      success: false,
      message: "Failed to upload photo",
    };
  }
}

// Update photo name
export async function updatePhoto(
  id: string,
  updates: {name?: string}
): Promise<PhotoActionResult> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to update photos",
    };
  }

  try {
    // Verify the photo belongs to the user
    const photo = await prisma.photo.findUnique({
      where: {id},
      select: {profileId: true},
    });

    if (!photo || photo.profileId !== user.id) {
      return {
        success: false,
        message: "Photo not found or you don't have permission to update it",
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

    await prisma.photo.update({
      where: {id},
      data: updateData,
    });

    revalidatePath("/photos");
    return {
      success: true,
      message: "Photo updated successfully",
    };
  } catch (error) {
    console.error("Error updating photo:", error);
    return {
      success: false,
      message: "Failed to update photo",
    };
  }
}

// Delete photo
export async function deletePhoto(id: string): Promise<PhotoActionResult> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to delete photos",
    };
  }

  try {
    // Verify the photo belongs to the user
    const photo = await prisma.photo.findUnique({
      where: {id},
      select: {profileId: true, url: true},
    });

    if (!photo || photo.profileId !== user.id) {
      return {
        success: false,
        message: "Photo not found or you don't have permission to delete it",
      };
    }

    // Extract file path from URL
    // Supabase public URL format: https://[project-ref].supabase.co/storage/v1/object/public/scic/[path]
    let fileName = "";
    try {
      const urlObj = new URL(photo.url);
      const pathParts = urlObj.pathname.split("/");
      const scicIndex = pathParts.indexOf("scic");
      if (scicIndex !== -1 && scicIndex < pathParts.length - 1) {
        fileName = pathParts.slice(scicIndex + 1).join("/");
      } else {
        // Fallback: try to extract from the end of the path
        fileName = pathParts[pathParts.length - 1];
      }
    } catch {
      // If URL parsing fails, try the old method
      const urlParts = photo.url.split("/");
      const scicIndex = urlParts.indexOf("scic");
      if (scicIndex !== -1) {
        fileName = urlParts.slice(scicIndex + 1).join("/");
      }
    }

    // Delete from Supabase Storage
    const {error: deleteError} = await supabase.storage
      .from("scic")
      .remove([fileName]);

    if (deleteError) {
      console.error("Storage delete error:", deleteError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await prisma.photo.delete({
      where: {id},
    });

    revalidatePath("/photos");
    return {
      success: true,
      message: "Photo deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting photo:", error);
    return {
      success: false,
      message: "Failed to delete photo",
    };
  }
}

// Get photos with optional search and sort
export async function getPhotos(
  search?: string,
  sortBy: "name" | "created_at" = "created_at",
  sortOrder: "asc" | "desc" = "desc"
) {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {data: [], error: "You must be logged in to view photos"};
  }

  try {
    const where = {
      profileId: user.id,
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      }),
    };

    const photos = await prisma.photo.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    return {data: photos, error: null};
  } catch (error) {
    console.error("Error fetching photos:", error);
    return {data: [], error: "Failed to load photos"};
  }
}
