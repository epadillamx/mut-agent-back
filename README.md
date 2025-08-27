# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with auto-restart on file changes
- `npm run start` - Start production server
- `npm run test` - Run unit tests (currently runs test_unitario_largo_cambio_doble.js)
- `pm2 start ecosystem.config.cjs --env production` - Start with PM2 process manager for production

## Architecture Overview

This is a WhatsApp chatbot system built with Node.js, Express, LangGraph, and AWS Bedrock for AI processing. The system processes support tickets through a sophisticated workflow graph.

### Core Components

**LangGraph Workflow System** (`src/graph/`)
- `workflow.js` - Defines the main conversation flow graph using LangGraph StateGraph
- `state.js` - Manages conversation state, user data, and step definitions
- The workflow orchestrates different nodes based on ticket type and user responses

**Workflow Nodes** (`src/nodes/`)
- Each node handles a specific step in the ticket processing workflow
- Key nodes: `orquestador.node.js` (main orchestrator), `extractor.node.js` (data extraction), `validate.node.js` (validation), `confirmation.node.js` (ticket confirmation)
- Specialized change nodes: `cambiolocal.node.js`, `cambioextracto.node.js`, `cambiosin.node.js`

**Controllers** (`src/controllers/`)
- `chat.controller.js` - Main chat processing logic, manages user sessions and workflow execution
- `send.message.js` - Handles outbound WhatsApp message sending

**Services** (`src/services/`)
- `claude.service.js` - AWS Bedrock integration for AI processing
- `conversation.service.js` - Manages conversation persistence
- `database.service.js` - Database operations
- `validate.service.js` - Validation logic

**Configuration** (`src/config/`)
- `bedrock.js` - AWS Bedrock configuration and status checking
- `database.js` - PostgreSQL database configuration

### Key Features

- **Session Management**: Tracks user state across conversation turns
- **Multi-step Workflow**: Complex decision tree for different ticket types
- **AI Integration**: Uses AWS Bedrock (Claude) for natural language processing
- **Database Persistence**: PostgreSQL for storing conversations and tickets
- **WhatsApp Integration**: Webhook endpoints for Meta WhatsApp Business API

### Environment Variables

Requires `.env` file with:
- Database connection settings
- AWS Bedrock credentials
- WhatsApp verification tokens
- Server configuration

### Database

Uses PostgreSQL with tables for:
- `whatsapp_conversations` - Conversation tracking
- `whatsapp_conversation_messages` - Message history
- `whatsapp_conversation_states` - Workflow state persistence
- `whatsapp_tickets` - Generated support tickets
- `whatsapp_usuarios` - User information

### Testing

Multiple test files in `src/tests/` for different scenarios:
- Unit tests for various conversation flows
- Long conversation tests
- Double message handling tests

### Production Deployment

- Uses PM2 ecosystem configuration (`ecosystem.config.cjs`)
- Configured for port 80 in production
- Webhook endpoint: `/webhook` for WhatsApp integration
- Health check endpoint: `/healthcheck`