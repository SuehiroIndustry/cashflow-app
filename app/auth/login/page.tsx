'use client'

const login = async () => {
  await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}