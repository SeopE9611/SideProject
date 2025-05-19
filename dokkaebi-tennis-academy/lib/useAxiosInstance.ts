'use client';

import axios from 'axios';

export default function useAxiosInstance() {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '', // 상대 경로면 ''
    timeout: 1000 * 15,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  return instance;
}
