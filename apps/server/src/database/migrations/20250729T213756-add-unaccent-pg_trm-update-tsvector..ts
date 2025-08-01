import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Update the pages tsvector trigger without unaccent
  await sql`
    CREATE OR REPLACE FUNCTION pages_tsvector_trigger() RETURNS trigger AS $$
    begin
        new.tsv :=
                  setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
                  setweight(to_tsvector('english', substring(coalesce(new.text_content, ''), 1, 1000000)), 'B');
        return new;
    end;
    $$ LANGUAGE plpgsql;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE OR REPLACE FUNCTION pages_tsvector_trigger() RETURNS trigger AS $$
    begin
        new.tsv :=
                  setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
                  setweight(to_tsvector('english', coalesce(new.text_content, '')), 'B');
        return new;
    end;
    $$ LANGUAGE plpgsql;
  `.execute(db);

  // No extensions to drop in PGLite
}
