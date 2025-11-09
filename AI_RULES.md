# AI Rules for BeBetter Application

This document outlines the core technologies used in the BeBetter application and provides guidelines for library usage to maintain consistency and best practices.

## Tech Stack

The BeBetter application is built using a modern web development stack, focusing on performance, maintainability, and a great user experience.

*   **Frontend Framework**: React
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS
*   **UI Component Library**: shadcn/ui (built on Radix UI)
*   **Routing**: React Router DOM
*   **Backend as a Service (BaaS)**: Supabase (for authentication and database)
*   **Data Fetching & Caching**: TanStack Query (React Query)
*   **Form Management**: React Hook Form with Zod for validation
*   **Icons**: Lucide React
*   **Toast Notifications**: Sonner

## Library Usage Rules

To ensure a consistent and maintainable codebase, please adhere to the following guidelines when choosing libraries for specific functionalities:

*   **UI Components**: Always prioritize `shadcn/ui` components. If a specific component is not available in `shadcn/ui`, create a new component using Tailwind CSS for styling. Do not modify existing `shadcn/ui` component files directly.
*   **Styling**: Use Tailwind CSS exclusively for all styling. Avoid custom CSS files or inline styles unless absolutely necessary for dynamic, computed style values.
*   **Routing**: Use `react-router-dom` for all client-side navigation and routing.
*   **State Management**:
    *   For server-side state (data fetched from Supabase), use `@tanstack/react-query`.
    *   For local component state or simple global client state, use React's built-in `useState` and `useContext` hooks.
*   **Authentication & Database Interactions**: All authentication and database operations must be performed using the Supabase client (`@supabase/supabase-js`).
*   **Form Handling**: Implement forms using `react-hook-form` for state management and validation. Use `zod` for schema-based form validation with `@hookform/resolvers`.
*   **Icons**: Use icons from the `lucide-react` library.
*   **Toast Notifications**: For displaying transient messages to the user (e.g., success, error, info), use `sonner`.
*   **Date Pickers**: If a date picker is required, use `react-day-picker`.
*   **Charts/Data Visualization**: If data visualization is needed, use `recharts`.