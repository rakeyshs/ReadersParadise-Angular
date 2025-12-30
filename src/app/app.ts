import { Component, signal } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,RouterModule,CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
 showSessionMessage = false;

  constructor() {}

  ngOnInit() {
 
  }

    protected readonly title = signal('Library');

}
