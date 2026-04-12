import type { AgentDto } from '@multiagent/shared';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-agent-sidebar',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './agent-sidebar.component.html',
  styleUrl: './agent-sidebar.component.css'
})
export class AgentSidebarComponent {
  @Input() public email: string | null = null;
  @Input() public agents: AgentDto[] = [];
  @Input() public avatarUrls: Record<string, string> = {};
  @Input() public selectedAgentId: string | null = null;
  @Input() public keyConfigured = false;
  @Input() public keyLast4: string | null = null;
  @Input() public title = 'Agentes';
  @Input() public subtitle = 'Biblioteca';
  @Input() public showAccountCard = true;

  @Output() public readonly createAgent = new EventEmitter<void>();
  @Output() public readonly selectAgent = new EventEmitter<string>();

  public trackById = (_: number, item: { id: string }) => item.id;
}
