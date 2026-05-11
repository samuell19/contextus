import type { ContextBudgetDto, MessageDto } from '@multiagent/shared';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild, ElementRef } from '@angular/core';
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
  @Input() public contextBudget: ContextBudgetDto | null = null;
  @Input() public messages: any[] = [];
  @Input() public draft = '';
  @Input() public streaming = false;
  @Input() public error = '';
  @Input() public hasAgent = false;
  @Input() public hasAgents = false;

  @Output() public readonly draftChange = new EventEmitter<string>();
  @Output() public readonly send = new EventEmitter<void>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;

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

  public handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!this.streaming && this.hasAgent && this.draft.trim()) {
        this.send.emit();
      }
    }
  }

  public handleDraftChange(value: string) {
    this.draftChange.emit(value);
  }

  public contextUsagePercent() {
    if (!this.contextBudget) {
      return 0;
    }

    return Math.round(this.contextBudget.usageRatio * 100);
  }

  public contextUsageWidth() {
    return `${this.contextUsagePercent()}%`;
  }

  public contextBudgetCopy() {
    if (!this.contextBudget) {
      return 'Sem leitura de contexto ainda';
    }

    return `${this.contextBudget.usedPromptTokens} / ${this.contextBudget.maxPromptTokens} tok de prompt`;
  }

  public contextIndicators() {
    if (!this.contextBudget) {
      return [];
    }

    const indicators: string[] = [];

    if (this.contextBudget.summaryApplied) {
      indicators.push('Resumo ativo');
    }

    if (this.contextBudget.recentMessagesIncluded > 0) {
      indicators.push(`${this.contextBudget.recentMessagesIncluded} msg recentes`);
    }

    if (this.contextBudget.toolChunksUsed > 0) {
      indicators.push(`RAG ${this.contextBudget.toolChunksUsed} chunks`);
    }

    if (this.contextBudget.recentMessagesDropped > 0) {
      indicators.push(`Compactou ${this.contextBudget.recentMessagesDropped} msg`);
    }

    return indicators;
  }

  public hasContextCompaction() {
    return Boolean(this.contextBudget?.compacted);
  }

  private escapeHtml(input: string) {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  public forceScrollToBottom() {
    setTimeout(() => {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTo({
          top: this.scrollContainer.nativeElement.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 50);
  }
}
