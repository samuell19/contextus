import type { MessageDto } from '@multiagent/shared';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { marked } from 'marked';

import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, RouterLink],
  templateUrl: './chat-panel.component.html',
  styleUrl: './chat-panel.component.css'
})
export class ChatPanelComponent {
  @Input() public selectedAgentName: string | null = null;
  @Input() public selectedSessionTitle: string | null = null;
  @Input() public keyLast4: string | null = null;
  @Input() public chatStatusLabel = 'Aguardando';
  @Input() public chatStatusTone: 'success' | 'info' | 'warning' | 'neutral' = 'neutral';
  @Input() public messages: MessageDto[] = [];
  @Input() public draft = '';
  @Input() public streaming = false;
  @Input() public error = '';
  @Input() public hasAgent = false;
  @Input() public hasAgents = false;

  @Output() public readonly draftChange = new EventEmitter<string>();
  @Output() public readonly send = new EventEmitter<void>();

  public trackById = (_: number, item: { id: string }) => item.id;

  public renderMessageContent(message: MessageDto) {
    if (message.role === 'assistant') {
      return marked.parse(message.content, {
        breaks: true,
        gfm: true
      }) as string;
    }

    return this.escapeHtml(message.content).replace(/\n/g, '<br />');
  }

  public handleDraftChange(value: string) {
    this.draftChange.emit(value);
  }

  private escapeHtml(input: string) {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
