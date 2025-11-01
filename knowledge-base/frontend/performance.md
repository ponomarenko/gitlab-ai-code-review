# Frontend Performance Best Practices

## Core Web Vitals

### Largest Contentful Paint (LCP)
Target: < 2.5 seconds

**Optimize:**
- Use CDN for images and assets
- Implement lazy loading for images
- Preload critical resources
- Optimize server response time

```html
<!-- Preload critical images -->
<link rel="preload" as="image" href="/hero-image.jpg" />

<!-- Lazy load non-critical images -->
<img loading="lazy" src="/feature.jpg" alt="Feature" />
```

### First Input Delay (FID)
Target: < 100 milliseconds

**Optimize:**
- Break up long tasks
- Use web workers for heavy computation
- Defer non-critical JavaScript
- Optimize event handlers

```javascript
// Good: Break up long tasks
async function processLargeDataset(data) {
  const chunks = chunk(data, 100);
  
  for (const chunk of chunks) {
    await processChunk(chunk);
    // Yield to main thread
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

// Bad: Block main thread
function processLargeDataset(data) {
  data.forEach(item => processItem(item)); // Blocks for too long
}
```

### Cumulative Layout Shift (CLS)
Target: < 0.1

**Prevent:**
- Always specify image dimensions
- Reserve space for dynamic content
- Avoid inserting content above existing content
- Use CSS transforms for animations

```css
/* Good: Reserve space for image */
.image-container {
  aspect-ratio: 16 / 9;
  width: 100%;
}

/* Good: Use transforms (doesn't trigger layout) */
.animated {
  transform: translateX(100px);
  transition: transform 0.3s;
}

/* Bad: Use position (triggers layout) */
.animated {
  left: 100px;
  transition: left 0.3s;
}
```

## Code Splitting

### Dynamic Imports

```javascript
// React lazy loading
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

```javascript
// Vue lazy loading
const AdminPanel = () => import('./AdminPanel.vue');

export default {
  components: {
    AdminPanel
  }
};
```

```typescript
// Angular lazy loading
const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  }
];
```

### Route-Based Splitting

```javascript
// React Router
import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
}
```

## Asset Optimization

### Images

```html
<!-- Responsive images -->
<picture>
  <source srcset="image-large.webp" media="(min-width: 1200px)" type="image/webp">
  <source srcset="image-medium.webp" media="(min-width: 768px)" type="image/webp">
  <source srcset="image-small.webp" type="image/webp">
  <img src="image-small.jpg" alt="Description" loading="lazy" />
</picture>

<!-- Modern formats with fallback -->
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description" />
</picture>
```

**Image Optimization Checklist:**
- ✅ Use WebP/AVIF formats
- ✅ Implement lazy loading
- ✅ Serve responsive images
- ✅ Compress images (80-90% quality)
- ✅ Use CDN
- ✅ Add width/height attributes

### Fonts

```css
/* Preload critical fonts */
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>

/* Use font-display for better UX */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap; /* or 'optional' for performance */
}

/* Subset fonts to reduce size */
/* Only include needed characters */
```

## JavaScript Optimization

### Tree Shaking

```javascript
// Good: Import only what you need
import { debounce } from 'lodash-es';

// Bad: Import entire library
import _ from 'lodash';
```

### Code Splitting Strategies

```javascript
// Vendor splitting (webpack/vite)
export default {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

### Debouncing and Throttling

```javascript
// Debounce: Wait for user to stop typing
import { debounce } from 'lodash-es';

const handleSearch = debounce((query) => {
  searchAPI(query);
}, 300);

// Throttle: Limit scroll events
import { throttle } from 'lodash-es';

const handleScroll = throttle(() => {
  checkScrollPosition();
}, 100);

window.addEventListener('scroll', handleScroll);
```

## React Performance

### Memoization

```javascript
import { memo, useMemo, useCallback } from 'react';

// Memoize component
const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* Render data */}</div>;
});

// Memoize computed values
function DataTable({ data, filters }) {
  const filteredData = useMemo(() => {
    return data.filter(item => matchesFilters(item, filters));
  }, [data, filters]);

  return <Table data={filteredData} />;
}

// Memoize callbacks
function Parent() {
  const handleClick = useCallback(() => {
    doSomething();
  }, []);

  return <Child onClick={handleClick} />;
}
```

### Avoid Inline Functions and Objects

```javascript
// Bad: Creates new function on every render
function List({ items }) {
  return items.map(item => (
    <Item key={item.id} onClick={() => handleClick(item)} />
  ));
}

// Good: Use memoized callback
function List({ items }) {
  const handleClick = useCallback((item) => {
    doSomething(item);
  }, []);

  return items.map(item => (
    <Item key={item.id} onClick={() => handleClick(item)} />
  ));
}

// Bad: Creates new object on every render
<Component style={{ margin: 10 }} />

// Good: Define outside or use constant
const styles = { margin: 10 };
<Component style={styles} />
```

### Virtual Scrolling

```javascript
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

## Vue Performance

### v-show vs v-if

```vue
<!-- Use v-show for frequently toggled elements -->
<div v-show="isVisible">Frequently toggled</div>

<!-- Use v-if for conditionally rendered content -->
<div v-if="userIsAdmin">Admin panel</div>
```

### Computed Properties

```vue
<script setup>
import { computed } from 'vue';

const props = defineProps(['items']);

// Good: Use computed for derived state
const filteredItems = computed(() => {
  return props.items.filter(item => item.active);
});

// Bad: Computing in template
// <div v-for="item in items.filter(i => i.active)">
</script>
```

### Key Attribute

```vue
<!-- Good: Use stable, unique keys -->
<div v-for="item in items" :key="item.id">
  {{ item.name }}
</div>

<!-- Bad: Using index as key (can cause issues) -->
<div v-for="(item, index) in items" :key="index">
  {{ item.name }}
</div>
```

## Angular Performance

### OnPush Change Detection

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-user-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class UserListComponent {
  // This component only checks when:
  // 1. Input properties change (by reference)
  // 2. Events fire from template
  // 3. Manually triggered
}
```

### TrackBy Functions

```typescript
@Component({
  template: `
    <div *ngFor="let item of items; trackBy: trackById">
      {{ item.name }}
    </div>
  `
})
export class ListComponent {
  trackById(index: number, item: Item): number {
    return item.id; // Use unique identifier
  }
}
```

### Pipes and Pure Functions

```typescript
// Pure pipe (default) - only runs when inputs change
@Pipe({
  name: 'filter',
  pure: true // Default
})
export class FilterPipe implements PipeTransform {
  transform(items: any[], searchText: string): any[] {
    return items.filter(item => item.name.includes(searchText));
  }
}
```

## CSS Performance

### Avoid Expensive Properties

```css
/* Expensive (triggers layout and paint) */
.element {
  width: 100px;
  height: 100px;
  top: 50px;
}

/* Cheap (only triggers composite) */
.element {
  transform: translate(50px, 50px) scale(1.1);
  opacity: 0.8;
}
```

### Use CSS Containment

```css
/* Limit layout/paint scope */
.card {
  contain: layout paint;
}

.isolated-component {
  contain: layout style paint;
}
```

### Critical CSS

```html
<!-- Inline critical CSS -->
<style>
  /* Above-the-fold styles */
  .header { /* ... */ }
  .hero { /* ... */ }
</style>

<!-- Load non-critical CSS asynchronously -->
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="styles.css"></noscript>
```

## Network Optimization

### HTTP/2 and HTTP/3

```javascript
// Enable HTTP/2 server push (if supported)
// No bundling needed - can send multiple files efficiently
```

### Compression

```javascript
// Server configuration (Express example)
const compression = require('compression');
app.use(compression({
  level: 6, // 0-9, higher = better compression but slower
  threshold: 1024 // Only compress files > 1KB
}));
```

### Caching Strategies

```javascript
// Service Worker caching
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return cached response
      if (response) {
        return response;
      }
      
      // Fetch from network and cache
      return fetch(event.request).then((response) => {
        return caches.open('v1').then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
```

```html
<!-- Cache-Control headers -->
<meta http-equiv="Cache-Control" content="public, max-age=31536000, immutable">
```

## Monitoring and Measuring

### Performance API

```javascript
// Measure custom metrics
performance.mark('component-start');

// ... component rendering logic

performance.mark('component-end');
performance.measure('component-render', 'component-start', 'component-end');

const measure = performance.getEntriesByName('component-render')[0];
console.log(`Component rendered in ${measure.duration}ms`);
```

### Web Vitals Library

```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify(metric);
  // Use `navigator.sendBeacon()` if available, falling back to `fetch()`
  (navigator.sendBeacon && navigator.sendBeacon('/analytics', body)) ||
    fetch('/analytics', { body, method: 'POST', keepalive: true });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## Common Performance Pitfalls

### ❌ Large Bundle Sizes
**Problem**: Shipping too much JavaScript
**Solution**: 
- Code splitting
- Tree shaking
- Remove unused dependencies
- Use lighter alternatives

### ❌ Unoptimized Images
**Problem**: Serving large, uncompressed images
**Solution**:
- Use WebP/AVIF formats
- Implement lazy loading
- Serve responsive images
- Use image CDN

### ❌ Blocking Resources
**Problem**: CSS/JS blocks rendering
**Solution**:
- Inline critical CSS
- Defer non-critical JavaScript
- Use async/defer attributes
- Preload critical resources

### ❌ Too Many Re-renders
**Problem**: Components re-render unnecessarily
**Solution**:
- Use memoization
- Optimize state management
- Use proper keys in lists
- Implement virtual scrolling

### ❌ Memory Leaks
**Problem**: Event listeners not cleaned up
**Solution**:
```javascript
// Good: Cleanup in useEffect
useEffect(() => {
  const handler = () => console.log('Scroll');
  window.addEventListener('scroll', handler);
  
  return () => {
    window.removeEventListener('scroll', handler);
  };
}, []);
```

## Performance Budget

Set and enforce performance budgets:

```json
{
  "budgets": [
    {
      "type": "bundle",
      "name": "main",
      "maximumSize": "250kb"
    },
    {
      "type": "initial",
      "maximumSize": "500kb"
    }
  ]
}
```

## Tools

- **Lighthouse**: Audit performance, accessibility, SEO
- **Chrome DevTools**: Performance profiling
- **WebPageTest**: Real-world performance testing
- **Bundle Analyzer**: Analyze bundle size
- **React DevTools Profiler**: React-specific profiling
- **Vue DevTools**: Vue performance insights

## Resources

- [Web.dev Performance](https://web.dev/performance/)
- [MDN Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Web Vitals](https://web.dev/vitals/)