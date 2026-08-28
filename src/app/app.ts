import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SupabaseService } from './services/supabase';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class App implements OnInit {

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    const { data, error } = await this.supabaseService.client
      .from('platforms')
      .select('*');

    if (error) {
      console.error('Supabase Fehler:', error);
      return;
    }

    console.log('Supabase Verbindung funktioniert:', data);
  }
}