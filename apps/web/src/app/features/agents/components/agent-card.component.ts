import type { AgentDto } from '@multiagent/shared';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-agent-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agent-card.component.html',
  styleUrl: './agent-card.component.css'
})
export class AgentCardComponent {
  @Input({ required: true }) public agent!: AgentDto;
  @Input() public avatarUrl: string | null = null;
  @Input() public menuOpen = false;

  @Output() public readonly openChat = new EventEmitter<void>();
  @Output() public readonly toggleMenu = new EventEmitter<void>();
  @Output() public readonly edit = new EventEmitter<void>();
  @Output() public readonly delete = new EventEmitter<void>();

  public get initial() {
    return this.agent.name.trim().charAt(0).toUpperCase() || 'A';
  }
}
