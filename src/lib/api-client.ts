import axios from 'axios';

const clientDefaults = {
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
  },
};

export const apiClient = axios.create({
  ...clientDefaults,
  baseURL: 'https://dummyjson.com',
});

export const legacyApiClient = axios.create({
  ...clientDefaults,
  baseURL: 'https://fakestoreapi.com',
});

export const appApiClient = axios.create(clientDefaults);
