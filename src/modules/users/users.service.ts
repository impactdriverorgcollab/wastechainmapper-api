import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(email: string, password: string, role: UserRole = UserRole.PUBLIC_VIEWER) {
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await argon2.hash(password);
    return this.prisma.user.create({ data: { email, passwordHash, role } });
  }
}
