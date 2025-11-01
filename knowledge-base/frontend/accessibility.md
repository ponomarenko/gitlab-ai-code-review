# Web Accessibility Guidelines (WCAG)

## Core Principles (POUR)

### Perceivable
Users must be able to perceive information and UI components.

**Requirements:**
- Text alternatives for non-text content
- Captions and alternatives for multimedia
- Adaptable content structure
- Distinguishable foreground/background

### Operable
UI components and navigation must be operable.

**Requirements:**
- Keyboard accessible
- Enough time to read/use content
- No content causes seizures
- Navigable structure
- Multiple input modalities

### Understandable
Information and UI operation must be understandable.

**Requirements:**
- Readable text
- Predictable behavior
- Input assistance

### Robust
Content must be robust enough for assistive technologies.

## Essential Practices

### Semantic HTML
\`\`\`html
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Article Title</h1>
  </article>
</main>

<footer>
  <p>&copy; 2025 Company</p>
</footer>
\`\`\`

### ARIA Roles and Attributes
\`\`\`html
<!-- Use ARIA when semantic HTML isn't enough -->
<div role="button" tabindex="0" aria-pressed="false">
  Toggle
</div>

<!-- Live regions -->
<div role="alert" aria-live="assertive">
  Error: Form submission failed
</div>

<!-- Hidden content -->
<span class="visually-hidden">
  Additional context for screen readers
</span>
\`\`\`

### Focus Management
\`\`\`jsx
// Trap focus in modal
function Modal({ onClose, children }) {
  const modalRef = useRef();
  
  useEffect(() => {
    const firstFocusable = modalRef.current.querySelector('button, [href], input');
    firstFocusable?.focus();
    
    return () => {
      // Restore focus on close
    };
  }, []);
  
  return (
    <div role="dialog" aria-modal="true" ref={modalRef}>
      {children}
    </div>
  );
}
\`\`\`

### Color Contrast
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Don't rely on color alone

### Keyboard Navigation
\`\`\`jsx
function Button({ onClick, children }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };
  
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
\`\`\`

## Testing Checklist

- [ ] All images have alt text
- [ ] Forms have labels
- [ ] Heading hierarchy is logical
- [ ] Focus order is logical
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation works
- [ ] ARIA attributes are valid
- [ ] Screen reader testing completed

## Tools

- axe DevTools
- WAVE Browser Extension
- Lighthouse Accessibility Audit
- NVDA/JAWS screen readers