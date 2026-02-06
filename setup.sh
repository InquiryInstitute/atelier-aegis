#!/bin/bash
# Setup script for Ægis Atelier project
# Defaults are pre-configured for Ægis — run without arguments for standard setup
#
# Usage: ./setup.sh [PROJECT_ID] [PROJECT_NAME] [FACULTY_ID]
# Defaults: aegis "Ægis" a.SimoneWeil

set -e

PROJECT_ID="${1:-aegis}"
PROJECT_NAME="${2:-Ægis}"
FACULTY_ID="${3:-a.SimoneWeil}"
GITHUB_ORG="${GITHUB_ORG:-InquiryInstitute}"
REPO_NAME="atelier-${PROJECT_ID}"

echo "Setting up Atelier instrument: $PROJECT_NAME"
echo "  Project ID:   $PROJECT_ID"
echo "  Faculty Lead:  $FACULTY_ID"
echo "  Repository:    $REPO_NAME"
echo ""

# Verify docs exist
if [ ! -f "docs/AEGIS.md" ]; then
    echo "Warning: docs/AEGIS.md not found — RAG corpus will be empty"
fi

echo "Setup verified."
echo ""
echo "Next steps:"
echo "  1. Create repository on GitHub: $GITHUB_ORG/$REPO_NAME"
echo "  2. git init && git remote add origin https://github.com/$GITHUB_ORG/$REPO_NAME.git"
echo "  3. git add . && git commit -m 'Ægis: instrument for attentive learning' && git push -u origin main"
echo "  4. Enable GitHub Pages: Settings → Pages → GitHub Actions"
echo ""
echo "Register in Supabase:"
echo "  INSERT INTO atelier_projects (id, name, description, faculty_lead_id, status, rag_enabled)"
echo "  VALUES ('$PROJECT_ID', '$PROJECT_NAME', 'An Atelier Instrument for Attentive Learning', '$FACULTY_ID', 'development', true);"
echo ""
