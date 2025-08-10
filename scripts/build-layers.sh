#!/bin/bash

# Build Lambda layers for optimized deployment
set -e

echo "Building Lambda layers..."

# Create layers directory
mkdir -p layers/shared-dependencies/nodejs/node_modules
mkdir -p layers/heavy-dependencies/nodejs/node_modules

# Copy shared dependencies (lightweight)
echo "Building shared dependencies layer..."
cp -r node_modules/@middy layers/shared-dependencies/nodejs/node_modules/
cp -r node_modules/zod layers/shared-dependencies/nodejs/node_modules/
cp -r node_modules/nanoid layers/shared-dependencies/nodejs/node_modules/
cp -r node_modules/uuid layers/shared-dependencies/nodejs/node_modules/
cp -r node_modules/jsonwebtoken layers/shared-dependencies/nodejs/node_modules/
cp -r node_modules/http-status-codes layers/shared-dependencies/nodejs/node_modules/

# Copy heavy dependencies (Prisma, PDF-lib, bcrypt)
echo "Building heavy dependencies layer..."
cp -r node_modules/@prisma layers/heavy-dependencies/nodejs/node_modules/
cp -r node_modules/prisma layers/heavy-dependencies/nodejs/node_modules/
cp -r node_modules/pdf-lib layers/heavy-dependencies/nodejs/node_modules/
cp -r node_modules/bcrypt layers/heavy-dependencies/nodejs/node_modules/
cp -r node_modules/qrcode layers/heavy-dependencies/nodejs/node_modules/

# Create zip files
echo "Creating layer zip files..."
cd layers/shared-dependencies && zip -r ../shared-dependencies.zip . && cd ../..
cd layers/heavy-dependencies && zip -r ../heavy-dependencies.zip . && cd ../..

echo "Layers built successfully!"
echo "- shared-dependencies.zip: $(du -h layers/shared-dependencies.zip | cut -f1)"
echo "- heavy-dependencies.zip: $(du -h layers/heavy-dependencies.zip | cut -f1)"