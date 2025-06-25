'use client';

import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  timeout: 15000,
  withCredentials: true, // 쿠키 인증의 핵심
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export default function useAxiosInstance() {
  return instance;
}
