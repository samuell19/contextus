import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { StatusBadgeComponent } from '../../ui/status-badge/status-badge.component';

@Component({
  selector: 'app-workspace-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, StatusBadgeComponent],
  templateUrl: './workspace-nav.component.html',
  styleUrl: './workspace-nav.component.css'
})
export class WorkspaceNavComponent {
  @Input() public email: string | null = null;
  @Input() public keyConfigured = false;
  @Input() public keyLast4: string | null = null;
  @Input() public currentLabel = 'Workspace';
}
