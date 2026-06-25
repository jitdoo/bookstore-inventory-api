import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';

export async function seedAdminUsers(dataSource: DataSource): Promise<void> {
  const emailsRaw = process.env.SEED_ADMIN_EMAILS ?? '';
  const password = process.env.DEFAULT_USER_PASSWORD;

  // Parse, clean, and deduplicate emails
  const emails = [
    ...new Set(
      emailsRaw
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.length > 0),
    ),
  ];

  // If no emails are provided, skip seeding without error
  if (emails.length === 0) {
    console.log(
      '[admin-users] No SEED_ADMIN_EMAILS provided. Skipping admin user seeding.',
    );
    return;
  }

  // If emails are provided, password must be set
  if (!password) {
    throw new Error(
      '[admin-users] DEFAULT_USER_PASSWORD is required when SEED_ADMIN_EMAILS is set.',
    );
  }

  // Create admin users
  const repo = dataSource.getRepository(User);
  const passwordHash = await argon2.hash(password);

  const users = emails.map((email) =>
    repo.create({
      email,
      passwordHash,
      passwordUpdatedAt: null,
      role: UserRole.SUPER_ADMIN,
      branchId: null,
    }),
  );

  await repo.save(users);
  console.log(`[admin-users] Created ${users.length} SUPER_ADMIN account(s).`);
}
