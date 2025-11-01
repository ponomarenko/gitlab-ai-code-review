# Angular 18+ Best Practices

## New in Angular 18

### Zoneless Change Detection (Experimental)
Angular 18 introduces experimental zoneless change detection for better performance.

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
});
```

### Route Redirects as Functions
```typescript
const routes: Routes = [
  {
    path: 'old-path',
    redirectTo: () => {
      const router = inject(Router);
      return router.parseUrl('/new-path');
    }
  }
];
```

## Signals (Angular 16+)

### Signal Basics
Signals provide reactive state management with fine-grained change detection.

**Good:**
```typescript
import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  template: `
    <div>
      <p>Count: {{ count() }}</p>
      <p>Double: {{ double() }}</p>
      <button (click)="increment()">Increment</button>
    </div>
  `
})
export class CounterComponent {
  count = signal(0);
  double = computed(() => this.count() * 2);

  constructor() {
    effect(() => {
      console.log('Count changed:', this.count());
    });
  }

  increment() {
    this.count.update(value => value + 1);
  }
}
```

**Bad:**
```typescript
// Don't mix signals with traditional change detection unnecessarily
export class CounterComponent {
  count = signal(0);
  
  // Avoid - use computed instead
  get double() {
    return this.count() * 2; // Recalculates every CD cycle
  }
}
```

### Signal Inputs (Angular 17.1+)
```typescript
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-user-card',
  standalone: true,
  template: `
    <div>
      <h3>{{ name() }}</h3>
      <p>Age: {{ age() }}</p>
      <button (click)="delete.emit()">Delete</button>
    </div>
  `
})
export class UserCardComponent {
  // Required input
  name = input.required<string>();
  
  // Optional input with default
  age = input<number>(18);
  
  // Transform input
  email = input('', { 
    transform: (value: string) => value.toLowerCase() 
  });
  
  // Output
  delete = output<void>();
}
```

### Model Inputs (Two-way Binding with Signals)
```typescript
import { Component, model } from '@angular/core';

@Component({
  selector: 'app-search',
  standalone: true,
  template: `
    <input [ngModel]="query()" (ngModelChange)="query.set($event)" />
  `
})
export class SearchComponent {
  query = model<string>('');
}

// Usage in parent:
@Component({
  template: `<app-search [(query)]="searchTerm" />`
})
export class ParentComponent {
  searchTerm = signal('');
}
```

## Standalone Components (Default in Angular 18)

### Component Structure
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `...`,
  styles: [`...`]
})
export class ExampleComponent {}
```

### Standalone APIs
```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideAnimations(),
    // Custom providers
    { provide: API_URL, useValue: 'https://api.example.com' }
  ]
});
```

## Dependency Injection

### inject() Function (Modern Approach)
```typescript
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-list',
  standalone: true,
  template: `...`
})
export class UserListComponent {
  // Modern DI with inject()
  private http = inject(HttpClient);
  private router = inject(Router);
  
  users = signal<User[]>([]);

  ngOnInit() {
    this.loadUsers();
  }

  private loadUsers() {
    this.http.get<User[]>('/api/users')
      .subscribe(users => this.users.set(users));
  }
}
```

### Injection Context
```typescript
import { inject, runInInjectionContext, Injector } from '@angular/core';

export class MyService {
  private injector = inject(Injector);

  loadData() {
    // Run code in injection context
    runInInjectionContext(this.injector, () => {
      const http = inject(HttpClient);
      // Use http service
    });
  }
}
```

## Control Flow Syntax (Angular 17+)

### @if
```typescript
@Component({
  template: `
    @if (user(); as currentUser) {
      <div>Welcome, {{ currentUser.name }}!</div>
    } @else {
      <div>Please log in</div>
    }
  `
})
export class HeaderComponent {
  user = signal<User | null>(null);
}
```

### @for
```typescript
@Component({
  template: `
    @for (item of items(); track item.id) {
      <div class="item">{{ item.name }}</div>
    } @empty {
      <div>No items found</div>
    }
  `
})
export class ListComponent {
  items = signal<Item[]>([]);
}
```

### @switch
```typescript
@Component({
  template: `
    @switch (status()) {
      @case ('loading') {
        <app-spinner />
      }
      @case ('success') {
        <app-content [data]="data()" />
      }
      @case ('error') {
        <app-error [message]="errorMessage()" />
      }
      @default {
        <div>Unknown status</div>
      }
    }
  `
})
export class StatusComponent {
  status = signal<'loading' | 'success' | 'error'>('loading');
  data = signal<any>(null);
  errorMessage = signal('');
}
```

## Deferrable Views (Angular 17+)

### Lazy Loading Components
```typescript
@Component({
  template: `
    <!-- Load on viewport -->
    @defer (on viewport) {
      <app-heavy-component />
    } @placeholder {
      <div>Loading...</div>
    } @loading (minimum 2s) {
      <app-spinner />
    } @error {
      <div>Failed to load</div>
    }

    <!-- Load on interaction -->
    @defer (on interaction) {
      <app-comments />
    } @placeholder {
      <button>Load Comments</button>
    }

    <!-- Load on idle -->
    @defer (on idle) {
      <app-analytics />
    }

    <!-- Load on timer -->
    @defer (on timer(5s)) {
      <app-ads />
    }

    <!-- Prefetch on hover -->
    @defer (on hover; prefetch on idle) {
      <app-tooltip />
    }
  `
})
export class PageComponent {}
```

## HttpClient Best Practices

### Modern HTTP Interceptors
```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};

// Provide in app config
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, loggingInterceptor])
    )
  ]
};
```

### Resource API (Experimental)
```typescript
import { resource } from '@angular/core';

@Component({
  selector: 'app-user-profile',
  template: `
    @if (userResource.isLoading()) {
      <app-spinner />
    }
    @if (userResource.value(); as user) {
      <div>{{ user.name }}</div>
    }
    @if (userResource.error()) {
      <div>Error loading user</div>
    }
  `
})
export class UserProfileComponent {
  userId = input.required<string>();

  userResource = resource({
    request: () => ({ id: this.userId() }),
    loader: ({ request }) => this.http.get<User>(`/api/users/${request.id}`)
  });

  constructor(private http: HttpClient) {}
}
```

## RxJS Best Practices

### Use RxJS with Signals
```typescript
import { Component, signal } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

@Component({
  selector: 'app-timer',
  standalone: true,
  template: `
    <div>Timer: {{ time() }}</div>
    <div>Search: {{ searchResults() | json }}</div>
  `
})
export class TimerComponent {
  // Observable to Signal
  time = toSignal(interval(1000), { initialValue: 0 });

  // Signal to Observable
  searchQuery = signal('');
  searchQuery$ = toObservable(this.searchQuery);

  searchResults = toSignal(
    this.searchQuery$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.searchService.search(query))
    ),
    { initialValue: [] }
  );

  constructor(private searchService: SearchService) {}
}
```

### Async Pipe Alternatives
```typescript
// Instead of async pipe everywhere
@Component({
  template: `
    <div>{{ (users$ | async)?.length }} users</div>
    @for (user of users$ | async; track user.id) {
      <div>{{ user.name }}</div>
    }
  `
})

// Use toSignal for better performance
@Component({
  template: `
    <div>{{ users().length }} users</div>
    @for (user of users(); track user.id) {
      <div>{{ user.name }}</div>
    }
  `
})
export class UserListComponent {
  users$ = this.userService.getUsers();
  users = toSignal(this.users$, { initialValue: [] });
  
  constructor(private userService: UserService) {}
}
```

## Performance Optimization

### OnPush Change Detection
```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-user-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class UserCardComponent {
  // Use signals for automatic fine-grained updates
  user = input.required<User>();
  isExpanded = signal(false);
}
```

### TrackBy Functions
```typescript
@Component({
  template: `
    @for (item of items(); track trackById($index, item)) {
      <app-item [data]="item" />
    }
  `
})
export class ListComponent {
  items = signal<Item[]>([]);

  // TrackBy function for better performance
  trackById(index: number, item: Item): number {
    return item.id;
  }
}
```

### Lazy Loading Modules
```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => 
      import('./admin/admin.component').then(m => m.AdminComponent),
    children: [
      {
        path: 'users',
        loadComponent: () =>
          import('./admin/users/users.component').then(m => m.UsersComponent)
      }
    ]
  }
];
```

## Forms

### Reactive Forms with Signals
```typescript
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="name" />
      @if (nameError()) {
        <span class="error">{{ nameError() }}</span>
      }
      
      <input formControlName="email" type="email" />
      @if (emailError()) {
        <span class="error">{{ emailError() }}</span>
      }
      
      <button type="submit" [disabled]="!isValid()">Submit</button>
    </form>
  `
})
export class UserFormComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]]
  });

  // Convert form state to signals
  isValid = toSignal(this.form.statusChanges.pipe(
    map(() => this.form.valid)
  ), { initialValue: false });

  nameError = computed(() => {
    const control = this.form.get('name');
    if (control?.hasError('required')) return 'Name is required';
    if (control?.hasError('minlength')) return 'Name too short';
    return null;
  });

  emailError = computed(() => {
    const control = this.form.get('email');
    if (control?.hasError('required')) return 'Email is required';
    if (control?.hasError('email')) return 'Invalid email';
    return null;
  });

  onSubmit() {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}
```

### Typed Forms
```typescript
import { FormGroup, FormControl } from '@angular/forms';

interface UserForm {
  name: FormControl<string>;
  email: FormControl<string>;
  age: FormControl<number | null>;
}

@Component({...})
export class TypedFormComponent {
  form = new FormGroup<UserForm>({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    age: new FormControl<number | null>(null)
  });

  onSubmit() {
    // TypeScript knows the exact types
    const value: { name: string; email: string; age: number | null } = 
      this.form.value;
  }
}
```

## Testing

### Testing with Signals
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CounterComponent } from './counter.component';

describe('CounterComponent', () => {
  let component: CounterComponent;
  let fixture: ComponentFixture<CounterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
  });

  it('should increment count', () => {
    expect(component.count()).toBe(0);
    
    component.increment();
    
    expect(component.count()).toBe(1);
  });

  it('should compute double correctly', () => {
    component.count.set(5);
    
    expect(component.double()).toBe(10);
  });
});
```

### Testing HTTP with Signals
```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UserService
      ]
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch users', () => {
    const mockUsers = [{ id: 1, name: 'John' }];

    service.loadUsers();

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    
    req.flush(mockUsers);
    
    expect(service.users()).toEqual(mockUsers);
  });
});
```

## Common Pitfalls

### ❌ Don't Call Signals in Templates Multiple Times
```typescript
// Bad - signal called multiple times
@Component({
  template: `
    <div>{{ user().name }}</div>
    <div>{{ user().email }}</div>
    <div>{{ user().age }}</div>
  `
})

// Good - use alias with @if
@Component({
  template: `
    @if (user(); as currentUser) {
      <div>{{ currentUser.name }}</div>
      <div>{{ currentUser.email }}</div>
      <div>{{ currentUser.age }}</div>
    }
  `
})
```

### ❌ Don't Mutate Signal Values
```typescript
// Bad
const items = signal([1, 2, 3]);
items().push(4); // Mutates array without triggering updates

// Good
items.update(arr => [...arr, 4]);
```

### ❌ Don't Use Effects for Derived State
```typescript
// Bad
const count = signal(0);
const double = signal(0);
effect(() => {
  double.set(count() * 2);
});

// Good
const count = signal(0);
const double = computed(() => count() * 2);
```

### ❌ Don't Subscribe to Signals
```typescript
// Bad - signals don't have subscribe
const count = signal(0);
count.subscribe(value => console.log(value)); // Error!

// Good - use effect
effect(() => {
  console.log('Count:', count());
});
```

## Style Guide

### File Structure
```
src/
├── app/
│   ├── core/              # Singleton services
│   │   ├── auth/
│   │   └── services/
│   ├── shared/            # Shared components
│   │   ├── components/
│   │   ├── directives/
│   │   └── pipes/
│   ├── features/          # Feature modules
│   │   ├── users/
│   │   └── products/
│   └── app.component.ts
```

### Naming Conventions
- Components: `user-list.component.ts`
- Services: `user.service.ts`
- Pipes: `currency-format.pipe.ts`
- Directives: `highlight.directive.ts`
- Guards: `auth.guard.ts`
- Interceptors: `auth.interceptor.ts`

### Component Selector Prefix
```typescript
@Component({
  selector: 'app-user-card',  // Use 'app-' prefix
  // ...
})
```

## Accessibility

### ARIA and Semantic HTML
```typescript
@Component({
  template: `
    <nav aria-label="Main navigation">
      <button 
        aria-label="Open menu"
        [attr.aria-expanded]="isMenuOpen()"
        (click)="toggleMenu()">
        Menu
      </button>
    </nav>

    <main>
      <h1>Page Title</h1>
      @if (isLoading()) {
        <div role="status" aria-live="polite">
          Loading content...
        </div>
      }
    </main>
  `
})
export class LayoutComponent {
  isMenuOpen = signal(false);
  isLoading = signal(true);

  toggleMenu() {
    this.isMenuOpen.update(state => !state);
  }
}
```

## Resources

- [Official Angular Documentation](https://angular.dev)
- [Angular Blog](https://blog.angular.dev)
- [Angular GitHub](https://github.com/angular/angular)
- [Angular Style Guide](https://angular.dev/style-guide)