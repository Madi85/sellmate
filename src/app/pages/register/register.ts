import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  displayName = '';
  email = '';
  password = '';

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) { }

  async register() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.displayName || !this.email || !this.password) {
      this.errorMessage = 'Bitte alle Felder ausfüllen.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Das Passwort muss mindestens 6 Zeichen haben.';
      return;
    }

    this.loading = true;

    try {
      const { data, error } = await this.supabaseService.signUp(
        this.email,
        this.password,
        this.displayName
      );

      

      if (error) {
        if (error.message.toLowerCase().includes('email address') &&
          error.message.toLowerCase().includes('invalid')) {
          this.errorMessage = 'Bitte gib eine gültige E-Mail-Adresse ein.';
        } else {
          this.errorMessage = error.message;
        }

        return;
      }

      if (data.session) {
       await this.router.navigate(['/dashboard']);
      } else {
        this.successMessage =
          'Registrierung erfolgreich. Bitte bestätige deine E-Mail.';
      }
    } catch (err) {
     
      this.errorMessage = 'Registrierung konnte nicht abgeschlossen werden.';
    } finally {
      this.loading = false;
    }
  }
}