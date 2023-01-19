import { log } from '@/utils'
import { Button, CircularProgress } from '@mui/material'
import { Component, ErrorInfo, ReactNode } from 'react'
import Wrapper from './Wrapper'

const ipcRenderer = window.ipcRenderer || false

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (
      error.message ===
        'Rendered fewer hooks than expected. This may be caused by an accidental early return statement.' ||
      error.message === 'Rendered more hooks than during the previous render.'
    ) {
      log.success('Changing Hooks:', error.message)
      setTimeout(() => {
        location.reload()
      }, 500)
    } else {
      log.error('Uncaught error:', error.message)
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Wrapper>
          <Button variant='text' onClick={() => location.reload()}>
            <CircularProgress
              color='secondary'
              size={200}
              sx={{ position: 'absolute' }}
            />
            Click to Reload
          </Button>
        </Wrapper>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
