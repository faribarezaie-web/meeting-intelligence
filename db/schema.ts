import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";

export const meetingStatusEnum = pgEnum("meeting_status", [
  "pending",
  "fetching_audio",
  "transcribing",
  "summarizing",
  "extracting_tasks",
  "assigning_tasks",
  "completed",
  "failed",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "completed",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
]);

export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  status: meetingStatusEnum("status").notNull().default("pending"),
  blobUrl: text("blob_url"),
  youtubeUrl: text("youtube_url"),
  transcript: text("transcript"),
  summary: text("summary"),
  workflowRunId: text("workflow_run_id"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignedToEmail: text("assigned_to_email"),
  status: taskStatusEnum("status").notNull().default("todo"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  googleId: text("google_id").unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: text("email").unique().notNull(),
  role: varchar("role", { length: 255 }),
  department: varchar("department", { length: 255 }),
  expertise: jsonb("expertise").$type<string[]>().default([]),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
});

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Employee = typeof employees.$inferSelect;
