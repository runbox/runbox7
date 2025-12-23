#!/bin/bash
# Material Legacy Component Migration Script
# Migrates from @angular/material/legacy-* to @angular/material/*

echo "Starting Material Legacy Component Migration..."
echo "This will update import paths and class names across the codebase"
echo ""

# Find all TypeScript files with legacy imports
files=$(grep -rl "MatLegacy\|legacy-" src/ --include="*.ts")

# Count total files
total=$(echo "$files" | wc -l)
echo "Found $total files to migrate"
echo ""

# Migration mappings - import paths
declare -A path_mappings=(
    ["@angular/material/legacy-button"]="@angular/material/button"
    ["@angular/material/legacy-card"]="@angular/material/card"
    ["@angular/material/legacy-checkbox"]="@angular/material/checkbox"
    ["@angular/material/legacy-chips"]="@angular/material/chips"
    ["@angular/material/legacy-dialog"]="@angular/material/dialog"
    ["@angular/material/legacy-input"]="@angular/material/input"
    ["@angular/material/legacy-list"]="@angular/material/list"
    ["@angular/material/legacy-menu"]="@angular/material/menu"
    ["@angular/material/legacy-paginator"]="@angular/material/paginator"
    ["@angular/material/legacy-progress-bar"]="@angular/material/progress-bar"
    ["@angular/material/legacy-progress-spinner"]="@angular/material/progress-spinner"
    ["@angular/material/legacy-radio"]="@angular/material/radio"
    ["@angular/material/legacy-select"]="@angular/material/select"
    ["@angular/material/legacy-slide-toggle"]="@angular/material/slide-toggle"
    ["@angular/material/legacy-slider"]="@angular/material/slider"
    ["@angular/material/legacy-snack-bar"]="@angular/material/snack-bar"
    ["@angular/material/legacy-table"]="@angular/material/table"
    ["@angular/material/legacy-tabs"]="@angular/material/tabs"
    ["@angular/material/legacy-tooltip"]="@angular/material/tooltip"
    ["@angular/material/legacy-autocomplete"]="@angular/material/autocomplete"
    ["@angular/material/legacy-form-field"]="@angular/material/form-field"
)

# Process each file
counter=0
for file in $files; do
    counter=$((counter + 1))
    echo "[$counter/$total] Processing: $file"

    # Replace import paths
    for old_path in "${!path_mappings[@]}"; do
        new_path="${path_mappings[$old_path]}"
        sed -i "s|$old_path|$new_path|g" "$file"
    done

    # Replace class names (MatLegacy* -> Mat*)
    # This handles imports like: MatLegacyDialog as MatDialog -> MatDialog
    sed -i 's/MatLegacy\([A-Za-z]*\) as Mat\1/Mat\1/g' "$file"

    # Replace standalone MatLegacy* references
    sed -i 's/MatLegacy\([A-Za-z]*\)/Mat\1/g' "$file"
done

echo ""
echo "✓ Migration complete!"
echo "Files processed: $total"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff"
echo "2. Test the application: npm start"
echo "3. Run tests: npm test"
