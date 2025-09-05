#!/bin/bash

# Replace YOUR_GITHUB_USERNAME with your actual GitHub username
# Replace REPO_NAME with your repository name if different

echo "Setting up GitHub remote..."
git remote add origin https://github.com/jamesmb80/po3-manufacturing.git

echo "Pushing to GitHub..."
git branch -M main
git push -u origin main

echo "GitHub setup complete!"