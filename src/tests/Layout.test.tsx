import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';
import { describe, it, expect } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';

describe('Layout Navigation', () => {
  it('renders navigation items', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Layout />
        </AuthProvider>
      </BrowserRouter>
    );

    // Get all navigation links
    // Since we now have duplicated links for Desktop (Sidebar) and Mobile (BottomNav),
    // we should see 10 links in total (5 * 2) if both are rendered in the DOM (just hidden by CSS)
    const links = await screen.findAllByRole('link');

    expect(links.length).toBeGreaterThanOrEqual(5);

    // We can verify that at least one set of links has the correct paths
    // Filter for unique hrefs to ensure all 5 paths are present
    const hrefs = links.map(link => link.getAttribute('href'));
    const uniqueHrefs = [...new Set(hrefs)];

    expect(uniqueHrefs).toContain('/');
    expect(uniqueHrefs).toContain('/search');
    expect(uniqueHrefs).toContain('/create');
    expect(uniqueHrefs).toContain('/discovery');
    expect(uniqueHrefs).toContain('/profile');
  });
});
