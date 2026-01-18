import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

export enum AuditAction {
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    REGISTER = 'REGISTER',
    PASSWORD_CHANGE = 'PASSWORD_CHANGE',
    PASSWORD_RESET = 'PASSWORD_RESET',
    MFA_ENABLE = 'MFA_ENABLE',
    MFA_DISABLE = 'MFA_DISABLE',
    PROFILE_UPDATE = 'PROFILE_UPDATE',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
    TOKEN_REFRESH = 'TOKEN_REFRESH',
    FAILED_LOGIN = 'FAILED_LOGIN',
}

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    @Index()
    userId: string;

    @ManyToOne(() => User, user => user.auditLogs, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({
        type: 'enum',
        enum: AuditAction,
    })
    @Index()
    action: AuditAction;

    @Column({ nullable: true })
    ipAddress: string;

    @Column({ nullable: true })
    userAgent: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ default: true })
    success: boolean;

    @Column({ nullable: true })
    errorMessage: string;

    @CreateDateColumn()
    @Index()
    createdAt: Date;
}
