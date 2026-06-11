import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePublishersTable1781183371096 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "publishers" (
        "id"                  BIGSERIAL     PRIMARY KEY,
        "name"                VARCHAR(200)  NOT NULL,
        "business_number"     VARCHAR(50)   NOT NULL,
        "phone"               VARCHAR(30)   NULL,
        "email"               VARCHAR(255)  NULL,
        "zipcode"             VARCHAR(10)   NULL,
        "address"             VARCHAR(255)  NULL,
        "address_detail"      VARCHAR(255)  NULL,
        "contract_started_at" DATE          NULL,
        "contract_ended_at"   DATE          NULL,
        "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "deleted_at"          TIMESTAMPTZ   NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_publishers_business_number_active"
        ON "publishers" ("business_number")
        WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "publishers"`);
  }
}
