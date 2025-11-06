import {redirect} from "next/navigation";
import {createClient} from "@/utils/supabase/server";
import {NotesList} from "@/components/notes-list";
import {BackButton} from "@/components/back-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {getNotes} from "@/app/actions/notes";

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch initial notes on the server
  const {data: initialNotes} = await getNotes();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">Markdown Notes</CardTitle>
              <CardDescription>
                Create and manage your notes with Markdown support
              </CardDescription>
            </div>
            <BackButton />
          </div>
        </CardHeader>
        <CardContent>
          <NotesList initialNotes={initialNotes || []} />
        </CardContent>
      </Card>
    </div>
  );
}

