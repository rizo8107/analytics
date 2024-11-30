import PocketBase from 'pocketbase';

// Create a single instance of PocketBase
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');

// Export both the instance and the class
export { pb as default, PocketBase };
