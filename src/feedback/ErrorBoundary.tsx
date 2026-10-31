import React from 'react';
import { t } from '../i18n';
import { ErrorScreen } from './ErrorScreen';

interface State {
  error: Error | null;
}

/**
 * Last line of defence for a rendering error anywhere below: an explanation and "Try again" (which
 * renders the tree afresh) instead of a blank or crashed app. Data is untouched by render errors.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorScreen
          title={t('errorBoundary.title')}
          message={t('errorBoundary.message')}
          detail={this.state.error.message}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
