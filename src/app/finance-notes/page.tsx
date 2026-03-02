"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Keyboard, Check, AlertCircle, Plus, Trash2, Eye, Edit3, Loader2 } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import ReactMarkdown from "react-markdown"
import { Id } from "../../../convex/_generated/dataModel"

export default function FinanceNotesPage() {
  const allNotes = useQuery(api.financeNotes.financeNotesCrud.getAllFinanceNotes)
  const createNote = useMutation(api.financeNotes.financeNotesCrud.createFinanceNote)
  const updateNote = useMutation(api.financeNotes.financeNotesCrud.updateFinanceNote)
  const deleteNote = useMutation(api.financeNotes.financeNotesCrud.deleteFinanceNote)

  const [selectedNoteId, setSelectedNoteId] = useState<Id<"financeNotes"> | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [isPreviewMode, setIsPreviewMode] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const notes = useMemo(() => allNotes || [], [allNotes])
  const selectedNote = notes.find((n) => n._id === selectedNoteId)

  // Auto-select first note if none selected
  useEffect(() => {
    if (notes.length > 0 && !selectedNoteId) {
      setSelectedNoteId(notes[0]._id)
    }
  }, [notes, selectedNoteId])

  // Load selected note content
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title)
      setContent(selectedNote.content)
      setLastSaved(selectedNote.lastUpdated || null)
      setHasChanges(false)
    }
  }, [selectedNote])

  // Track changes and word count
  useEffect(() => {
    if (selectedNote) {
      const titleChanged = title !== selectedNote.title
      const contentChanged = content !== selectedNote.content
      setHasChanges(titleChanged || contentChanged)
    } else {
      setHasChanges(title.length > 0 || content.length > 0)
    }

    // Calculate word count
    const words = content.trim().split(/\s+/).filter((w) => w.length > 0).length
    setWordCount(words)
  }, [title, content, selectedNote])

  // Auto-save function
  const handleSave = useCallback(async () => {
    if (!title.trim() || !selectedNoteId) return

    setIsSaving(true)
    try {
      await updateNote({
        noteId: selectedNoteId,
        title: title.trim(),
        content: content,
      })
      const now = new Date().toISOString()
      setLastSaved(now)
      setHasChanges(false)
    } catch (error) {
      console.error("Failed to save notes:", error)
    } finally {
      setIsSaving(false)
    }
  }, [title, content, selectedNoteId, updateNote])

  // Extract title.trim() to avoid complex expression in dependency array
  const trimmedTitle = title.trim()

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!hasChanges || !trimmedTitle || !selectedNoteId) return

    const timer = setTimeout(() => {
      handleSave()
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timer)
  }, [trimmedTitle, content, hasChanges, handleSave, selectedNoteId])

  // Keyboard shortcut for save (Ctrl/Cmd + S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleSave])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges && trimmedTitle) {
        e.preventDefault()
        e.returnValue = ""
        return ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasChanges, trimmedTitle])

  const isLoading = allNotes === undefined

  // Focus textarea on load if no title
  useEffect(() => {
    if (!isLoading && !title && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isLoading, title])

  // Format last saved time
  const formatLastSaved = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)

    if (diffSec < 60) return "Just now"
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    return date.toLocaleDateString()
  }

  // Handle creating a new note
  const handleCreateNote = async () => {
    try {
      const newNoteId = await createNote({
        title: "Untitled Note",
        content: "",
      })
      setSelectedNoteId(newNoteId)
    } catch (error) {
      console.error("Failed to create note:", error)
    }
  }

  // Handle deleting a note
  const handleDeleteNote = async (noteId: Id<"financeNotes">, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteNote({ noteId })
      // Select another note if available
      if (selectedNoteId === noteId) {
        const remainingNotes = notes.filter((n) => n._id !== noteId)
        if (remainingNotes.length > 0) {
          setSelectedNoteId(remainingNotes[0]._id)
        } else {
          setSelectedNoteId(null)
          setTitle("")
          setContent("")
        }
      }
    } catch (error) {
      console.error("Failed to delete note:", error)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Note List */}
      <aside className="w-64 md:w-72 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b">
          <Button onClick={handleCreateNote} className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 space-y-1">
              {/* Skeleton loaders for note items */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3 rounded-lg border border-transparent">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-full rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notes yet</p>
              <p className="text-xs">Click &quot;New Note&quot; to create one</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notes.map((note) => (
                <div
                  key={note._id}
                  onClick={() => setSelectedNoteId(note._id)}
                  className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedNoteId === note._id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {note.title || "Untitled Note"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {note.content.slice(0, 50) || "No content"}
                      </p>
                      {note.lastUpdated && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatLastSaved(note.lastUpdated)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteNote(note._id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-opacity"
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-3 md:p-4 space-y-3">
          {/* Compact status indicator */}
          <div className="flex items-center gap-2 text-xs">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">Saving...</span>
              </>
            ) : hasChanges ? (
              <>
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">Unsaved</span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span className="text-muted-foreground">Saved</span>
              </>
            )}
            {lastSaved && !isSaving && (
              <span className="text-muted-foreground ml-1">
                {formatLastSaved(lastSaved)}
              </span>
            )}
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="py-6 space-y-4">
                <Skeleton className="h-8 w-1/2 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-4 w-5/6 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-2/3 rounded" />
                </div>
              </CardContent>
            </Card>
          ) : !selectedNoteId ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-4">
                    <FileText className="h-12 w-12 mx-auto opacity-50" />
                    <p>Select a note or create a new one</p>
                    <Button onClick={handleCreateNote} variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Note
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Title Input - compact */}
              <Input
                id="title"
                placeholder="Note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base font-medium"
              />

              {/* Mode toggle button */}
              <div className="mb-2">
                <Button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-7 px-2"
                >
                  {isPreviewMode ? (
                    <>
                      <Edit3 className="h-3 w-3" />
                      <span className="text-xs">Edit</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" />
                      <span className="text-xs">Preview</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Content Editor/Preview with border */}
              <div className="relative flex flex-col min-h-[300px] md:min-h-[400px] border rounded-lg">
                {isPreviewMode ? (
                  <>
                    {/* Click anywhere on preview to edit */}
                    <div
                      onClick={() => setIsPreviewMode(false)}
                      className="flex-1 overflow-y-auto p-4 min-h-[250px] md:min-h-[350px] text-sm space-y-2 cursor-text"
                    >
                      {content ? (
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
                            p: ({ children }) => <p className="mb-2">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li>{children}</li>,
                            blockquote: ({ children }) => <blockquote className="border-l-2 border-muted-foreground pl-3 italic text-muted-foreground">{children}</blockquote>,
                            code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                            pre: ({ children }) => <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-2">{children}</pre>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em>{children}</em>,
                          }}
                        >
                          {content}
                        </ReactMarkdown>
                      ) : (
                        <p className="text-muted-foreground italic">Click to add notes...</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Textarea
                      ref={textareaRef}
                      id="content"
                      placeholder={`Start typing your planning notes here...

# Use Markdown for formatting

## Headers
- Bullet points
- Are easy to use

**Bold** and *italic* text

> Quotes look nice too

1. Numbered lists
2. Work well too`}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="flex-1 min-h-[250px] md:min-h-[350px] resize-none text-sm"
                    />
                    {/* Bottom bar: word count left, shortcuts right */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1 py-2 border-t">
                      <span>
                        {wordCount} {wordCount === 1 ? "word" : "words"}
                      </span>
                      <div className="hidden md:flex items-center gap-2">
                        <Keyboard className="h-3 w-3" />
                        <span>Ctrl+S</span>
                        <span className="text-muted-foreground/50">|</span>
                        <span># headers, - lists</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
