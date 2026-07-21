import { faker } from '@faker-js/faker';

const API_URL = 'https://left2serve.onrender.com/api';

async function register(role) {
  const name = faker.person.fullName();
  const email = faker.internet.email();
  const password = 'Password123!';
  
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      password,
      role,
      phone: faker.phone.number(),
      organization: role === 'ngo' ? faker.company.name() : undefined,
    }),
  });
  
  if (!res.ok) {
    const err = await res.json();
    console.error(`Failed to register ${role}:`, err);
    return null;
  }
  
  const data = await res.json();
  return { ...data, rawPassword: password, email };
}

async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return data.token;
}

async function createListing(token) {
  const res = await fetch(`${API_URL}/listings`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: faker.food.dish(),
      description: faker.food.description(),
      category: faker.helpers.arrayElement(['event', 'restaurant', 'hotel', 'caterer', 'household']),
      quantity: faker.number.int({ min: 10, max: 100 }),
      unit: 'servings',
      price: 0,
      expiry_date: faker.date.future().toISOString(),
      pickup_address: faker.location.streetAddress(),
      pickup_instructions: 'Ring the bell',
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude()
    }),
  });
  return res.json();
}

async function seed() {
  console.log('Starting API seed...');
  let usersCreated = 0;
  let listingsCreated = 0;

  for (let i = 0; i < 20; i++) {
    const donor = await register('donor');
    if (donor) {
      usersCreated++;
      const donorToken = await login(donor.email, donor.rawPassword);
      // Create 5 listings per donor
      for (let j = 0; j < 5; j++) {
        await createListing(donorToken);
        listingsCreated++;
      }
    }
  }

  for (let i = 0; i < 20; i++) {
    const ngo = await register('ngo');
    if (ngo) usersCreated++;
  }
  
  for (let i = 0; i < 10; i++) {
    const volunteer = await register('volunteer');
    if (volunteer) usersCreated++;
  }

  console.log(`Seed complete! Created ${usersCreated} users and ${listingsCreated} listings.`);
}

seed().catch(console.error);
