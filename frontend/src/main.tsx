import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import PhotoViewerProvider from './components/PhotoViewer';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, staleTime: 5000 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Any profile picture on any page can be opened full size from here. */}
        <PhotoViewerProvider>
          <App />
        </PhotoViewerProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
