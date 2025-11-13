"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {createClient} from "@/utils/supabase/server";
import {prisma} from "@/lib/prisma";

const todoSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title is too long"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export type TodoActionResult = {
  success: boolean;
  message: string;
};

export async function createTodo(
  _prevState: TodoActionResult | null,
  formData: FormData
): Promise<TodoActionResult> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to create todos",
    };
  }

  const priorityEntry = formData.get("priority");
  const rawData = {
    title: formData.get("title"),
    priority: typeof priorityEntry === "string" ? priorityEntry : undefined,
  };

  const result = todoSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message || "Invalid input",
    };
  }

  try {
    await prisma.todo.create({
      data: {
        profileId: user.id,
        title: result.data.title,
        priority: result.data.priority,
        completed: false,
      },
    });

    revalidatePath("/todos");
    return {
      success: true,
      message: "Todo created successfully",
    };
  } catch (error) {
    console.error("Error creating todo:", error);
    return {
      success: false,
      message: "Failed to create todo",
    };
  }
}

type TodoUpdateInput = {
  title?: string;
  completed?: boolean;
  priority?: "low" | "medium" | "high";
};

export async function updateTodo(
  id: string,
  updates: TodoUpdateInput
): Promise<TodoActionResult> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to update todos",
    };
  }

  try {
    // Verify the todo belongs to the user
    const todo = await prisma.todo.findUnique({
      where: {id},
      select: {profileId: true},
    });

    if (!todo || todo.profileId !== user.id) {
      return {
        success: false,
        message: "Todo not found or you don't have permission to update it",
      };
    }

    const updateData: TodoUpdateInput = {};
    if (updates.title !== undefined) {
      const titleResult = z
        .string()
        .min(1, "Title is required")
        .max(500, "Title is too long")
        .safeParse(updates.title);
      if (!titleResult.success) {
        return {
          success: false,
          message: titleResult.error.issues[0]?.message || "Invalid title",
        };
      }
      updateData.title = titleResult.data;
    }
    if (updates.completed !== undefined) {
      updateData.completed = updates.completed;
    }
    if (updates.priority !== undefined) {
      const priorityResult = z.enum(["low", "medium", "high"]).safeParse(
        updates.priority
      );
      if (!priorityResult.success) {
        return {
          success: false,
          message: priorityResult.error.issues[0]?.message || "Invalid priority",
        };
      }
      updateData.priority = priorityResult.data;
    }

    await prisma.todo.update({
      where: {id},
      data: updateData,
    });

    revalidatePath("/todos");
    return {
      success: true,
      message: "Todo updated successfully",
    };
  } catch (error) {
    console.error("Error updating todo:", error);
    return {
      success: false,
      message: "Failed to update todo",
    };
  }
}

export async function deleteTodo(id: string): Promise<TodoActionResult> {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to delete todos",
    };
  }

  try {
    // Verify the todo belongs to the user
    const todo = await prisma.todo.findUnique({
      where: {id},
      select: {profileId: true},
    });

    if (!todo || todo.profileId !== user.id) {
      return {
        success: false,
        message: "Todo not found or you don't have permission to delete it",
      };
    }

    await prisma.todo.delete({
      where: {id},
    });

    revalidatePath("/todos");
    return {
      success: true,
      message: "Todo deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting todo:", error);
    return {
      success: false,
      message: "Failed to delete todo",
    };
  }
}

export async function getTodos() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {data: [], error: "You must be logged in to view todos"};
  }

  try {
    const todos = await prisma.todo.findMany({
      where: {
        profileId: user.id,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return {data: todos, error: null};
  } catch (error) {
    console.error("Error fetching todos:", error);
    return {data: [], error: "Failed to load todos"};
  }
}
