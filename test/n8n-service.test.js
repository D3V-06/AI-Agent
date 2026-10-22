/**
 * Automated Test Suite for N8nService & Session Management
 * Tests request payload contract, response extraction, error handling, and session tracking.
 */
import http from 'http';
import { N8nService } from '../src/js/n8n-service.js';

let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('--- STARTING N8N SERVICE TESTS ---');

  // Test 1: Webhook URL resolution & isTestWebhook check
  console.log('\n[Test 1] Webhook URL detection:');
  assert(N8nService.isTestWebhook('http://localhost:5678/webhook-test/student-risk'), 'Correctly identifies test webhook URL');
  assert(!N8nService.isTestWebhook('http://localhost:5678/webhook/student-risk'), 'Correctly identifies production webhook URL');

  // Test 2: Reply Extraction with various n8n response structures
  console.log('\n[Test 2] Response contract & fallback extraction:');
  
  // Standard contract
  const res1 = N8nService.extractReplyContent({ success: true, reply: 'Student APU-4821 is flagged for high risk.' });
  assert(res1 === 'Student APU-4821 is flagged for high risk.', 'Extracts direct "reply" property');

  // n8n array-wrapped format: [{ reply: "..." }]
  const res2 = N8nService.extractReplyContent([{ reply: 'Visa deadline alert' }]);
  assert(res2 === 'Visa deadline alert', 'Extracts reply from n8n item array');

  // n8n output property: { output: "..." }
  const res3 = N8nService.extractReplyContent({ output: 'Assessment complete' });
  assert(res3 === 'Assessment complete', 'Extracts fallback "output" property');

  // Plain text fallback
  const res4 = N8nService.extractReplyContent(null, 'Plain text report generated');
  assert(res4 === 'Plain text report generated', 'Handles plain text response');

  // Empty/missing reply fallback
  const res5 = N8nService.extractReplyContent({});
  assert(res5.includes('no reply content was returned'), 'Handles empty response safely without crashing');

  // Test 3: Local HTTP Server to verify actual POST request structure & headers
  console.log('\n[Test 3] Request payload contract { message, sessionId } & HTTP handling:');
  
  let capturedBody = null;
  let capturedHeaders = null;
  let serverMode = 'success'; // 'success' | '404' | '500' | 'timeout'

  const server = http.createServer((req, res) => {
    capturedHeaders = req.headers;
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        capturedBody = JSON.parse(body);
      } catch {
        capturedBody = body;
      }

      if (serverMode === 'success') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, reply: 'Student risk assessment completed.' }));
      } else if (serverMode === '404') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Workflow not active or test listener not running');
      } else if (serverMode === '500') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Node execution error in Google Sheets node' }));
      }
    });
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const mockTestUrl = `http://127.0.0.1:${port}/webhook-test/student-risk-assessment`;

  // Override getWebhookUrl for test
  const originalGetWebhookUrl = N8nService.getWebhookUrl;
  N8nService.getWebhookUrl = () => mockTestUrl;

  try {
    // 3a: Success POST test
    const sendResult = await N8nService.sendMessage({
      message: 'Check student risk status for APU-4821',
      sessionId: 'session-test-uuid-999'
    });

    assert(sendResult.success === true, 'Returns success: true');
    assert(sendResult.reply === 'Student risk assessment completed.', 'Returns correct extracted reply');
    assert(capturedHeaders['content-type'] === 'application/json', 'Sets Content-Type: application/json');
    assert(capturedBody?.message === 'Check student risk status for APU-4821', 'Payload contains "message" field');
    assert(capturedBody?.sessionId === 'session-test-uuid-999', 'Payload contains "sessionId" field');

    // 3b: Test 404 test listener guidance
    serverMode = '404';
    try {
      await N8nService.sendMessage({
        message: 'Hello',
        sessionId: 'session-test-uuid-999'
      });
      assert(false, 'Should have thrown on 404');
    } catch (err) {
      assert(err.message.includes('test webhook is currently not listening'), 'Provides helpful n8n test listener guidance on 404');
    }

    // 3c: Test 500 node execution error handling
    serverMode = '500';
    try {
      await N8nService.sendMessage({
        message: 'Hello',
        sessionId: 'session-test-uuid-999'
      });
      assert(false, 'Should have thrown on 500');
    } catch (err) {
      assert(err.message.includes('encountered an internal error'), 'Provides friendly explanation on n8n internal node failure');
    }

    // 3d: Network failure handling (unreachable port)
    N8nService.getWebhookUrl = () => 'http://127.0.0.1:19999/webhook/dead';
    try {
      await N8nService.sendMessage({
        message: 'Test network error',
        sessionId: 'session-test'
      });
      assert(false, 'Should have thrown on connection refused');
    } catch (err) {
      assert(err.message.includes('Unable to connect to the n8n webhook'), 'Handles network/connection failure gracefully');
    }

  } finally {
    N8nService.getWebhookUrl = originalGetWebhookUrl;
    server.close();
  }

  console.log(`\n--- TEST SUMMARY: ${passedCount}/${totalCount} assertions passed ---`);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
