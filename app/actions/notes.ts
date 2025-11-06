"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {createClient} from "@/utils/supabase/server";
import {prisma} from "@/lib/prisma";

const noteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  content: z.string().max(50000, "Content is too long"), // 50KB max
});

export type NoteActionResult = {
  success: boolean;
  message: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  created_at: Date;
  updated_at: Date;
};

// Create note
export async function createNote(
  _prevState: NoteActionResult | null,
  formData: FormData
): Promise<NoteActionResult> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to create notes",
    };
  }

  const rawData = {
    title: formData.get("title"),
    content: formData.get("content"),
  };

  const result = noteSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message || "Invalid input",
    };
  }

  try {
    await prisma.note.create({
      data: {
        profileId: user.id,
        title: result.data.title,
        content: result.data.content || "",
      },
    });

    revalidatePath("/notes");
    return {
      success: true,
      message: "Note created successfully",
    };
  } catch (error) {
    console.error("Error creating note:", error);
    return {
      success: false,
      message: "Failed to create note",
    };
  }
}

// Update note
export async function updateNote(
  id: string,
  updates: {title?: string; content?: string}
): Promise<NoteActionResult> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to update notes",
    };
  }

  try {
    // Verify the note belongs to the user
    const note = await prisma.note.findUnique({
      where: {id},
      select: {profileId: true},
    });

    if (!note || note.profileId !== user.id) {
      return {
        success: false,
        message: "Note not found or you don't have permission to update it",
      };
    }

    const updateData: {title?: string; content?: string} = {};
    if (updates.title !== undefined) {
      const titleResult = z
        .string()
        .min(1, "Title is required")
        .max(255, "Title is too long")
        .safeParse(updates.title);
      if (!titleResult.success) {
        return {
          success: false,
          message: titleResult.error.issues[0]?.message || "Invalid title",
        };
      }
      updateData.title = titleResult.data;
    }
    if (updates.content !== undefined) {
      const contentResult = z
        .string()
        .max(50000, "Content is too long")
        .safeParse(updates.content);
      if (!contentResult.success) {
        return {
          success: false,
          message: contentResult.error.issues[0]?.message || "Invalid content",
        };
      }
      updateData.content = contentResult.data;
    }

    await prisma.note.update({
      where: {id},
      data: updateData,
    });

    revalidatePath("/notes");
    return {
      success: true,
      message: "Note updated successfully",
    };
  } catch (error) {
    console.error("Error updating note:", error);
    return {
      success: false,
      message: "Failed to update note",
    };
  }
}

// Delete note
export async function deleteNote(id: string): Promise<NoteActionResult> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to delete notes",
    };
  }

  try {
    // Verify the note belongs to the user
    const note = await prisma.note.findUnique({
      where: {id},
      select: {profileId: true},
    });

    if (!note || note.profileId !== user.id) {
      return {
        success: false,
        message: "Note not found or you don't have permission to delete it",
      };
    }

    await prisma.note.delete({
      where: {id},
    });

    revalidatePath("/notes");
    return {
      success: true,
      message: "Note deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting note:", error);
    return {
      success: false,
      message: "Failed to delete note",
    };
  }
}

// Get notes
export async function getNotes() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {data: [], error: "You must be logged in to view notes"};
  }

  try {
    const notes = await prisma.note.findMany({
      where: {
        profileId: user.id,
      },
      orderBy: {
        updated_at: "desc",
      },
    });

    return {data: notes, error: null};
  } catch (error) {
    console.error("Error fetching notes:", error);
    return {data: [], error: "Failed to load notes"};
  }
}

