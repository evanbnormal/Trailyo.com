// This file is deprecated. Database schema is now managed by Prisma (see prisma/schema.prisma).

// import { pgTable, text, timestamp, integer, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';
// import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(), // In production, this should be hashed
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Trails table
export const trails = pgTable('trails', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  creatorId: uuid('creator_id').references(() => users.id).notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  price: integer('price'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Trail steps table
export const trailSteps = pgTable('trail_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  trailId: uuid('trail_id').references(() => trails.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  stepIndex: integer('step_index').notNull(),
  videoUrl: text('video_url'),
  skipCost: integer('skip_cost'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Analytics events table
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  trailId: uuid('trail_id').references(() => trails.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  eventType: text('event_type').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  trails: many(trails),
  analyticsEvents: many(analyticsEvents),
}));

export const trailsRelations = relations(trails, ({ one, many }) => ({
  creator: one(users, {
    fields: [trails.creatorId],
    references: [users.id],
  }),
  steps: many(trailSteps),
  analyticsEvents: many(analyticsEvents),
}));

export const trailStepsRelations = relations(trailSteps, ({ one }) => ({
  trail: one(trails, {
    fields: [trailSteps.trailId],
    references: [trails.id],
  }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  trail: one(trails, {
    fields: [analyticsEvents.trailId],
    references: [trails.id],
  }),
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id],
  }),
})); 