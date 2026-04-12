import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-agent-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  templateUrl: './agent-editor.component.html',
  styleUrl: './agent-editor.component.css'
})
export class AgentEditorComponent {
  @Input() public editing = false;
  @Input() public agentName = '';
  @Input() public agentSystemPrompt = '';
  @Input() public agentDefaultModel = '';
  @Input() public agentRagEnabled = false;
  @Input() public agentRagTopK = 5;
  @Input() public closeLabel = 'Fechar';

  @Output() public readonly close = new EventEmitter<void>();
  @Output() public readonly deleteAgent = new EventEmitter<void>();
  @Output() public readonly saveAgent = new EventEmitter<void>();
  @Output() public readonly agentNameChange = new EventEmitter<string>();
  @Output() public readonly agentSystemPromptChange = new EventEmitter<string>();
  @Output() public readonly agentDefaultModelChange = new EventEmitter<string>();
  @Output() public readonly agentRagEnabledChange = new EventEmitter<boolean>();
  @Output() public readonly agentRagTopKChange = new EventEmitter<number>();
  @Output() public readonly avatarSelected = new EventEmitter<Event>();

  public handleNameChange(value: string) {
    this.agentNameChange.emit(value);
  }

  public handlePromptChange(value: string) {
    this.agentSystemPromptChange.emit(value);
  }

  public handleModelChange(value: string) {
    this.agentDefaultModelChange.emit(value);
  }

  public handleRagEnabledChange(value: boolean) {
    this.agentRagEnabledChange.emit(value);
  }

  public handleRagTopKChange(value: string | number) {
    const parsed = Number(value);
    const nextValue = Number.isFinite(parsed) ? Math.max(1, Math.min(20, Math.round(parsed))) : 5;
    this.agentRagTopKChange.emit(nextValue);
  }
}
