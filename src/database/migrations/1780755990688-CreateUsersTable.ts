import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1780755990688 implements MigrationInterface {
  name = 'CreateUsersTable1780755990688';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"                  BIGSERIAL     PRIMARY KEY,
        "branch_id"           BIGINT        NULL,
        "email"               VARCHAR(255)  NOT NULL,
        "name"                VARCHAR(100)  NULL,
        "password_hash"       VARCHAR(255)  NOT NULL,
        "password_updated_at" TIMESTAMPTZ   NULL,
        "role"                VARCHAR(30)   NOT NULL,
        "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "deleted_at"          TIMESTAMPTZ   NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_users_email_active"
        ON "users" ("email")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_branch_id" ON "users" ("branch_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
