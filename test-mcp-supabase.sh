#!/bin/bash
# Test Supabase MCP Server Connection

echo "🔍 Testing Supabase MCP Server..."
echo ""

# Check if access token is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ SUPABASE_ACCESS_TOKEN is not set!"
  echo ""
  echo "To get your access token:"
  echo "1. Go to https://supabase.com/dashboard/account/tokens"
  echo "2. Create a new access token"
  echo "3. Add it to your .env.local file:"
  echo "   SUPABASE_ACCESS_TOKEN=your_token_here"
  echo ""
  echo "Then run: export SUPABASE_ACCESS_TOKEN=your_token_here"
  echo "Or restart Cursor to load from .env.local"
  exit 1
fi

echo "✅ Access token found: ${SUPABASE_ACCESS_TOKEN:0:20}..."
echo ""

PROJECT_REF="sicysobnnwqsqmakzgcu"

echo "Testing MCP server connection..."
echo "Project Reference: $PROJECT_REF"
echo ""

# Test the MCP server
npx -y @supabase/mcp-server-supabase@latest \
  --project-ref "$PROJECT_REF" \
  --access-token "$SUPABASE_ACCESS_TOKEN" \
  --help 2>&1 | head -20

echo ""
echo "✅ If you see help text above, the MCP server is installed correctly!"
echo ""
echo "To fully test, restart Cursor and ask:"
echo "  'What tables exist in my Supabase database?'"
