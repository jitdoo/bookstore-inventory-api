import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePublisherDateColumns1781979647488 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "publishers" RENAME COLUMN "contract_started_at" TO "contract_start_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "publishers" RENAME COLUMN "contract_ended_at" TO "contract_end_date"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "publishers" RENAME COLUMN "contract_start_date" TO "contract_started_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "publishers" RENAME COLUMN "contract_end_date" TO "contract_ended_at"`,
    );
  }
}
