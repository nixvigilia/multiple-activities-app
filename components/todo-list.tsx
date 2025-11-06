"use client";

import {useEffect, useState, useTransition} from "react";
import {useActionState, useOptimistic} from "react";
import {
  createTodo,
  updateTodo,
  deleteTodo,
  getTodos,
} from "@/app/actions/todos";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {toast} from "sonner";
import {Plus, Trash2, Check, X} from "lucide-react";

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

type TodoListProps = {
  initialTodos: Todo[];
};

export function TodoList({initialTodos}: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [isPending, startTransition] = useTransition();
  const [createState, createAction] = useActionState(createTodo, null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Optimistic updates for better UX
  const [optimisticTodos, setOptimisticTodos] = useOptimistic(
    todos,
    (currentTodos, action: {type: string; todo?: Todo; id?: string}) => {
      switch (action.type) {
        case "add":
          return action.todo ? [action.todo, ...currentTodos] : currentTodos;
        case "toggle":
          return currentTodos.map((todo) =>
            todo.id === action.id ? {...todo, completed: !todo.completed} : todo
          );
        case "delete":
          return currentTodos.filter((todo) => todo.id !== action.id);
        case "update":
          return currentTodos.map((todo) =>
            todo.id === action.id && action.todo ? action.todo : todo
          );
        default:
          return currentTodos;
      }
    }
  );

  useEffect(() => {
    if (createState?.success) {
      toast.success(createState.message);
      loadTodos();
      // Reset form
      const form = document.getElementById("todo-form") as HTMLFormElement;
      form?.reset();
    } else if (createState?.success === false) {
      toast.error(createState.message);
    }
  }, [createState]);

  async function loadTodos() {
    try {
      const result = await getTodos();
      if (result.error) {
        toast.error(result.error);
      } else {
        setTodos(result.data);
      }
    } catch (error) {
      toast.error("Failed to load todos");
    }
  }

  async function handleToggleComplete(id: string, completed: boolean) {
    startTransition(async () => {
      setOptimisticTodos({type: "toggle", id});
      const result = await updateTodo(id, {completed: !completed});
      if (result.success) {
        await loadTodos();
      } else {
        toast.error(result.message);
        await loadTodos(); // Reload to get correct state
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      setOptimisticTodos({type: "delete", id});
      const result = await deleteTodo(id);
      if (result.success) {
        toast.success(result.message);
        await loadTodos();
      } else {
        toast.error(result.message);
        await loadTodos(); // Reload to get correct state
      }
    });
  }

  function handleStartEdit(todo: Todo) {
    setEditId(todo.id);
    setEditTitle(todo.title);
  }

  function handleCancelEdit() {
    setEditId(null);
    setEditTitle("");
  }

  async function handleSaveEdit(id: string) {
    if (!editTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    startTransition(async () => {
      const result = await updateTodo(id, {title: editTitle.trim()});
      if (result.success) {
        toast.success(result.message);
        setEditId(null);
        setEditTitle("");
        await loadTodos();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <form id="todo-form" action={createAction} className="flex gap-2">
        <Input
          name="title"
          placeholder="Add a new todo..."
          required
          disabled={isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={isPending}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </form>

      <div className="space-y-2">
        {optimisticTodos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No todos yet. Add one above to get started!</p>
          </div>
        ) : (
          optimisticTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggleComplete(todo.id, todo.completed)}
                disabled={isPending}
                className="h-5 w-5 rounded border-gray-300 cursor-pointer"
              />
              {editId === todo.id ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveEdit(todo.id);
                      } else if (e.key === "Escape") {
                        handleCancelEdit();
                      }
                    }}
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleSaveEdit(todo.id)}
                    disabled={isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span
                    className={`flex-1 cursor-pointer ${
                      todo.completed ? "line-through text-muted-foreground" : ""
                    }`}
                    onClick={() => handleStartEdit(todo)}
                    onDoubleClick={() => handleStartEdit(todo)}
                  >
                    {todo.title}
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleDelete(todo.id)}
                    disabled={isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {optimisticTodos.length > 0 && (
        <div className="text-sm text-muted-foreground pt-2 border-t">
          <p>
            {optimisticTodos.filter((t) => !t.completed).length} of{" "}
            {optimisticTodos.length} tasks remaining
          </p>
        </div>
      )}
    </div>
  );
}
