import { Link } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'

import { ROUTES } from '../../constants'

import { Button } from '../../components/common/Button'
import { FieldLabel, Input } from '../../components/common/Input'
import { Container } from '../../components/layout/Container'

export default function LoginPage() {
  const [done, setDone] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setDone(true)
  }

  return (
    <div className="pb-24">
      <Container className="py-16 md:py-24">
        <div className="mx-auto max-w-md">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Sign in</p>
            <h1 className="mt-3 font-serif text-4xl text-neutral-950">Welcome back</h1>
            <p className="mt-3 text-sm text-neutral-600">Authentication is UI-only for this MVP — no credentials stored.</p>
          </motion.div>

          {done ? (
            <p className="mt-10 text-sm text-emerald-700">Form submitted locally (demo). Wire to your auth API later.</p>
          ) : (
            <form onSubmit={submit} className="mt-10 space-y-6">
              <div>
                <FieldLabel id="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@domain.com" />
              </div>
              <div>
                <FieldLabel id="password">Password</FieldLabel>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-neutral-600">
                  <input type="checkbox" className="h-4 w-4 rounded-none border-neutral-400" />
                  Remember
                </label>
                <Link to="#" className="text-neutral-500 underline-offset-4 hover:underline">
                  Forgot password
                </Link>
              </div>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          )}

          <div className="mt-10 space-y-3">
            <p className="text-center text-[10px] uppercase tracking-[0.25em] text-neutral-400">Or continue with</p>
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="w-full text-[10px]">
                Google
              </Button>
              <Button type="button" variant="outline" className="w-full text-[10px]">
                Apple
              </Button>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-neutral-600">
            New here?{' '}
            <Link to={ROUTES.register} className="font-medium text-neutral-950 underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </Container>
    </div>
  )
}
