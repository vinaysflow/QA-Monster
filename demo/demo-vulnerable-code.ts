
// Demo file with security vulnerabilities for testing
export function vulnerableFunction(userInput: string) {
  // SQL Injection vulnerability
  const query = "SELECT * FROM users WHERE id = " + userInput;
  
  // XSS vulnerability
  if (typeof document !== 'undefined') {
    document.getElementById('output').innerHTML = userInput;
  }
  
  // Weak crypto
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(userInput).digest('hex');
  
  // Hardcoded credentials (example)
  const apiKey = "sk_test_FAKE_KEY_FOR_DEMO_ONLY_000000000";
  
  // eval usage
  eval(userInput);
  
  return query;
}

export function highComplexityFunction() {
  let result = 0;
  for (let i = 0; i < 100; i++) {
    for (let j = 0; j < 100; j++) {
      for (let k = 0; k < 100; k++) {
        if (i % 2 === 0) {
          if (j % 2 === 0) {
            if (k % 2 === 0) {
              result += i + j + k;
            }
          }
        }
      }
    }
  }
  return result;
}
