# SMPP Client Tester

JavaScript SMPP client for testing the KyaSmppServer.

## Setup

1. Install dependencies:
```bash
npm install
```

## Configuration

The client connects to:
- **Host**: localhost
- **Port**: 2775
- **System ID**: KYASMS
- **Password**: password

These match the server configuration in `application.properties`.

## Usage

### Run Basic Client
```bash
npm start
```

### Run Test Suite
```bash
npm test
```

## Test Scenarios

The test suite includes:

1. **Connection Test** - Verify binding to server
2. **Single SMS Test** - Send one message
3. **Multiple SMS Test** - Send several messages with delays
4. **Long Message Test** - Test with message > 160 chars
5. **Rapid Fire Test** - Send 10 messages quickly
6. **Keep Alive Test** - Test enquire_link for 30 seconds

## Files

- `index.js` - Main SMPP client class
- `test-client.js` - Comprehensive test suite
- `package.json` - Dependencies and scripts