// Adding Priority Levels in the Todo List Application.
// 1. Add priority levels (‘LOW’, ‘MEDIUM’, ‘HIGH’) to your todo list.
// 2. The user should be able to select a priority level when adding a task.
// 3. The selected priority should remain visible even after refreshing the page.
// 4. Optional: The user should be able to update the priority later.
// 5. Push your code to the same repository that you’ve submitted.
// 6. Before confirming that you’re done, make sure the changes are reflected on the Vercel link.
// (Since the repo link is the same, ensure the deployment is up to date.)

"use client";

import {useCallback, useEffect, useState, useTransition} from "react";
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

type Priority = "low" | "medium" | "high";

const priorityOptions: {value: Priority; label: string}[] = [
  {value: "low", label: "Low"},
  {value: "medium", label: "Medium"},
  {value: "high", label: "High"},
];

const priorityBadgeStyles: Record<Priority, string> = {
  low: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  medium: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200",
  high: "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200",
};

const priorityValues: Priority[] = ["low", "medium", "high"];

const normalizePriority = (value: unknown): Priority => {
  if (typeof value === "string") {
    const normalized = value.toLowerCase() as Priority;
    if (priorityValues.includes(normalized)) {
      return normalized;
    }
  }
  return "medium";
};

export type Todo = {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
};

type RawTodo = Omit<Todo, "priority"> & {priority: string};

type TodoListProps = {
  initialTodos: RawTodo[];
};

export function TodoList({initialTodos}: TodoListProps) {
  const normalizedInitialTodos = initialTodos.map((todo) => ({
    ...todo,
    priority: normalizePriority(todo.priority),
  }));
  const [todos, setTodos] = useState<Todo[]>(normalizedInitialTodos);
  const [isPending, startTransition] = useTransition();
  const [createState, createAction] = useActionState(createTodo, null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

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

  const loadTodos = useCallback(async () => {
    try {
      const result = await getTodos();
      if (result.error) {
        toast.error(result.error);
      } else {
        const normalized = (result.data as RawTodo[]).map((todo) => ({
          ...todo,
          priority: normalizePriority(todo.priority),
        }));
        setTodos(normalized);
      }
    } catch {
      toast.error("Failed to load todos");
    }
  }, []);

  useEffect(() => {
    if (createState?.success) {
      toast.success(createState.message);
      startTransition(() => {
        void loadTodos();
        setPriority("medium");
      });
      // Reset form
      const form = document.getElementById("todo-form") as HTMLFormElement;
      form?.reset();
    } else if (createState?.success === false) {
      toast.error(createState.message);
    }
  }, [createState, loadTodos]);

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

  async function handlePriorityChange(id: string, newPriority: Priority) {
    startTransition(async () => {
      const currentTodo =
        optimisticTodos.find((todo) => todo.id === id) ||
        todos.find((todo) => todo.id === id);
      setOptimisticTodos({
        type: "update",
        id,
        todo: currentTodo ? {...currentTodo, priority: newPriority} : undefined,
      });
      const result = await updateTodo(id, {priority: newPriority});
      if (result.success) {
        await loadTodos();
      } else {
        toast.error(result.message);
        await loadTodos();
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
        <select
          name="priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
          disabled={isPending}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm capitalize text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
              className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
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
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize ${priorityBadgeStyles[todo.priority]}`}
                  >
                    {todo.priority}
                  </span>
                  <select
                    value={todo.priority}
                    onChange={(event) => {
                      event.stopPropagation();
                      handlePriorityChange(
                        todo.id,
                        event.target.value as Priority
                      );
                    }}
                    disabled={isPending}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs capitalize text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
