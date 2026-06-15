import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthorsTable1781532901444 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "authors" (
        "id"                  BIGSERIAL     PRIMARY KEY,
        "name"                VARCHAR(200)  NOT NULL,
        "country_code"        VARCHAR(3)    NULL,
        "birth_date"          DATE          NULL,
        "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "deleted_at"          TIMESTAMPTZ   NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "authors"`);
  }
}
