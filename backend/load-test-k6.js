import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const ErrorRate = new Rate('error_rate');
const ListingsLatency = new Trend('listings_latency');

export const options = {
  stages: [
    { duration: '20s', target: 50 },    // Warm up to 50 VUs
    { duration: '30s', target: 200 },   // Ramp up to 200 VUs
    { duration: '40s', target: 500 },   // Surge load: 500 VUs
    { duration: '30s', target: 1000 },  // Peak flash drop: 1000 VUs
    { duration: '20s', target: 0 },     // Ramp down / cool off
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300', 'p(99)<800'], // 95% of requests under 300ms
    'error_rate': ['rate<0.01'],                     // Less than 1% error rate
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5000';

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  }) || ErrorRate.add(1);

  sleep(0.1);

  // 2. Public Listings Feed with category filter
  const startListings = Date.now();
  const listingsRes = http.get(`${BASE_URL}/api/listings?limit=12&category=restaurant`);
  ListingsLatency.add(Date.now() - startListings);

  check(listingsRes, {
    'listings status is 200': (r) => r.status === 200,
    'listings has listings array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.listings);
      } catch (_) {
        return false;
      }
    },
  }) || ErrorRate.add(1);

  sleep(0.2);

  // 3. Proximity / Geo Search
  const geoRes = http.get(`${BASE_URL}/api/listings?lat=12.9716&lng=77.5946&distance=15&limit=8`);
  check(geoRes, {
    'geo search status is 200': (r) => r.status === 200,
  }) || ErrorRate.add(1);

  sleep(0.2);

  // 4. Scrape Prometheus Metrics
  const metricsRes = http.get(`${BASE_URL}/metrics`);
  check(metricsRes, {
    'metrics status is 200': (r) => r.status === 200,
    'contains http_requests_total': (r) => r.body.includes('http_requests_total'),
  }) || ErrorRate.add(1);

  sleep(0.5);
}

