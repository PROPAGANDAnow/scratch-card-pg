# SRC Directory Structure Overview

This document provides a comprehensive overview of the `src/` directory structure, detailing the purpose of each subdirectory and key files within the Farcaster Mini App project.

## Directory Structure

```
src/
├── app/                 # Main application pages and routing (Next.js App Router)
├── components/          # Reusable UI components
├── hooks/               # Custom React hooks for state and logic
├── lib/                 # Utility functions, constants, and business logic
├── providers/           # React context providers and global state
└── interface/           # TypeScript interfaces and types
```

## Key Directories

### app/
Contains all pages, layouts, and routing logic using Next.js App Router. This is the entry point for all application routes.

### components/
Holds reusable UI components that can be shared across different parts of the application. Components should be modular and follow single responsibility principle.

### hooks/
Custom React hooks that encapsulate reusable logic and state management patterns. These hooks abstract complex functionality for use across components.

### lib/
Utility functions, constants, business logic, and integration code (e.g., blockchain, API clients). This directory contains helper functions that don't fit into other categories.

### providers/
React context providers for global state management. Contains context definitions, reducers, and state management logic.

### interface/
TypeScript interfaces and type definitions used throughout the application. Centralized type definitions ensure consistency across the codebase.

## Integration Patterns

1. **Component Composition**: Components should be designed to be composable and reusable
2. **Hook Abstraction**: Complex logic should be abstracted into custom hooks
3. **Context Usage**: Global state should be managed through React Context API
4. **Type Safety**: All components and functions should use TypeScript interfaces
5. **Separation of Concerns**: Business logic should be separated from UI components

## Best Practices

1. Use absolute imports with `~/` alias for src directory
2. Follow consistent naming conventions (PascalCase for components, camelCase for functions)
3. Maintain clear separation between UI components and business logic
4. Use TypeScript for all new code
5. Document complex functionality with JSDoc comments