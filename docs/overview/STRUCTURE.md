# Codebase Structure Documentation

This documentation provides a comprehensive overview of the project structure and organization, detailing the purpose of each directory and key files within the Farcaster Mini App.

## Overview

The project follows a modular architecture with clear separation of concerns, using Next.js App Router for routing, React Context for state management, and a component-based UI architecture.

## Directory Structure

```
src/
├── app/                 # Main application pages and routing (Next.js App Router)
├── components/          # Reusable UI components
├── hooks/               # Custom React hooks for state and logic
├── lib/                 # Utility functions, constants, and business logic
├── providers/           # React context providers and global state
└── interface/           # TypeScript interfaces and types

docs/
└── overview/            # Codebase structure documentation
```

## Detailed Documentation

For detailed information about each directory, refer to the specific documentation files:

1. [SRC Directory Structure](./STRUCTURE_SRC.md) - Overview of the src directory
2. [App Directory Structure](./STRUCTURE_APP.md) - Next.js App Router structure and pages
3. [Components Directory Structure](./STRUCTURE_COMPONENTS.md) - UI components documentation
4. [Hooks Directory Structure](./STRUCTURE_HOOKS.md) - Custom React hooks documentation

## Key Architectural Patterns

### 1. Next.js App Router
The application uses Next.js App Router for file-based routing, with each directory in `src/app/` representing a route.

### 2. React Context with Reducer
Global state management is implemented using React Context API with a reducer pattern for predictable state updates.

### 3. Component-Based Architecture
UI is built using reusable, composable components with clear separation of concerns.

### 4. Custom Hooks
Complex logic is abstracted into custom hooks for reusability and testability.

### 5. TypeScript Integration
Strong typing is enforced throughout the codebase with TypeScript interfaces and type definitions.

## Development Guidelines

### When Adding New Features
1. Check existing documentation to understand patterns and conventions
2. Follow established naming conventions
3. Maintain consistent code style
4. Update documentation when adding new patterns or concepts

### Code Organization
1. Keep components focused and single-purpose
2. Abstract complex logic into hooks
3. Use context for truly global state only
4. Maintain clear separation between UI and business logic

### Performance Considerations
1. Use React.memo for expensive components
2. Implement useMemo and useCallback for optimization
3. Use virtualized rendering for large lists
4. Batch state updates when possible

## Best Practices

1. **Consistency**: Follow established patterns and conventions
2. **Documentation**: Keep documentation synchronized with implementation
3. **Type Safety**: Use TypeScript for all new code
4. **Performance**: Optimize for mobile performance
5. **Accessibility**: Follow accessibility guidelines
6. **Testing**: Write testable code with clear interfaces