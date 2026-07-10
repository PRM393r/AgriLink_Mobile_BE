const { Server } = require('socket.io');

let io = null;

// Active tracking sessions: orderId → { interval, stepIndex, route }
const activeSessions = new Map();

// ─── Mock waypoints (HCM city area) ──────────────────────────────────────────
// Simulates shipper leaving warehouse → moving toward buyer
const HCM_WAREHOUSE = { lat: 10.7769, lng: 106.7009 }; // Quận 1 HCM

const MOCK_DESTINATIONS = [
  { lat: 10.8231, lng: 106.6297 }, // Tân Bình
  { lat: 10.8526, lng: 106.7716 }, // Thủ Đức
  { lat: 10.7284, lng: 106.7227 }, // Quận 4
  { lat: 10.7392, lng: 106.6503 }, // Bình Thạnh
  { lat: 10.7957, lng: 106.6559 }, // Gò Vấp
];

/**
 * Interpolate N points between two lat/lng coordinates
 */
function interpolateRoute(start, end, steps = 30) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      lat: start.lat + (end.lat - start.lat) * t,
      lng: start.lng + (end.lng - start.lng) * t,
    });
  }
  return points;
}

/**
 * Build a realistic mock route with slight random deviation
 * to simulate actual road movement
 */
function buildMockRoute(orderId) {
  const destIndex = Math.abs(hashCode(orderId)) % MOCK_DESTINATIONS.length;
  const destination = MOCK_DESTINATIONS[destIndex];

  // Add 2 waypoints between warehouse and destination
  const mid1 = {
    lat: HCM_WAREHOUSE.lat + (destination.lat - HCM_WAREHOUSE.lat) * 0.33 + (Math.random() - 0.5) * 0.01,
    lng: HCM_WAREHOUSE.lng + (destination.lng - HCM_WAREHOUSE.lng) * 0.33 + (Math.random() - 0.5) * 0.01,
  };
  const mid2 = {
    lat: HCM_WAREHOUSE.lat + (destination.lat - HCM_WAREHOUSE.lat) * 0.66 + (Math.random() - 0.5) * 0.01,
    lng: HCM_WAREHOUSE.lng + (destination.lng - HCM_WAREHOUSE.lng) * 0.66 + (Math.random() - 0.5) * 0.01,
  };

  const seg1 = interpolateRoute(HCM_WAREHOUSE, mid1, 10);
  const seg2 = interpolateRoute(mid1, mid2, 10);
  const seg3 = interpolateRoute(mid2, destination, 10);

  return [...seg1, ...seg2, ...seg3];
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// ─── Socket.IO setup ──────────────────────────────────────────────────────────
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Buyer/seller joins room for a specific order
    socket.on('track:join', ({ orderId, token }) => {
      if (!orderId) return;
      const room = `order:${orderId}`;
      socket.join(room);
      console.log(`[Socket] ${socket.id} joined room ${room}`);

      // Start simulation if not already running
      if (!activeSessions.has(orderId)) {
        startTracking(orderId);
      } else {
        // Send current position immediately
        const session = activeSessions.get(orderId);
        const current = session.route[session.stepIndex];
        socket.emit('track:location', {
          orderId,
          ...current,
          stepIndex: session.stepIndex,
          totalSteps: session.route.length,
          estimatedMinutes: Math.ceil((session.route.length - session.stepIndex) * 2 / 60),
        });
      }
    });

    socket.on('track:leave', ({ orderId }) => {
      if (!orderId) return;
      socket.leave(`order:${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Start emitting location updates for an order every 2 seconds
 */
function startTracking(orderId) {
  const route = buildMockRoute(orderId);
  let stepIndex = 0;

  const session = { route, stepIndex, interval: null };
  activeSessions.set(orderId, session);

  const interval = setInterval(() => {
    const s = activeSessions.get(orderId);
    if (!s) return clearInterval(interval);

    const point = s.route[s.stepIndex];
    const room = `order:${orderId}`;
    const totalSteps = s.route.length;
    const remaining = totalSteps - s.stepIndex;
    const estimatedMinutes = Math.max(1, Math.ceil(remaining * 2 / 60));

    if (io) {
      io.to(room).emit('track:location', {
        orderId,
        lat: point.lat,
        lng: point.lng,
        stepIndex: s.stepIndex,
        totalSteps,
        estimatedMinutes,
      });
    }

    s.stepIndex++;

    if (s.stepIndex >= totalSteps) {
      // Reached destination
      if (io) {
        io.to(room).emit('track:arrived', { orderId });
      }
      clearInterval(interval);
      activeSessions.delete(orderId);
      console.log(`[Tracking] Order ${orderId} delivered`);
    }
  }, 2000);

  session.interval = interval;
}

/**
 * Manually trigger tracking when order status → shipping
 * Called from orders.controller.js
 */
function startOrderTracking(orderId) {
  if (!activeSessions.has(orderId)) {
    startTracking(orderId.toString());
  }
}

function getIo() {
  return io;
}

module.exports = { initSocket, startOrderTracking, getIo };
