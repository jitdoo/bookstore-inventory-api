import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBranchesTable1781893654511 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "branches" (
        "id"                  BIGSERIAL     PRIMARY KEY,
        "name"                VARCHAR(50)   NOT NULL,
        "code"                VARCHAR(30)   NOT NULL,
        "phone"               VARCHAR(30)   NULL,
        "zipcode"             VARCHAR(10)   NULL,
        "address"             VARCHAR(255)  NULL,
        "address_detail"      VARCHAR(255)  NULL,
        "open_date"           DATE          NULL,
        "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "deleted_at"          TIMESTAMPTZ   NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_branches_code_active"
        ON "branches" ("code")
        WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "branches"`);
  }
}
