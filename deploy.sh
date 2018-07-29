#!/bin/bash

# Shell script to deploy to S3.
# Requires s3-deploy. Install using 'npm install -g s3-deploy

if [[ -e dist ]]; then
    read -p "dist directory already exists. Continuing will delete it. Are you sure? " -n 1 -r
    echo    # (optional) move to a new line
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        rm -r dist
    else
        exit 1
    fi
fi

mkdir -p dist/au
cp -r css data img index.html js dist/au/
s3-deploy 'dist/**' --cwd='./dist/' --bucket=www.politicaldonations.info --region ap-southeast-2
