"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type ComponentErrorBoundaryProps = {
  children: ReactNode;
  title: string;
  description: string;
  retryLabel: string;
};

type ComponentErrorBoundaryState = {
  hasError: boolean;
};

export class ComponentErrorBoundary extends Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  state: ComponentErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ComponentErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("A contained page component failed to render.", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="component-error-fallback" role="alert">
          <p className="map-inline-error">{this.props.title}</p>
          <p className="map-inline-error">{this.props.description}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
          >
            {this.props.retryLabel}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
