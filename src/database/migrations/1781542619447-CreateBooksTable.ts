import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBooksTable1730000000002 implements MigrationInterface {
  name = 'CreateBooksTable1730000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "books" (
        "id"             BIGSERIAL     PRIMARY KEY,
        "publisher_id"   BIGINT        NOT NULL,
        "title"          VARCHAR(300)  NOT NULL,
        "isbn"           VARCHAR(20)   NOT NULL,
        "price"          NUMERIC(12,2) NOT NULL,
        "published_date" DATE          NULL,
        "created_at"     TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "deleted_at"     TIMESTAMPTZ   NULL,
        CONSTRAINT "fk_books_publisher"
          FOREIGN KEY ("publisher_id") REFERENCES "publishers" ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_books_publisher_id" ON "books" ("publisher_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_books_isbn_active"
        ON "books" ("isbn")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "books"."isbn" IS 'Natural identifier; unique among non-deleted rows';
      COMMENT ON COLUMN "books"."price" IS 'List price; numeric to avoid floating-point error';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "books"`);
  }
}
