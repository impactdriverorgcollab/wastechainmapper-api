import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  // Verified against when the email is unknown, so response time does not reveal
  // whether an account exists.
  private dummyHash?: Promise<string>;

  constructor(
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);

    if (!user) {
      this.dummyHash ??= argon2.hash('not-a-real-password');
      await argon2.verify(await this.dummyHash, dto.password);
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });

    return {
      accessToken: token,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
    };
  }
}
