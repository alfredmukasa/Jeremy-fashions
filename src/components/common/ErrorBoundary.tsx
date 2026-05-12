import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Something went wrong</p>
            <h1 className="mt-4 font-serif text-3xl text-neutral-950">The studio view could not render.</h1>
            <p className="mt-3 text-sm text-neutral-600">
              Refresh the page or return to the shop while we recover this session.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 text-[11px] font-medium uppercase tracking-[0.25em] underline"
            >
              Refresh
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
