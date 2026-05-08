import type { MockAddress, MockOrder, MockUser } from '../types'

export const mockUser: MockUser = {
  id: 'u-demo',
  name: 'Jordan Avery',
  email: 'jordan@example.com',
  phone: '+1 (415) 555-0192',
}

export const mockAddresses: MockAddress[] = [
  {
    id: 'a1',
    label: 'Home',
    line1: '451 Market Street',
    line2: 'Unit 12B',
    city: 'San Francisco',
    region: 'CA',
    postal: '94105',
    country: 'United States',
  },
  {
    id: 'a2',
    label: 'Studio',
    line1: '88 Wythe Avenue',
    city: 'Brooklyn',
    region: 'NY',
    postal: '11249',
    country: 'United States',
  },
]

export const mockOrders: MockOrder[] = [
  {
    id: 'NA-24098',
    date: '2026-03-18',
    status: 'delivered',
    total: 418,
    items: 2,
    thumbnail:
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'NA-23901',
    date: '2026-02-02',
    status: 'shipped',
    total: 198,
    items: 1,
    thumbnail:
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'NA-23644',
    date: '2026-01-15',
    status: 'processing',
    total: 312,
    items: 3,
    thumbnail:
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=200&q=80',
  },
]
