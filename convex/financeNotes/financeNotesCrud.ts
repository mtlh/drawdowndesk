import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all notes for the current user (for sidebar list)
export const getAllFinanceNotes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const notes = await ctx.db
      .query("financeNotes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Sort by lastUpdated descending
    return notes.sort((a, b) => {
      const aTime = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const bTime = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return bTime - aTime;
    });
  },
});

// Get a single note by ID
export const getFinanceNoteById = query({
  args: {
    noteId: v.id("financeNotes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) return null;

    return note;
  },
});

// Get the first note (for backwards compatibility)
export const getFinanceNotes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const notes = await ctx.db
      .query("financeNotes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return notes;
  },
});

// Create a new note
export const createFinanceNote = mutation({
  args: {
    title: v.string(),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const noteId = await ctx.db.insert("financeNotes", {
      userId,
      title: args.title,
      content: args.content || "",
      lastUpdated: new Date().toISOString(),
    });
    return noteId;
  },
});

// Update an existing note
export const updateFinanceNote = mutation({
  args: {
    noteId: v.id("financeNotes"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) throw new Error("Note not found");

    await ctx.db.patch(args.noteId, {
      title: args.title,
      content: args.content,
      lastUpdated: new Date().toISOString(),
    });
    return args.noteId;
  },
});

// Delete a note
export const deleteFinanceNote = mutation({
  args: {
    noteId: v.id("financeNotes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) throw new Error("Note not found");

    await ctx.db.delete(args.noteId);
    return true;
  },
});

// Save finance notes (backwards compatibility - creates or updates first note)
export const saveFinanceNotes = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user already has notes
    const existingNotes = await ctx.db
      .query("financeNotes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingNotes) {
      // Update existing notes
      await ctx.db.patch(existingNotes._id, {
        title: args.title,
        content: args.content,
        lastUpdated: new Date().toISOString(),
      });
      return existingNotes._id;
    } else {
      // Create new notes
      const notesId = await ctx.db.insert("financeNotes", {
        userId,
        title: args.title,
        content: args.content,
        lastUpdated: new Date().toISOString(),
      });
      return notesId;
    }
  },
});
