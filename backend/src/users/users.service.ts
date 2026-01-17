import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async findById(id: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['roles'],
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async update(id: string, dto: UpdateUserDto): Promise<User> {
        const user = await this.findById(id);

        Object.assign(user, dto);

        return this.userRepository.save(user);
    }

    async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
        const user = await this.userRepository.findOne({
            where: { id },
            select: ['id', 'password'] // We need the password field which is usually excluded
        });

        if (!user) throw new NotFoundException('User not found');

        const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
        if (!isMatch) {
            throw new BadRequestException('Current password is incorrect');
        }

        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(dto.newPassword, salt);

        await this.userRepository.save(user);
    }
}
