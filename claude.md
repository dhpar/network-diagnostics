# Bash commands
- npm run docker:watch: Run docker to watch for changes.
- npm run docker:build: Run docker to build the project.

# Code style
- Use ES modules (import/export) syntax, not CommonJS (require).
- Destructure imports when possible (eg. import { foo } from 'bar').

# Workflow
- Be sure to typecheck when you’re done making a series of code changes.
- On the Frontend folder:
    - Prefer running single tests, and not the whole test suite, for performance.
    - Prefer using functional components when using React or Next.
    - Prefer using the app router when using React.
    - Use Tailwind classes when styling.
- On the Backend folder: 
    - Use Python Flask.