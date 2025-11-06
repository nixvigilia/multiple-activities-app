"use client";

import {useEffect, useState, useTransition} from "react";
import {useActionState, useOptimistic} from "react";
import {
  createNote,
  updateNote,
  deleteNote,
  getNotes,
  type Note,
} from "@/app/actions/notes";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Card} from "@/components/ui/card";
import {toast} from "sonner";
import {Plus, Trash2, Edit, X, Check, FileText, Eye, EyeOff} from "lucide-react";

export type NotesListProps = {
  initialNotes: Note[];
};

// Simple markdown to HTML converter (basic support)
function markdownToHtml(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    // Code blocks
    .replace(/```([\s\S]*?)```/gim, "<pre><code>$1</code></pre>")
    // Inline code
    .replace(/`([^`]+)`/gim, "<code>$1</code>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Line breaks
    .replace(/\n\n/gim, "</p><p>")
    .replace(/\n/gim, "<br>");

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith("<")) {
    html = "<p>" + html + "</p>";
  }

  return html;
}

export function NotesList({initialNotes}: NotesListProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [isPending, startTransition] = useTransition();
  const [createState, createAction] = useActionState(createNote, null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [previewMode, setPreviewMode] = useState<Record<string, boolean>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Optimistic updates for better UX
  const [optimisticNotes, setOptimisticNotes] = useOptimistic(
    notes,
    (currentNotes, action: {type: string; note?: Note; id?: string}) => {
      switch (action.type) {
        case "add":
          return action.note ? [action.note, ...currentNotes] : currentNotes;
        case "delete":
          return currentNotes.filter((note) => note.id !== action.id);
        case "update":
          return currentNotes.map((note) =>
            note.id === action.id && action.note ? action.note : note
          );
        default:
          return currentNotes;
      }
    }
  );

  useEffect(() => {
    if (createState?.success) {
      toast.success(createState.message);
      loadNotes();
      // Reset form
      const form = document.getElementById("note-form") as HTMLFormElement;
      form?.reset();
    } else if (createState?.success === false) {
      toast.error(createState.message);
    }
  }, [createState]);

  async function loadNotes() {
    try {
      const result = await getNotes();
      if (result.error) {
        toast.error(result.error);
      } else {
        setNotes(result.data);
      }
    } catch {
      toast.error("Failed to load notes");
    }
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      setOptimisticNotes({type: "delete", id});
      const result = await deleteNote(id);
      if (result.success) {
        toast.success(result.message);
        await loadNotes();
      } else {
        toast.error(result.message);
        await loadNotes();
      }
    });
  }

  function handleStartEdit(note: Note) {
    setEditId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setPreviewMode({});
  }

  function handleCancelEdit() {
    setEditId(null);
    setEditTitle("");
    setEditContent("");
    setPreviewMode({});
  }

  async function handleSaveEdit(id: string) {
    if (!editTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    startTransition(async () => {
      const result = await updateNote(id, {
        title: editTitle.trim(),
        content: editContent,
      });
      if (result.success) {
        toast.success(result.message);
        setEditId(null);
        setEditTitle("");
        setEditContent("");
        setPreviewMode({});
        await loadNotes();
      } else {
        toast.error(result.message);
      }
    });
  }

  function togglePreview(noteId: string) {
    setPreviewMode((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
  }

  const uniqueNotes = optimisticNotes.filter(
    (note, index, self) => index === self.findIndex((n) => n.id === note.id)
  );

  return (
    <div className="space-y-4">
      <form id="note-form" action={createAction} className="space-y-2">
        <Input
          name="title"
          placeholder="Note title..."
          required
          disabled={isPending}
          className="w-full"
        />
        <Textarea
          name="content"
          placeholder="Write your note in Markdown..."
          disabled={isPending}
          className="w-full min-h-[100px] font-mono text-sm"
          rows={5}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Note
        </Button>
      </form>

      <div className="space-y-3">
        {uniqueNotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notes yet. Create one above to get started!</p>
          </div>
        ) : (
          uniqueNotes.map((note) => (
            <Card
              key={note.id}
              className="p-4 hover:shadow-md transition-shadow"
            >
              {editId === note.id ? (
                <div className="space-y-3">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Note title..."
                    className="font-semibold"
                    autoFocus
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Markdown Editor
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePreview(note.id)}
                      >
                        {previewMode[note.id] ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            Hide Preview
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Show Preview
                          </>
                        )}
                      </Button>
                    </div>
                    {previewMode[note.id] ? (
                      <div
                        className="prose prose-sm max-w-none p-4 border rounded-md bg-muted/50 min-h-[200px]"
                        dangerouslySetInnerHTML={{
                          __html: markdownToHtml(editContent),
                        }}
                      />
                    ) : (
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Write your note in Markdown..."
                        className="font-mono text-sm min-h-[200px]"
                        rows={10}
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(note.id)}
                      disabled={isPending}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      disabled={isPending}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold flex-1">{note.title}</h3>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleStartEdit(note)}
                        disabled={isPending}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(note.id)}
                        disabled={isPending}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{
                      __html: markdownToHtml(note.content || ""),
                    }}
                  />
                  <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                    <p>
                      Updated: {new Date(note.updated_at).toLocaleString()}
                    </p>
                  </div>
                </>
              )}
            </Card>
          ))
        )}
      </div>

      {uniqueNotes.length > 0 && (
        <div className="text-sm text-muted-foreground pt-2 border-t text-center">
          <p>
            {uniqueNotes.length} note{uniqueNotes.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

