import { Link } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'

import { ROUTES } from '../../constants'

import { Button } from '../../components/common/Button'
import { FieldLabel, Input } from '../../components/common/Input'
import { Container } from '../../components/layout/Container'

export default function RegisterPage() {
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
            <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Register</p>
            <h1 className="mt-3 font-serif text-4xl text-neutral-950">Join the studio list</h1>
            <p className="mt-3 text-sm text-neutral-600">Create a profile UI — backend provisioning comes later.</p>
          </motion.div>

          {done ? (
            <p className="mt-10 text-sm text-emerald-700">Thanks — this is a static demo registration flow.</p>
          ) : (
            <form onSubmit={submit} className="mt-10 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel id="first">First name</FieldLabel>
                  <Input id="first" name="first" autoComplete="given-name" required />
                </div>
                <div>
                  <FieldLabel id="last">Last name</FieldLabel>
                  <Input id="last" name="last" autoComplete="family-name" required />
                </div>
              </div>
              <div>
                <FieldLabel id="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div>
                <FieldLabel id="password">Password</FieldLabel>
                <Input id="password" name="password" type="password" autoComplete="new-password" required />
              </div>
              <label className="flex items-start gap-2 text-xs text-neutral-600">
                <input type="checkbox" required className="mt-1 h-4 w-4 rounded-none border-neutral-400" />I agree to the
                terms and privacy policy (demo copy).
              </label>
              <Button type="submit" className="w-full">
                Create account
              </Button>
            </form>
          )}

          <div className="mt-10 space-y-3">
            <p className="text-center text-[10px] uppercase tracking-[0.25em] text-neutral-400">Or register with</p>
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
            Already have an account?{' '}
            <Link to={ROUTES.login} className="font-medium text-neutral-950 underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </Container>
    </div>
  )
}
