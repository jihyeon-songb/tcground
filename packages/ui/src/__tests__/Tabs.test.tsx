import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Tabs } from '../components/Tabs';

describe('Tabs', () => {
  afterEach(() => {
    cleanup();
  });

  it('switches the selected tab with click and keyboard navigation', () => {
    render(
      <Tabs.Root defaultValue='usage'>
        <Tabs.List aria-label='Documentation sections'>
          <Tabs.Trigger value='usage'>Usage</Tabs.Trigger>
          <Tabs.Trigger value='a11y'>Accessibility</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Panel value='usage'>Usage content</Tabs.Panel>
        <Tabs.Panel value='a11y'>Accessibility content</Tabs.Panel>
      </Tabs.Root>,
    );

    expect(screen.getByRole('tab', { name: 'Usage' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Usage content')).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });

    expect(screen.getByRole('tab', { name: 'Accessibility' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByText('Accessibility content')).toBeTruthy();
  });
});
