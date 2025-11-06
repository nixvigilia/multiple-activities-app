import {redirect} from "next/navigation";
import {createClient} from "@/utils/supabase/server";
import {TodoList} from "@/components/todo-list";
import {BackButton} from "@/components/back-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {getTodos} from "@/app/actions/todos";

export default async function TodosPage() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch initial todos on the server
  const {data: initialTodos} = await getTodos();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">Todo List</CardTitle>
              <CardDescription>
                Manage your tasks and stay organized
              </CardDescription>
            </div>
            <BackButton />
          </div>
        </CardHeader>
        <CardContent>
          <TodoList initialTodos={initialTodos || []} />
        </CardContent>
      </Card>
    </div>
  );
}
