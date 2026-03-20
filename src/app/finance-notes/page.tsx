"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Keyboard, Check, AlertCircle, Plus, Trash2, Eye, Edit3, Loader2, StickyNote } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import ReactMarkdown from "react-markdown"
import { Id } from "../../../convex/_generated/dataModel"

// Helper function to truncate text at word boundary
function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + "...";
  }
  return truncated + "...";
}

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

  // Helper to fix markdown list continuation issue
  // Adds blank line after list items when followed by non-list content
  const processedContent = useMemo(() => {
    if (!content) return ""
    const lines = content.split("\n")
    const result: string[] = []
    let inList = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const isListItem = /^[-*]\s/.test(line) || /^\d+\.\s/.test(line)
      const isBlank = line.trim() === ""
      const nextIsListItem = i + 1 < lines.length && (/^[-*]\s/.test(lines[i + 1]) || /^\d+\.\s/.test(lines[i + 1]))

      if (isListItem && !nextIsListItem && i + 1 < lines.length) {
        // List item followed by non-list content - add current line and a blank line
        result.push(line)
        if (!isBlank) {
          result.push("") // Add blank line to end the list
        }
      } else if (inList && !isListItem && !isBlank) {
        // Was in list, now regular text without blank line - add blank line first
        result.push("")
        result.push(line)
        inList = false
      } else {
        result.push(line)
        inList = isListItem
      }
    }
    return result.join("\n")
  }, [content])

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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Note List */}
      <aside className="w-64 md:w-72 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <StickyNote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Planning Notes</h2>
              <p className="text-xs text-muted-foreground">{notes.length} note{notes.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
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
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No notes yet</p>
              <p className="text-xs text-muted-foreground mt-1">Click &quot;New Note&quot; to create your first planning note</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notes.map((note) => (
                <div
                  key={note._id}
                  onClick={() => setSelectedNoteId(note._id)}
                  className={`group p-3 rounded-lg cursor-pointer transition-all ${
                    selectedNoteId === note._id
                      ? "bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {note.title || "Untitled Note"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {truncateAtWord(note.content, 60) || "No content"}
                      </p>
                      {note.lastUpdated && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {formatLastSaved(note.lastUpdated)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteNote(note._id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all"
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
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          {/* Status Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Saving...</span>
                </>
              ) : hasChanges ? (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Unsaved changes</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="text-muted-foreground">All changes saved</span>
                </>
              )}
              {lastSaved && !isSaving && (
                <span className="text-muted-foreground ml-2">
                  Last saved {formatLastSaved(lastSaved)}
                </span>
              )}
            </div>
            {selectedNoteId && (
              <div className="text-sm text-muted-foreground">
                {wordCount} {wordCount === 1 ? "word" : "words"}
              </div>
            )}
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="py-12 space-y-6">
                <div className="space-y-4">
                  <Skeleton className="h-10 w-1/2 rounded-lg" />
                  <Skeleton className="h-6 w-3/4 rounded-lg" />
                  <div className="space-y-3 pt-4">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-5/6 rounded" />
                    <Skeleton className="h-4 w-4/5 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-2/3 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : !selectedNoteId ? (
            <Card className="border-dashed">
              <CardContent className="py-16">
                <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 flex items-center justify-center mb-4">
                    <StickyNote className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-lg font-semibold mb-2">No note selected</p>
                  <p className="text-sm text-muted-foreground mb-6">Select a note from the sidebar or create a new one to get started.</p>
                  <Button onClick={handleCreateNote} variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Note
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Title Section */}
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Note Title
                </label>
                <Input
                  id="title"
                  placeholder="Enter note title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xl font-semibold h-auto py-3"
                />
              </div>

              {/* Toolbar */}
              <div className="flex flex-col gap-3 border-b pb-4">
                {/* Mode Tabs - Clear separation between Edit and Preview */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 p-1 bg-muted/50 dark:bg-muted/30 rounded-lg">
                    <Button
                      onClick={() => setIsPreviewMode(false)}
                      variant={!isPreviewMode ? "default" : "ghost"}
                      size="sm"
                      className={`gap-1.5 ${!isPreviewMode ? "bg-primary text-primary-foreground" : ""}`}
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      onClick={() => setIsPreviewMode(true)}
                      variant={isPreviewMode ? "default" : "ghost"}
                      size="sm"
                      className={`gap-1.5 ${isPreviewMode ? "bg-primary text-primary-foreground" : ""}`}
                    >
                      <Eye className="h-4 w-4" />
                      <span>Preview</span>
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-md">
                    <Keyboard className="h-3 w-3" />
                    <span className="font-medium">Ctrl+S</span>
                    <span>to save</span>
                  </div>
                </div>

                {/* Markdown Help - Only shown in Edit mode */}
                {!isPreviewMode && (
                  <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 px-4 py-3 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                    <span className="font-semibold text-blue-700 dark:text-blue-400">Markdown tips:</span>
                    <span className="ml-2"># Heading 1</span>
                    <span className="ml-3">## Heading 2</span>
                    <span className="ml-3">- bullet (type - + space)</span>
                    <span className="ml-3">1. numbered</span>
                    <span className="ml-3 italic">Tip: press Enter twice after a list to end it</span>
                  </div>
                )}
              </div>

              {/* Content Editor/Preview */}
              <Card className="overflow-hidden mt-4">
                {isPreviewMode ? (
                  <div
                    onClick={() => setIsPreviewMode(false)}
                    className="flex-1 overflow-y-auto p-6 min-h-[400px] cursor-text"
                  >
                    {content ? (
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-3 pb-2 border-b">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-semibold mt-5 mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
                          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1.5">{children}</ol>,
                          li: ({ children }) => <li className="ml-2">{children}</li>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-muted-foreground my-4">{children}</blockquote>,
                          code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                          pre: ({ children }) => <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-3 text-sm">{children}</pre>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em>{children}</em>,
                          a: ({ href, children }) => <a href={href} className="text-blue-600 hover:underline">{children}</a>,
                        }}
                      >
                        {processedContent}
                      </ReactMarkdown>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
                        <Edit3 className="h-10 w-10 mb-3 opacity-30" />
                        <p className="text-lg font-medium">Click to start writing...</p>
                        <p className="text-sm opacity-60">Your markdown notes will appear here</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Textarea
                      ref={textareaRef}
                      id="content"
                      placeholder={`Start typing your planning notes here...

# Use Markdown for formatting

## Headers
- Bullet points (type dash + space)
- Use Enter for new line

**Bold** and *italic* text

> Quotes look nice too

1. Numbered lists
2. Work well too`}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="flex-1 min-h-[400px] resize-none border-0 rounded-none focus:ring-0 p-6 text-base"
                    />
                  </>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
