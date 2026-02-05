## PR Checks

- [ ] Edge function secrets are correctly set in dev/staging/main
- [ ] Migration files checked for correctness and order
- [ ] No hardcoded text; all text in resources folder
- [ ] Weekly updates added to /docs/weekly/
- [ ] Release documentation files added in /docs/release/
- [ ] Proper environment variables referenced in code
- [ ] No API keys or secrets committed in the code — automated secret scanning only detects supported patterns; some secrets must be manually checked in the code
- [ ] PR has a proper title and description summarizing the changes
- [ ] Delete the test user for the Audit Bot from Supabase to ensure the bot functions correctly
