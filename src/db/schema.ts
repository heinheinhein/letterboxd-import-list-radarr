import { integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const ids = sqliteTable("ids", {
    letterboxdId: integer().primaryKey(),
    tmdbId: integer().notNull(),
});
