import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from './role.entity';
import { Session } from './session.entity';
import { AuditLog } from './audit-log.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ unique: true })
    username: string;

    @Column()
    @Exclude()
    password: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: false })
    emailVerified: boolean;

    @Column({ type: 'varchar', nullable: true })
    firstName: string | null;

    @Column({ type: 'varchar', nullable: true })
    lastName: string | null;

    @Column({ type: 'varchar', nullable: true })
    phoneNumber: string | null;

    // MFA fields
    @Column({ default: false })
    mfaEnabled: boolean;

    @Column({ type: 'varchar', nullable: true })
    @Exclude()
    mfaSecret: string | null;

    // Password reset
    @Column({ type: 'varchar', nullable: true })
    @Exclude()
    resetToken: string | null;

    @Column({ type: 'timestamp', nullable: true })
    resetTokenExpiry: Date | null;

    // Account security
    @Column({ type: 'timestamp', nullable: true })
    lastLoginAt: Date | null;

    @Column({ type: 'varchar', nullable: true })
    lastLoginIp: string | null;

    @Column({ default: 0 })
    failedLoginAttempts: number;

    @Column({ type: 'timestamp', nullable: true })
    lockedUntil: Date | null;

    // Relationships
    @ManyToMany(() => Role, role => role.users, { eager: true })
    @JoinTable({
        name: 'user_roles',
        joinColumn: { name: 'user_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
    })
    roles: Role[];

    @OneToMany(() => Session, session => session.user)
    sessions: Session[];

    @OneToMany(() => AuditLog, auditLog => auditLog.user)
    auditLogs: AuditLog[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Helper methods
    hasRole(roleName: string): boolean {
        return this.roles?.some(role => role.name === roleName) || false;
    }

    isLocked(): boolean {
        return !!this.lockedUntil && this.lockedUntil > new Date();
    }
}
