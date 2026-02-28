
// Test file with security issues for SAST testing
export function vulnerableFunction(userInput: string) {
  // SQL Injection vulnerability
  const query = "SELECT * FROM users WHERE id = " + userInput;
  
  // XSS vulnerability
  document.getElementById('output').innerHTML = userInput;
  
  // Weak crypto
  const hash = require('crypto').createHash('md5').update(userInput).digest('hex');
  
  // Hardcoded credentials
  const apiKey = "sk_test_FAKE_KEY_FOR_DEMO_ONLY_000000000";
  
  // eval usage
  eval(userInput);
  
  return query;
}
