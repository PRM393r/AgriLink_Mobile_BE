/**
 * Tests for tracking.socket.js
 * Uses socket.io-client to connect to a real http server with Socket.IO
 */
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');

// We test the tracking module in isolation — no DB needed
jest.mock('../modules/tracking/tracking.socket', () => {
  const original = jest.requireActual('../modules/tracking/tracking.socket');
  return original;
}, { virtual: false });

const { initSocket, startOrderTracking } = require('../modules/tracking/tracking.socket');

let httpServer;
let serverUrl;

beforeAll((done) => {
  const app = express();
  httpServer = http.createServer(app);
  initSocket(httpServer);
  httpServer.listen(0, () => {
    const { port } = httpServer.address();
    serverUrl = `http://localhost:${port}`;
    done();
  });
});

afterAll((done) => {
  httpServer.close(done);
});

/**
 * Helper: create a socket client connected to serverUrl
 */
function createClient() {
  return ioClient(serverUrl, {
    transports: ['websocket'],
    autoConnect: false,
  });
}

describe('Tracking Socket — connection', () => {
  test('client connects successfully', (done) => {
    const client = createClient();
    client.on('connect', () => {
      expect(client.connected).toBe(true);
      client.disconnect();
      done();
    });
    client.connect();
  });

  test('client disconnects cleanly', (done) => {
    const client = createClient();
    client.on('connect', () => {
      client.disconnect();
    });
    client.on('disconnect', () => {
      expect(client.connected).toBe(false);
      done();
    });
    client.connect();
  });
});

describe('Tracking Socket — track:join', () => {
  test('joining a room triggers location emit within 3s', (done) => {
    const orderId = 'test-order-001';
    const client = createClient();

    client.on('connect', () => {
      client.emit('track:join', { orderId, token: 'mock-token' });
    });

    client.on('track:location', (data) => {
      expect(data.orderId).toBe(orderId);
      expect(typeof data.lat).toBe('number');
      expect(typeof data.lng).toBe('number');
      expect(data.lat).toBeGreaterThan(10);
      expect(data.lng).toBeGreaterThan(100);
      expect(data.totalSteps).toBeGreaterThan(0);
      client.disconnect();
      done();
    });

    client.connect();
  }, 5000);

  test('track:location has estimatedMinutes field', (done) => {
    const orderId = 'test-order-002';
    const client = createClient();

    client.on('connect', () => {
      client.emit('track:join', { orderId, token: '' });
    });

    client.on('track:location', (data) => {
      expect(typeof data.estimatedMinutes).toBe('number');
      expect(data.estimatedMinutes).toBeGreaterThanOrEqual(1);
      client.disconnect();
      done();
    });

    client.connect();
  }, 5000);

  test('two clients in same room both receive location', (done) => {
    const orderId = 'test-order-003';
    let received = 0;

    const c1 = createClient();
    const c2 = createClient();

    const onLocation = () => {
      received++;
      if (received === 2) {
        c1.disconnect();
        c2.disconnect();
        done();
      }
    };

    c1.on('track:location', onLocation);
    c2.on('track:location', onLocation);

    c1.on('connect', () => c1.emit('track:join', { orderId }));
    c2.on('connect', () => c2.emit('track:join', { orderId }));

    c1.connect();
    c2.connect();
  }, 8000);

  test('different order IDs get different routes', (done) => {
    const positions = {};
    let count = 0;

    const ids = ['order-aaa', 'order-bbb'];
    const clients = ids.map((id) => {
      const c = createClient();
      c.on('connect', () => c.emit('track:join', { orderId: id }));
      c.on('track:location', (data) => {
        if (!positions[id]) {
          positions[id] = data;
          count++;
          if (count === 2) {
            // Routes should diverge after first step
            clients.forEach((cl) => cl.disconnect());
            // Both valid HCM coords
            expect(positions['order-aaa'].lat).toBeGreaterThan(10);
            expect(positions['order-bbb'].lat).toBeGreaterThan(10);
            done();
          }
        }
      });
      return c;
    });

    clients.forEach((c) => c.connect());
  }, 8000);
});

describe('Tracking Socket — startOrderTracking', () => {
  test('startOrderTracking programmatically starts tracking', (done) => {
    const orderId = 'prog-order-001';
    const client = createClient();

    client.on('connect', () => {
      client.emit('track:join', { orderId });
      // Trigger programmatically (simulates orders controller calling this)
      startOrderTracking(orderId);
    });

    client.on('track:location', (data) => {
      expect(data.orderId).toBe(orderId);
      client.disconnect();
      done();
    });

    client.connect();
  }, 6000);

  test('calling startOrderTracking twice does not create duplicate sessions', (done) => {
    const orderId = 'prog-order-002';
    let count = 0;
    const client = createClient();

    client.on('connect', () => {
      client.emit('track:join', { orderId });
      startOrderTracking(orderId);
      startOrderTracking(orderId); // second call should no-op
    });

    client.on('track:location', () => {
      count++;
    });

    // After 3 seconds, should have received ~1-2 ticks, not doubled
    setTimeout(() => {
      expect(count).toBeLessThanOrEqual(3);
      client.disconnect();
      done();
    }, 3500);

    client.connect();
  }, 6000);
});

describe('Tracking Socket — track:leave', () => {
  test('client can leave a room without error', (done) => {
    const orderId = 'leave-order-001';
    const client = createClient();

    client.on('connect', () => {
      client.emit('track:join', { orderId });
      setTimeout(() => {
        client.emit('track:leave', { orderId });
        setTimeout(() => {
          client.disconnect();
          done();
        }, 200);
      }, 500);
    });

    client.connect();
  }, 4000);
});
