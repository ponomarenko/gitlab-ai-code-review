# React Best Practices

## Component Design

### Single Responsibility Principle
Each component should have one clear purpose and handle one piece of functionality.

**Good:**
\`\`\`jsx
function UserProfile({ user }) {
  return (
    <div>
      <UserAvatar src={user.avatar} />
      <UserInfo name={user.name} email={user.email} />
    </div>
  );
}
\`\`\`

**Bad:**
\`\`\`jsx
function UserProfile({ user }) {
  // Too many responsibilities
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // ... handles data fetching, rendering, error handling
}
\`\`\`

## Hooks Best Practices

### useState
- Use descriptive state variable names
- Initialize with appropriate default values
- Don't mutate state directly

### useEffect
- Always specify dependencies array
- Clean up side effects
- Avoid putting functions in dependencies (use useCallback)

### Custom Hooks
- Start name with 'use'
- Extract reusable logic
- Return arrays or objects consistently

## Performance

### Memoization
\`\`\`jsx
const MemoizedComponent = React.memo(ExpensiveComponent);

const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);

const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
\`\`\`

### Code Splitting
\`\`\`jsx
const LazyComponent = React.lazy(() => import('./LazyComponent'));
\`\`\`

## Accessibility

### Semantic HTML
Use proper HTML elements: \`<button>\`, \`<nav>\`, \`<main>\`, etc.

### ARIA Attributes
\`\`\`jsx
<button aria-label="Close dialog" onClick={onClose}>
  <CloseIcon aria-hidden="true" />
</button>
\`\`\`

### Keyboard Navigation
Ensure all interactive elements are keyboard accessible.

## Testing

### Component Testing
\`\`\`jsx
test('renders user name', () => {
  render(<UserProfile user={mockUser} />);
  expect(screen.getByText(mockUser.name)).toBeInTheDocument();
});
\`\`\`

## Common Pitfalls

1. **Unnecessary re-renders**: Use React DevTools Profiler
2. **Missing keys in lists**: Always provide unique keys
3. **State updates in render**: Only in effects or event handlers
4. **Large bundle sizes**: Use code splitting and lazy loading
5. **Memory leaks**: Clean up effects, subscriptions, timers