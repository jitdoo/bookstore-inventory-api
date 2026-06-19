import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { Publisher } from '../publishers/entities/publisher.entity';
import { Author } from '../authors/entities/author.entity';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Publisher, Author])],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
