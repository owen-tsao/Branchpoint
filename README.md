# BranchPoint

BranchPoint is an AI-powered decision-support app that helps users explore major life choices using Git-like branching. Users create a decision, generate possible paths, simulate outcomes with a "Future You" AI persona, compare tradeoffs, and commit to a final direction with clearer confidence.

## Highlights

- Built a full-stack TypeScript application with a React/Vite frontend and an AWS serverless backend.
- Uses AWS Lambda, API Gateway, and DynamoDB to create, store, simulate, compare, and commit decision branches.
- Integrates Amazon Bedrock with Claude models to generate decision branches, future-self simulations, clarifying questions, comparisons, and action plans.
- Provides an interactive Life Tree workflow for visualizing decision paths and exploring follow-up choices.
- Includes local development tooling for running the React app and backend API together.

## Tech Stack

**Frontend**

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Query
- React Router
- Axios

**Backend**

- Node.js 18
- TypeScript
- AWS Lambda
- API Gateway
- DynamoDB
- Amazon Bedrock
- Serverless Framework

## Project Structure

```text
.
├── README.md
├── PRD.json
└── branchpoint/
    ├── README.md
    ├── package.json
    ├── backend/
    │   ├── functions/
    │   ├── serverless.yml
    │   └── package.json
    └── frontend/
        ├── src/
        ├── vite.config.ts
        └── package.json
```

## Core Flow

1. Create a decision with context and a starting confidence score.
2. Generate or manually add decision branches.
3. Simulate each branch with AI-generated future-self scenarios.
4. Compare branches with AI-generated tradeoffs, conflicts, and recommendations.
5. Commit to a final path and track the confidence change.

## Getting Started

The application lives in the `branchpoint/` directory.

```bash
cd branchpoint
npm install
npm run dev
```

This starts the frontend and backend development servers together.

## Backend Setup

```bash
cd branchpoint/backend
npm install
cp env.example .env
npm run dev
```

The backend can also be run with Serverless Offline:

```bash
npm run dev:serverless
```

## Frontend Setup

```bash
cd branchpoint/frontend
npm install
npm run dev
```

By default, the frontend API client targets the local backend development URL.

## Environment Variables

Backend environment variables are documented in `branchpoint/backend/env.example`.

Common values include:

```env
AWS_REGION=us-east-1
BEDROCK_MODEL=anthropic.claude-v2
COGNITO_USER_POOL_ID=your-cognito-user-pool-id
COGNITO_USER_POOL_CLIENT_ID=your-cognito-user-pool-client-id
STATSIG_SERVER_KEY=your-statsig-server-key
```

Do not commit real `.env` files or credentials.

## Useful Commands

```bash
# From branchpoint/
npm run dev
npm run build
npm test

# Backend only
cd branchpoint/backend
npm run build
npm run deploy

# Frontend only
cd branchpoint/frontend
npm run build
```

## Notes

This project was built as an MVP/demo application. Some authentication and analytics integrations are demo-ready or environment-driven, while the core product flow focuses on decision branching, AI simulation, comparison, and action planning.
