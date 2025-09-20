import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from './Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-6">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2 arabic-text">
                حدث خطأ غير متوقع
              </h1>
              <p className="text-gray-600 arabic-text">
                نعتذر، حدث خطأ في النظام. يرجى المحاولة مرة أخرى.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                <h3 className="font-medium text-red-800 mb-2">Error Details:</h3>
                <pre className="text-xs text-red-700 overflow-auto">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            <div className="space-y-3">
              <Button onClick={this.handleReload} className="w-full">
                <RefreshCw className="ml-2 h-4 w-4" />
                إعادة تحميل الصفحة
              </Button>
              <Button 
                variant="outline" 
                onClick={this.handleGoHome} 
                className="w-full"
              >
                <Home className="ml-2 h-4 w-4" />
                العودة للرئيسية
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
