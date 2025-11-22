// Test script to explore Linear API data
// IMPORTANT: Set your Linear API key as an environment variable:
// export LINEAR_API_KEY='your_api_key_here'
// Or create a .env.local file with: NEXT_PUBLIC_LINEAR_API_KEY=your_api_key_here
const LINEAR_API_KEY = process.env.LINEAR_API_KEY || process.env.NEXT_PUBLIC_LINEAR_API_KEY;
const LINEAR_API_URL = 'https://api.linear.app/graphql';

if (!LINEAR_API_KEY) {
  console.error('ERROR: LINEAR_API_KEY or NEXT_PUBLIC_LINEAR_API_KEY environment variable is required');
  console.error('Set it with: export LINEAR_API_KEY="your_key_here"');
  process.exit(1);
}

// Rest of the test script would go here...
// This is a placeholder - the full test script should be added if needed

console.log('Linear API test script - API key loaded from environment variable');
