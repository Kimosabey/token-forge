import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('sessions')
export class Session {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    userId: string;

    @ManyToOne(() => User, user => user.sessions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ unique: true })
    @Index()
    refreshToken: string;

    @Column()
    expiresAt: Date;

    @Column({ nullable: true })
    ipAddress: string;

    @Column({ nullable: true })
    userAgent: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    revokedAt: Date;

    @Column({ nullable: true })
    revokedReason: string;

    @CreateDateColumn()
    createdAt: Date;

    // Helper methods
    isExpired(): boolean {
        return this.expiresAt < new Date();
    }

    isValid(): boolean {
        return this.isActive && !this.isExpired() && !this.revokedAt;
    }
}
