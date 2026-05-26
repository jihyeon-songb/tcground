import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';

import { Button, Dialog, DropdownMenu, Tabs, Toggle } from '../index';
import '../theme.css';

const meta = {
  title: 'Headless UI/Pokemon Components',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ButtonVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Button>Primary</Button>
      <Button variant='secondary'>Secondary</Button>
      <Button variant='ghost'>Ghost</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};

export const DialogExample: Story = {
  render: () => (
    <Dialog.Root>
      <Dialog.Trigger className='pui-button' data-variant='primary' data-size='md'>
        Open dialog
      </Dialog.Trigger>
      <Dialog.Overlay />
      <Dialog.Content>
        <Dialog.Title>Choose a Pokemon card</Dialog.Title>
        <Dialog.Description>
          Focus moves into the dialog, Tab stays inside, and Escape closes it.
        </Dialog.Description>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button>Confirm</Button>
          <Dialog.Close className='pui-button' data-variant='ghost' data-size='md'>
            Close
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  ),
};

export const NavigationPrimitives: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 20 }}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className='pui-button' data-variant='secondary' data-size='md'>
          Menu
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item>View detail</DropdownMenu.Item>
          <DropdownMenu.Item>Add to deck</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <Tabs.Root defaultValue='usage'>
        <Tabs.List aria-label='Example tabs'>
          <Tabs.Trigger value='usage'>Usage</Tabs.Trigger>
          <Tabs.Trigger value='a11y'>Accessibility</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Panel value='usage'>Composable primitives with minimal styling.</Tabs.Panel>
        <Tabs.Panel value='a11y'>Keyboard and ARIA behavior are part of the contract.</Tabs.Panel>
      </Tabs.Root>

      <Toggle>Pressed state</Toggle>
    </div>
  ),
};

export const CustomThemeTokens: Story = {
  render: () => (
    <div
      style={
        {
          '--pokemon-primary': '#2f6fff',
          '--pokemon-secondary': '#ffd84d',
          '--pokemon-focus-ring': '#ff7a1a',
          display: 'flex',
          gap: 8,
        } as React.CSSProperties
      }
    >
      <Button>Water primary</Button>
      <Button variant='secondary'>Electric secondary</Button>
    </div>
  ),
};
