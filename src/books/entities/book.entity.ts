import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Publisher } from '../../publishers/entities/publisher.entity';
import { Author } from '../../authors/entities/author.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index('idx_books_publisher_id')
  @Column({ type: 'bigint', name: 'publisher_id' })
  publisherId!: string;

  @ManyToOne(() => Publisher)
  @JoinColumn({ name: 'publisher_id' })
  publisher!: Publisher;

  @Column({ type: 'varchar', length: 300 })
  title!: string;

  @Column({ type: 'varchar', length: 20 })
  isbn!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price!: string;

  @Column({ type: 'date', name: 'published_date', nullable: true })
  publishedDate!: string | null;

  @ManyToMany(() => Author)
  @JoinTable({
    name: 'book_authors',
    joinColumn: { name: 'book_id' },
    inverseJoinColumn: { name: 'author_id' },
  })
  authors!: Author[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
