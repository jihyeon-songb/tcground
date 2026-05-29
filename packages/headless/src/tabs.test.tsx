import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

describe('Tabs', () => {
  afterEach(() => {
    cleanup();
  });

  it('connects tabs and panels with ARIA attributes', () => {
    render(
      <Tabs defaultValue='summary'>
        <TabsList aria-label='카드 섹션'>
          <TabsTrigger value='summary'>요약</TabsTrigger>
          <TabsTrigger value='price'>가격</TabsTrigger>
        </TabsList>
        <TabsContent value='summary'>요약 패널</TabsContent>
        <TabsContent value='price'>가격 패널</TabsContent>
      </Tabs>,
    );

    const summaryTab = screen.getByRole('tab', { name: '요약' });
    const summaryPanel = screen.getByRole('tabpanel', { name: '요약' });
    const pricePanel = screen.getByText('가격 패널');

    expect(screen.getByRole('tablist', { name: '카드 섹션' })).toBeTruthy();
    expect(summaryTab.getAttribute('aria-selected')).toBe('true');
    expect(summaryTab.getAttribute('aria-controls')).toBe(summaryPanel.id);
    expect(summaryPanel.getAttribute('aria-labelledby')).toBe(summaryTab.id);
    expect(pricePanel.hasAttribute('hidden')).toBe(true);
  });

  it('moves focus and activates the next tab with arrow keys', () => {
    const onValueChange = vi.fn();

    render(
      <Tabs defaultValue='summary' onValueChange={onValueChange}>
        <TabsList aria-label='카드 섹션'>
          <TabsTrigger value='summary'>요약</TabsTrigger>
          <TabsTrigger value='price'>가격</TabsTrigger>
          <TabsTrigger value='history'>이력</TabsTrigger>
        </TabsList>
        <TabsContent value='summary'>요약 패널</TabsContent>
        <TabsContent value='price'>가격 패널</TabsContent>
        <TabsContent value='history'>이력 패널</TabsContent>
      </Tabs>,
    );

    const summaryTab = screen.getByRole('tab', { name: '요약' });
    const priceTab = screen.getByRole('tab', { name: '가격' });

    summaryTab.focus();
    fireEvent.keyDown(summaryTab, { key: 'ArrowRight' });

    expect(document.activeElement).toBe(priceTab);
    expect(priceTab.getAttribute('aria-selected')).toBe('true');
    expect(onValueChange).toHaveBeenCalledWith('price');
  });

  it('activates only on Enter/Space in manual mode', () => {
    const onValueChange = vi.fn();

    render(
      <Tabs defaultValue='summary' activationMode='manual' onValueChange={onValueChange}>
        <TabsList aria-label='카드 섹션'>
          <TabsTrigger value='summary'>요약</TabsTrigger>
          <TabsTrigger value='price'>가격</TabsTrigger>
        </TabsList>
        <TabsContent value='summary'>요약 패널</TabsContent>
        <TabsContent value='price'>가격 패널</TabsContent>
      </Tabs>,
    );

    const summaryTab = screen.getByRole('tab', { name: '요약' });
    const priceTab = screen.getByRole('tab', { name: '가격' });

    summaryTab.focus();
    fireEvent.keyDown(summaryTab, { key: 'ArrowRight' });

    expect(document.activeElement).toBe(priceTab);
    expect(onValueChange).not.toHaveBeenCalled();

    fireEvent.keyDown(priceTab, { key: 'Enter' });
    expect(onValueChange).toHaveBeenCalledWith('price');
  });
});
