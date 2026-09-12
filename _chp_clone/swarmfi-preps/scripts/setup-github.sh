#!/bin/bash
# SwarmFi Perps — GitHub Repository Setup
# Run this script after creating a new repo at https://github.com/new

REPO_NAME="swarmfi-perps"
GITHUB_USER="zan-maker"

echo "═══════════════════════════════════════════════"
echo "  🐝 SwarmFi Perps — Repository Setup"
echo "═══════════════════════════════════════════════"
echo ""

# Create the GitHub repo using the API
# Requires: export GITHUB_TOKEN=<your-github-token>
if [ -n "$GITHUB_TOKEN" ]; then
    echo "📦 Creating GitHub repository..."
    curl -s -X POST https://api.github.com/user/repos \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        -d "{
            \"name\": \"$REPO_NAME\",
            \"description\": \"🐝 AI Agent Swarm Trading Signals for Perpetual Markets — Powered by dYdX v4\",
            \"homepage\": \"https://github.com/$GITHUB_USER/$REPO_NAME\",
            \"private\": false,
            \"has_issues\": true,
            \"has_projects\": true,
            \"has_wiki\": true,
            \"topics\": [\"defi\", \"perpetuals\", \"dydx\", \"ai-agents\", \"swarm-intelligence\", \"trading-signals\", \"hackathon\", \"nextjs\", \"typescript\"]
        }" > /dev/null 2>&1
    echo "✅ Repository created at: https://github.com/$GITHUB_USER/$REPO_NAME"
else
    echo "⚠️  No GITHUB_TOKEN found."
    echo "   Please create the repo manually at:"
    echo "   https://github.com/new"
    echo ""
    echo "   Then run:"
    echo "   git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git"
    echo "   git push -u origin master"
    echo ""
    exit 1
fi

# Add remote and push
echo "🔗 Adding remote..."
git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git" 2>/dev/null
git remote set-url origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"

echo "📤 Pushing to GitHub..."
git push -u origin master

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ Done! Repository is live at:"
echo "  https://github.com/$GITHUB_USER/$REPO_NAME"
echo "═══════════════════════════════════════════════"
