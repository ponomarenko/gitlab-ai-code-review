# Knowledge Base for RAG

This directory contains best practices and guidelines used by the AI Code Review bot through RAG (Retrieval-Augmented Generation).

## Purpose

The knowledge base files are used to provide context-aware code review feedback by:

1. **Dify RAG Integration**: Files are uploaded to Dify as a knowledge base
2. **Local Fallback**: Read directly from filesystem when Dify is unavailable
3. **Contextual Assistance**: Provide relevant best practices during code review

## Structure

```
knowledge-base/
├── frontend/
│   ├── react-best-practices.md      # React 18+ patterns
│   ├── vue-best-practices.md        # Vue.js guidelines
│   ├── angular-best-practices.md    # Angular 18+ best practices
│   ├── accessibility.md             # WCAG & ARIA guidelines
│   ├── performance.md               # Web performance optimization
│   └── security.md                  # Frontend security practices
└── backend/
    ├── nestjs-best-practices.md    # NestJS framework guidelines
    ├── api-design.md               # RESTful API design
    └── security.md                 # Backend security
```

## How It Works

### 1. Automated Upload to Dify

Run the setup script to automatically upload all knowledge base files to Dify:

```bash
npm run setup:knowledge-base
```

The script will:
- Scan all `.md` files in `knowledge-base/`
- Create or update a Dify dataset
- Upload documents with proper indexing
- Configure retrieval settings

### 2. Usage During Code Review

When reviewing code, the RAG service:

1. **Analyzes the file** being reviewed (e.g., `UserComponent.jsx`)
2. **Determines category** (React, Angular, etc.)
3. **Queries knowledge base** for relevant best practices
4. **Enhances AI prompt** with contextual guidelines
5. **Provides targeted feedback** based on best practices

### 3. Local Fallback

If Dify RAG is unavailable, the system automatically:
- Searches local markdown files
- Extracts relevant sections
- Provides context from local knowledge base

This ensures the bot always has access to best practices.

## Adding New Content

### Create New File

1. Add markdown file to appropriate category:
   ```bash
   touch knowledge-base/frontend/nextjs-best-practices.md
   ```

2. Write content following this structure:
   ```markdown
   # Title
   
   ## Section 1
   Content with code examples...
   
   ## Section 2
   More guidelines...
   
   ## Common Pitfalls
   Things to avoid...
   ```

3. Upload to Dify:
   ```bash
   npm run setup:knowledge-base
   ```

### Update Existing File

1. Edit the markdown file
2. Re-run setup to sync with Dify:
   ```bash
   npm run setup:knowledge-base
   ```

## Best Practices for Knowledge Base Files

### Structure
- Use clear hierarchical headings (`#`, `##`, `###`)
- Include code examples in triple backticks
- Add language tags for syntax highlighting

### Content
- Focus on actionable advice
- Include "Good" and "Bad" examples
- Reference official documentation
- Keep examples concise and focused

### Examples
```markdown
## Good Example
\`\`\`javascript
// Clear, maintainable code
const user = { name: 'John', age: 30 };
\`\`\`

## Bad Example (Avoid)
\`\`\`javascript
// Unclear, hard to maintain
const u = { n: 'John', a: 30 };
\`\`\`
```

### Categories to Cover
- Core concepts
- Common patterns
- Performance optimization
- Security considerations
- Accessibility guidelines
- Testing strategies
- Error handling
- Best practices
- Common pitfalls

## Integration with Review Service

The RAG service automatically:

1. **Detects file type**: `.jsx` → React, `.vue` → Vue, etc.
2. **Extracts patterns**: State management, async ops, API calls
3. **Builds focused query**: "React component with state management"
4. **Retrieves context**: Relevant sections from knowledge base
5. **Enhances review**: AI uses context for better feedback

## Maintenance

### Keeping Content Updated

- Review and update files quarterly
- Add new patterns as frameworks evolve
- Remove deprecated practices
- Update links to official documentation

### Quality Checks

- ✅ Code examples are tested
- ✅ Links are valid
- ✅ Content is accurate
- ✅ Examples follow current best practices
- ✅ No sensitive information included

## Environment Variables

Configure in `.env`:

```env
# Enable/disable RAG
RAG_ENABLED=true

# Knowledge base name in Dify
RAG_KNOWLEDGE_BASE=frontend-best-practices

# Dify API settings
DIFY_API_KEY=app-your-key
DIFY_API_URL=https://api.dify.ai/v1
```

## Troubleshooting

### Setup Script Fails

**Problem**: "Error: DIFY_API_KEY not found"
**Solution**: Ensure `.env` file has `DIFY_API_KEY` set

**Problem**: "Dataset creation failed"
**Solution**: Check Dify API key permissions and account limits

### RAG Not Working

**Problem**: No context in reviews
**Solution**: 
1. Check `RAG_ENABLED=true` in `.env`
2. Verify dataset exists in Dify
3. Check logs for RAG errors
4. Verify local files exist as fallback

### Outdated Content

**Problem**: Bot provides outdated advice
**Solution**: 
1. Update markdown files
2. Run `npm run setup:knowledge-base`
3. Wait for Dify to re-index

## Resources

- [Dify Documentation](https://docs.dify.ai)
- [RAG Best Practices](https://docs.dify.ai/guides/knowledge-base)
- [Markdown Guide](https://www.markdownguide.org/)

## Contributing

When adding or updating knowledge base content:

1. Follow the existing structure
2. Include practical examples
3. Reference authoritative sources
4. Test code examples
5. Update this README if adding new categories