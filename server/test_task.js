const axios = require('axios');
const api = axios.create({ baseURL: 'http://localhost:5000/api' });

async function test() {
  // Login
  const login = await api.post('/auth/login', { email: 'abc@gmail.com', password: 'ABC' })
    .catch(e => e.response);
  console.log('Login:', login.status, login.data?.error || 'OK');

  const token = login.data.token;
  const authed = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { Authorization: 'Bearer ' + token },
  });

  // Try create task
  const res = await authed.post('/1/tasks', {
    name: 'Test Task',
    description: 'Testing',
    allocatedCost: 100,
    assignedTo: null,
  }).catch(e => {
    console.log('Status:', e.response?.status);
    console.log('Body:', JSON.stringify(e.response?.data));
    return e.response;
  });

  console.log('Task result:', res?.status, JSON.stringify(res?.data));
}

test();
