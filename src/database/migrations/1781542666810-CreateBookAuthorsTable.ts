import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookAuthorsTable1730000000003 implements MigrationInterface {
  name = 'CreateBookAuthorsTable1730000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "book_authors" (
        "book_id"   BIGINT NOT NULL,
        "author_id" BIGINT NOT NULL,
        PRIMARY KEY ("book_id", "author_id"),
        CONSTRAINT "fk_book_authors_book"
          FOREIGN KEY ("book_id") REFERENCES "books" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_book_authors_author"
          FOREIGN KEY ("author_id") REFERENCES "authors" ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_book_authors_author_id" ON "book_authors" ("author_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "book_authors"`);
  }
}
