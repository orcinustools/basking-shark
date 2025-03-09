#!/bin/bash

# Build client
cd /workspace/devops-ai-agent/client
npm run build

# Start server
cd /workspace/devops-ai-agent/server
npm start