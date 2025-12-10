# Examples

This directory contains example templates and configuration files for GitLab AI Code Review.

## Repository Context Files

Repository context files provide project-specific information to enhance AI code review quality.

### Available Templates

#### 1. `.aicodereview.example` - Full Template
Comprehensive example with all available sections:
- Repository type and structure
- Code style guidelines
- Review focus areas
- Custom skip patterns
- Technology stack notes
- Detailed instructions per area

**Use case**: Complex monorepos or projects with specific requirements

#### 2. `.aicodereview.minimal` - Minimal Template
Simple template with essential sections only:
- Repository structure
- Key skip patterns
- Basic review priorities

**Use case**: Simple projects or quick setup

## Usage

### 1. Choose a Template

```bash
# For comprehensive configuration
cp examples/.aicodereview.example .aicodereview

# For minimal configuration
cp examples/.aicodereview.minimal .aicodereview
```

### 2. Customize for Your Project

Edit the file with your project-specific details:

```bash
nano .aicodereview
```

### 3. Use in Reviews

```bash
# CLI review with context
gitlab-ai-review review -p <project-id> -m <mr-id> --context ./.aicodereview
```

## File Format

All context files use Markdown format with specific section headers:

```markdown
# Repository Context

## Repository Type
monorepo / polyrepo / library

## Project Structure
- Path/description pairs

## Code Style Guidelines
- Style rules and standards

## Review Focus Areas
- Priority areas for review

## Skip Patterns
- Files/directories to exclude

## Custom Instructions
Additional context-specific guidance
```

The parser extracts information from these sections to enhance the AI review process.

## Tips

1. **Be Specific**: More specific context = more relevant reviews
2. **Keep Updated**: Update context when project structure changes
3. **Focus on Priorities**: Highlight what matters most for your team
4. **Skip Patterns**: Reduce noise by excluding test fixtures, generated code
5. **Technology Stack**: Help AI understand framework-specific patterns

## Need Help?

See the main [README](../README.md) for complete documentation.
