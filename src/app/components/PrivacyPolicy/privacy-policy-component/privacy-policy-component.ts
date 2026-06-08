import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy-policy-component',
  imports: [RouterLink],
  templateUrl: './privacy-policy-component.html',
  styleUrl: './privacy-policy-component.scss',
})
export class PrivacyPolicyComponent {
  currentYear: number = new Date().getFullYear();


  scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}