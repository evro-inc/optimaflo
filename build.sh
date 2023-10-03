
# removing the .env.local file because 
# next uses it if it is present
rm -f ./.env.local

# if this is the staging deployment environment
if test "$ENV" = "sandbox"
  then
    # removing the .env.production file 
    # because otherwise next would use it
    # as the default .env file
    rm -f ./.env.production
    
    # renaming ".env.staging" to ".env.production" so that
    # next will use it as .env file
    mv ./.env.sandbox ./.env.production
  fi

# building the Next.js application
npm run next build