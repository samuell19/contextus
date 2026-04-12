import type { SessionDto } from '@multiagent/shared';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-session-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './session-sidebar.component.html',
  styleUrl: './session-sidebar.component.css'
})
export class SessionSidebarComponent {
  @Input() public hasAgents = false;
  @Input() public selectedAgentName: string | null = null;
  @Input() public selectedAgentId: string | null = null;
  @Input() public sessions: SessionDto[] = [];
  @Input() public selectedSessionId: string | null = null;
  @Input() public email: string | null = null;
  @Input() public keyConfigured = false;
  @Input() public keyLast4: string | null = null;

  @Output() public readonly createSession = new EventEmitter<void>();
  @Output() public readonly selectSession = new EventEmitter<SessionDto>();
  @Output() public readonly renameSession = new EventEmitter<SessionDto>();
  @Output() public readonly deleteSession = new EventEmitter<SessionDto>();
  @Output() public readonly openProfile = new EventEmitter<void>();
  @Output() public readonly openApiKeys = new EventEmitter<void>();
  @Output() public readonly logout = new EventEmitter<void>();

  public accountMenuOpen = false;

  public trackById = (_: number, item: { id: string }) => item.id;

  public formatDate(dateText: string | null) {
    return new Date(dateText ?? '').toLocaleString('pt-BR');
  }

  public get userInitial() {
    return this.email?.trim().charAt(0).toUpperCase() || 'U';
  }

  @HostListener('document:click')
  public closeAccountMenu() {
    this.accountMenuOpen = false;
  }

  public toggleAccountMenu(event: MouseEvent) {
    event.stopPropagation();
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  public handleProfileClick(event: MouseEvent) {
    event.stopPropagation();
    this.accountMenuOpen = false;
    this.openProfile.emit();
  }

  public handleApiKeysClick(event: MouseEvent) {
    event.stopPropagation();
    this.accountMenuOpen = false;
    this.openApiKeys.emit();
  }

  public handleLogoutClick(event: MouseEvent) {
    event.stopPropagation();
    this.accountMenuOpen = false;
    this.logout.emit();
  }
}
